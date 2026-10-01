"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { logActivity } from "@/lib/activity";
import { requireClient } from "@/lib/auth";
import { isId } from "@/lib/ids";
import { emailTeamDecision } from "@/lib/notify";
import type { CommentPoint, CommentTarget } from "@/lib/review";
import { decideVersion, latestVersionInScope, parseComment } from "@/lib/review-decision";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Review desain oleh klien yang login. Akses diverifikasi lewat RLS (klien hanya bisa membaca
 * versi milik proyek organisasinya); keputusan ditulis dengan service role karena klien tidak
 * punya izin UPDATE.
 */

type Result = { ok: true } | { ok: false; error: string };

const UNAVAILABLE =
  "Desain ini tidak bisa diubah lagi (sudah diputuskan atau ada versi baru). Muat ulang halaman.";
const FAILED = "Gagal mengirim. Periksa koneksi lalu coba lagi.";

async function scope(versionId: string) {
  if (!isId(versionId)) return null;
  const { supabase, user, profile } = await requireClient();
  const { data: visible } = await supabase
    .from("design_versions")
    .select("id, design_assets!inner(project_id, projects!inner(status))")
    .eq("id", versionId)
    .maybeSingle();
  if (!visible || visible.design_assets.projects.status === "draft") return null;

  const db = createServiceClient() ?? supabase;
  const version = await latestVersionInScope(db, versionId, {
    projectId: visible.design_assets.project_id,
  });
  if (!version) return null;
  return {
    supabase,
    db,
    version,
    actor: { id: user.id, name: profile.full_name || user.email || "Klien" },
  };
}

function refresh(projectId: string) {
  revalidatePath(`/client/projects/${projectId}`, "layout");
  revalidatePath("/client");
  revalidatePath(`/admin/projects/${projectId}`, "layout");
  revalidatePath("/admin");
}

export async function clientComment(
  versionId: string,
  body: string,
  point: CommentPoint | null,
  target?: CommentTarget,
): Promise<Result> {
  const comment = parseComment(body, point, target);
  if (!comment.ok) return comment;
  const context = await scope(versionId);
  if (!context) return { ok: false, error: UNAVAILABLE };

  // Lewat sesi klien: policy "client insert" memastikan author_id = dirinya sendiri.
  const { error } = await context.supabase.from("design_comments").insert({
    version_id: versionId,
    author_id: context.actor.id,
    body: comment.body,
    x: comment.x,
    y: comment.y,
    slide: comment.slide,
    target: comment.target,
  });
  if (error) return { ok: false, error: FAILED };

  const projectId = context.version.design_assets.project_id;
  await logActivity(context.db, {
    projectId,
    action: "comment.added",
    actorId: context.actor.id,
    actorName: context.actor.name,
    meta: {
      title: context.version.design_assets.title,
      contentId: context.version.asset_id,
      by: "client",
    },
  });
  refresh(projectId);
  return { ok: true };
}

async function decide(versionId: string, decision: "approved" | "changes_requested") {
  const context = await scope(versionId);
  if (!context) return { ok: false as const, error: UNAVAILABLE };
  const result = await decideVersion(context.db, context.version, decision, context.actor);
  if (result.ok) {
    const { version, actor, db } = context;
    refresh(version.design_assets.project_id);
    after(() =>
      emailTeamDecision(db, {
        projectId: version.design_assets.project_id,
        contentId: version.asset_id,
        title: version.design_assets.title,
        decision,
        actorName: actor.name,
      }),
    );
  }
  return result;
}

export async function clientApprove(versionId: string): Promise<Result> {
  return decide(versionId, "approved");
}

export async function clientRequestRevision(versionId: string): Promise<Result> {
  return decide(versionId, "changes_requested");
}
