import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { shareText } from "@/content/workspace";
import { logActivity } from "@/lib/activity";
import type { CommentPoint, CommentTarget } from "@/lib/review";
import type { Database } from "@/types/database";

/**
 * Aturan review klien yang sama untuk link klien (/share) dan portal klien (/client):
 * hanya versi TERBARU yang bisa dikomentari/diputuskan, dan keputusan hanya sekali.
 */

type Db = SupabaseClient<Database>;

export type ScopedVersion = {
  id: string;
  asset_id: string;
  version_no: number;
  status: string;
  design_assets: { id: string; title: string; project_id: string; brand_id: string | null };
};

export const ALREADY_DECIDED =
  "Versi ini sudah diputuskan atau sudah ada versi yang lebih baru. Muat ulang halaman.";

/** Versi milik proyek (dan brand, jika dibatasi) dan merupakan versi terbaru; selain itu `null`. */
export async function latestVersionInScope(
  db: Db,
  versionId: string,
  scope: { projectId: string; brandId?: string | null },
): Promise<ScopedVersion | null> {
  const { data } = await db
    .from("design_versions")
    .select(
      "id, asset_id, version_no, status, design_assets!inner(id, title, project_id, brand_id)",
    )
    .eq("id", versionId)
    .maybeSingle();
  if (!data || data.design_assets.project_id !== scope.projectId) return null;
  if (scope.brandId && data.design_assets.brand_id !== scope.brandId) return null;

  const { data: newer } = await db
    .from("design_versions")
    .select("id")
    .eq("asset_id", data.asset_id)
    .gt("version_no", data.version_no)
    .limit(1);
  if (newer?.length) return null;
  return data;
}

/**
 * Setujui / minta revisi. `db` harus klien service role (klien tidak punya izin UPDATE lewat RLS);
 * pemanggil WAJIB sudah memverifikasi akses ke versi ini.
 */
export async function decideVersion(
  db: Db,
  version: ScopedVersion,
  decision: "approved" | "changes_requested",
  actor: { name: string; id?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (version.status !== "pending_review") return { ok: false, error: ALREADY_DECIDED };

  if (decision === "changes_requested") {
    const { count } = await db
      .from("design_comments")
      .select("id", { count: "exact", head: true })
      .eq("version_id", version.id)
      .eq("resolved", false);
    if (!count) return { ok: false, error: shareText.content.revisionNeedsComment };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await db
    .from("design_versions")
    .update({ status: decision, decided_by: actor.name, decided_at: now })
    .eq("id", version.id)
    .eq("status", "pending_review")
    .select("id");
  if (error) return { ok: false, error: "Gagal mengirim. Periksa koneksi lalu coba lagi." };
  // Dua orang menekan bersamaan: yang kedua tidak mengubah apa pun.
  if (!updated?.length) return { ok: false, error: ALREADY_DECIDED };

  await db
    .from("design_assets")
    .update({ stage: decision === "approved" ? "approved" : "revision", updated_at: now })
    .eq("id", version.asset_id);
  await logActivity(db, {
    projectId: version.design_assets.project_id,
    action: decision === "approved" ? "version.approved" : "version.changes_requested",
    actorId: actor.id ?? null,
    actorName: actor.name,
    meta: {
      title: version.design_assets.title,
      version: version.version_no,
      contentId: version.asset_id,
    },
  });
  return { ok: true };
}

const commentBody = z.string().trim().min(1, "Tulis komentar dulu.").max(2000);
const commentPoint = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  slide: z.number().int().min(0).max(50),
});

/** Validasi isi komentar + titik (opsional) dari form review. */
export function parseComment(
  body: string,
  point: CommentPoint | null,
  target: CommentTarget = "design",
):
  | {
      ok: true;
      body: string;
      x: number | null;
      y: number | null;
      slide: number;
      target: CommentTarget;
    }
  | { ok: false; error: string } {
  const message = commentBody.safeParse(body);
  if (!message.success) {
    return { ok: false, error: message.error.issues[0]?.message ?? "Komentar tidak valid." };
  }
  // Komentar caption tidak punya titik di gambar.
  const kind: CommentTarget = target === "caption" ? "caption" : "design";
  if (!point || kind === "caption") {
    return { ok: true, body: message.data, x: null, y: null, slide: 0, target: kind };
  }
  const coords = commentPoint.safeParse(point);
  if (!coords.success) return { ok: false, error: "Titik komentar tidak valid. Coba lagi." };
  return { ok: true, body: message.data, ...coords.data, target: kind };
}
