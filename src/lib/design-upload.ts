import type { SupabaseClient } from "@supabase/supabase-js";
import { DESIGN_BUCKET, type DesignFile } from "@/lib/design-files";

/** Unggah file desain dari browser langsung ke Storage (dipakai unggah versi & unggah banyak). */

export const MAX_DESIGN_BYTES = 50 * 1024 * 1024;

export const DESIGN_ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime";

export function designKind(file: File): DesignFile["kind"] | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "video/mp4" || file.type === "video/quicktime") return "video";
  return null;
}

async function imageSize(file: File): Promise<{ width?: number; height?: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return {};
  }
}

/** `null` jika gagal. Path: <projectId>/<contentId>/<uuid>.<ext> (diperiksa lagi di server). */
export async function uploadDesignFile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- klien browser Supabase apa pun
  supabase: SupabaseClient<any>,
  projectId: string,
  contentId: string,
  file: File,
): Promise<DesignFile | null> {
  const kind = designKind(file);
  if (!kind) return null;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${projectId}/${contentId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(DESIGN_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) return null;
  return {
    path,
    kind,
    name: file.name,
    ...(kind === "image" ? await imageSize(file) : {}),
  };
}

/** "feed_promo-oktober_v2.png" → "Feed promo oktober v2". */
export function titleFromFile(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Konten baru";
}
