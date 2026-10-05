import "server-only";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";

/** Token link klien: 192 bit acak (32 karakter base64url), tidak bisa ditebak. */
export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;

export type ShareContext = NonNullable<Awaited<ReturnType<typeof resolveShare>>>;

/**
 * Memvalidasi token link klien dan mengembalikan cakupan aksesnya.
 * Semua halaman & aksi /share memakai ini sebelum menyentuh data apa pun.
 */
export const resolveShare = cache(async (token: string) => {
  if (!TOKEN_PATTERN.test(token)) return null;
  const db = createServiceClient();
  if (!db) return null;

  const { data: link } = await db
    .from("share_links")
    .select(
      "id, label, can_review, expires_at, revoked_at, brand_id, project_id, projects!inner(id, title, type, status, event_date, description, client_id, brand_id, logo_path, clients(name)), brands(id, name, color)",
    )
    .eq("token", token)
    .maybeSingle();

  if (!link || link.revoked_at) return null;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return null;

  return {
    db,
    token,
    linkId: link.id,
    label: link.label,
    canReview: link.can_review,
    brandId: link.brand_id,
    brand: link.brands,
    project: link.projects,
  };
});

/** Catat kapan link terakhir dibuka (paling sering sekali per jam agar tidak membebani DB). */
export async function touchShare(context: ShareContext) {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await context.db
    .from("share_links")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", context.linkId)
    .or(`last_opened_at.is.null,last_opened_at.lt.${hourAgo}`);
}
