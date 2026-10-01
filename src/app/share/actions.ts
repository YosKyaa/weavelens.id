"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isId } from "@/lib/ids";
import { shareText } from "@/content/workspace";
import { logActivity } from "@/lib/activity";
import { GUEST_COOKIE, getGuestName } from "@/lib/guest";
import { emailTeamDecision } from "@/lib/notify";
import type { CommentPoint, CommentTarget } from "@/lib/review";
import {
  ALREADY_DECIDED,
  decideVersion,
  latestVersionInScope,
  parseComment,
} from "@/lib/review-decision";
import { resolveShare, type ShareContext } from "@/lib/share";

/**
 * Aksi pemegang link klien. Tidak ada sesi login: SETIAP aksi memvalidasi ulang token,
 * izin review, dan bahwa data yang disentuh memang milik proyek/brand dari link tersebut.
 */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const INVALID = shareText.invalid.body;
const FAILED = "Gagal mengirim. Periksa koneksi lalu coba lagi.";
const NEED_NAME =
  "Isi nama kamu dulu (di bagian atas halaman) supaya tim tahu siapa yang memberi masukan.";

function refresh(token: string, projectId: string) {
  revalidatePath(`/share/${token}`, "layout");
  revalidatePath(`/admin/projects/${projectId}`, "layout");
  revalidatePath("/admin");
}

export async function setGuestName(name: string): Promise<Result> {
  const value = z.string().trim().min(1, "Isi nama kamu.").max(60).safeParse(name);
  if (!value.success) return { ok: false, error: value.error.issues[0]?.message ?? FAILED };
  (await cookies()).set(GUEST_COOKIE, encodeURIComponent(value.data), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return { ok: true };
}

type Actor = { context: ShareContext; name: string };

async function actor(token: string, needsReview: boolean): Promise<Actor | { error: string }> {
  const context = await resolveShare(token);
  if (!context) return { error: INVALID };
  if (needsReview && !context.canReview) return { error: shareText.content.readOnly };
  const name = await getGuestName();
  if (!name) return { error: NEED_NAME };
  return { context, name };
}

/** Versi harus milik proyek (dan brand, jika link dibatasi) dari link, dan merupakan versi terbaru. */
function versionInScope(context: ShareContext, versionId: string) {
  return latestVersionInScope(context.db, versionId, {
    projectId: context.project.id,
    brandId: context.brandId,
  });
}

// ─── Review desain ─────────────────────────────────────────────────────────

export async function guestComment(
  token: string,
  versionId: string,
  body: string,
  point: CommentPoint | null,
  target?: CommentTarget,
): Promise<Result> {
  if (!isId(versionId)) return { ok: false, error: INVALID };
  const who = await actor(token, true);
  if ("error" in who) return { ok: false, error: who.error };
  const comment = parseComment(body, point, target);
  if (!comment.ok) return comment;

  const version = await versionInScope(who.context, versionId);
  if (!version) return { ok: false, error: INVALID };

  const { error } = await who.context.db.from("design_comments").insert({
    version_id: versionId,
    guest_name: who.name,
    share_link_id: who.context.linkId,
    body: comment.body,
    x: comment.x,
    y: comment.y,
    slide: comment.slide,
    target: comment.target,
  });
  if (error) return { ok: false, error: FAILED };

  await logActivity(who.context.db, {
    projectId: who.context.project.id,
    action: "comment.added",
    actorName: who.name,
    meta: { title: version.design_assets.title, contentId: version.asset_id, by: "client" },
  });
  refresh(token, who.context.project.id);
  return { ok: true };
}

async function decide(
  token: string,
  versionId: string,
  decision: "approved" | "changes_requested",
): Promise<Result> {
  if (!isId(versionId)) return { ok: false, error: INVALID };
  const who = await actor(token, true);
  if ("error" in who) return { ok: false, error: who.error };
  const version = await versionInScope(who.context, versionId);
  if (!version) return { ok: false, error: ALREADY_DECIDED };

  const result = await decideVersion(who.context.db, version, decision, { name: who.name });
  if (result.ok) {
    refresh(token, who.context.project.id);
    after(() =>
      emailTeamDecision(who.context.db, {
        projectId: who.context.project.id,
        contentId: version.asset_id,
        title: version.design_assets.title,
        decision,
        actorName: who.name,
      }),
    );
  }
  return result;
}

export async function guestApprove(token: string, versionId: string): Promise<Result> {
  return decide(token, versionId, "approved");
}

export async function guestRequestRevision(token: string, versionId: string): Promise<Result> {
  return decide(token, versionId, "changes_requested");
}

// ─── Seleksi foto/video ────────────────────────────────────────────────────

async function photoInScope(context: ShareContext, photoId: string) {
  const { data } = await context.db
    .from("photos")
    .select("id, set_id, photo_sets!inner(id, project_id, status, deadline, max_selection)")
    .eq("id", photoId)
    .maybeSingle();
  if (!data || data.photo_sets.project_id !== context.project.id) return null;
  return data;
}

function selectionOpen(set: { status: string; deadline: string | null }): boolean {
  return set.status === "selecting" && (!set.deadline || new Date(set.deadline) > new Date());
}

export async function guestToggleSelection(
  token: string,
  photoId: string,
  selected: boolean,
): Promise<Result<{ count: number }>> {
  if (!isId(photoId)) return { ok: false, error: INVALID };
  const who = await actor(token, false);
  if ("error" in who) return { ok: false, error: who.error };
  const photo = await photoInScope(who.context, photoId);
  if (!photo) return { ok: false, error: INVALID };
  if (!selectionOpen(photo.photo_sets)) return { ok: false, error: shareText.gallery.closed };

  const db = who.context.db;
  const countSelected = async () => {
    const { count } = await db
      .from("photo_selections")
      .select("id", { count: "exact", head: true })
      .eq("set_id", photo.set_id);
    return count ?? 0;
  };

  if (selected) {
    const max = photo.photo_sets.max_selection;
    if (max && (await countSelected()) >= max) {
      return { ok: false, error: shareText.gallery.limitReached(max) };
    }
    const { error } = await db
      .from("photo_selections")
      .upsert(
        { set_id: photo.set_id, photo_id: photoId, guest_name: who.name },
        { onConflict: "photo_id,set_id", ignoreDuplicates: true },
      );
    if (error) return { ok: false, error: FAILED };
  } else {
    const { error } = await db
      .from("photo_selections")
      .delete()
      .eq("photo_id", photoId)
      .eq("set_id", photo.set_id);
    if (error) return { ok: false, error: FAILED };
  }

  revalidatePath(`/admin/galleries/${photo.set_id}`);
  return { ok: true, count: await countSelected() };
}

export async function guestSaveNote(token: string, photoId: string, note: string): Promise<Result> {
  if (!isId(photoId)) return { ok: false, error: INVALID };
  const who = await actor(token, false);
  if ("error" in who) return { ok: false, error: who.error };
  const value = z.string().trim().max(500).safeParse(note);
  if (!value.success) return { ok: false, error: "Catatan maksimal 500 karakter." };
  const photo = await photoInScope(who.context, photoId);
  if (!photo) return { ok: false, error: INVALID };
  if (!selectionOpen(photo.photo_sets)) return { ok: false, error: shareText.gallery.closed };

  const { data, error } = await who.context.db
    .from("photo_selections")
    .update({ note: value.data || null })
    .eq("photo_id", photoId)
    .eq("set_id", photo.set_id)
    .select("id");
  if (error || !data?.length)
    return { ok: false, error: "Pilih foto ini dulu sebelum memberi catatan." };
  revalidatePath(`/admin/galleries/${photo.set_id}`);
  return { ok: true };
}

export async function guestSubmitSelection(token: string, galleryId: string): Promise<Result> {
  if (!isId(galleryId)) return { ok: false, error: INVALID };
  const who = await actor(token, false);
  if ("error" in who) return { ok: false, error: who.error };

  const { data, error } = await who.context.db
    .from("photo_sets")
    .update({
      status: "selection_closed",
      submitted_at: new Date().toISOString(),
      submitted_by: who.name,
    })
    .eq("id", galleryId)
    .eq("project_id", who.context.project.id)
    .eq("status", "selecting")
    .select("title")
    .maybeSingle();
  if (error || !data) return { ok: false, error: shareText.gallery.closed };

  const { count } = await who.context.db
    .from("photo_selections")
    .select("id", { count: "exact", head: true })
    .eq("set_id", galleryId);
  await logActivity(who.context.db, {
    projectId: who.context.project.id,
    action: "selection.submitted",
    actorName: who.name,
    meta: { gallery: data.title, count: count ?? 0 },
  });
  refresh(token, who.context.project.id);
  revalidatePath(`/admin/galleries/${galleryId}`);
  return { ok: true };
}
