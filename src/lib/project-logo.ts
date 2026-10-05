import { setProjectLogo } from "@/app/(portal)/admin/projects/actions";
import { createBrowserSupabase } from "@/lib/supabase/browser";

/** Jenis & ukuran gambar sumber yang boleh dipilih (hasil crop selalu PNG 512 px). */
export const LOGO_SOURCE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const LOGO_SOURCE_MAX_BYTES = 10 * 1024 * 1024;

/** Pesan galat untuk file sumber yang tidak valid; `null` = boleh. */
export function logoSourceError(file: File): string | null {
  if (!LOGO_SOURCE_TYPES.includes(file.type)) return "Pakai file PNG, JPG, atau WebP.";
  if (file.size > LOGO_SOURCE_MAX_BYTES) return "Ukuran gambar maksimal 10 MB.";
  return null;
}

/**
 * Unggah logo hasil crop ke bucket `logos/<projectId>/…` lalu simpan di proyek.
 * Mengembalikan path baru, atau pesan galat.
 */
export async function uploadProjectLogo(
  projectId: string,
  blob: Blob,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const path = `${projectId}/${crypto.randomUUID()}.png`;
  const { error } = await createBrowserSupabase()
    .storage.from("logos")
    .upload(path, blob, { contentType: "image/png", cacheControl: "31536000" });
  if (error) return { ok: false, error: "Logo gagal diunggah. Coba lagi." };
  const result = await setProjectLogo(projectId, path);
  return result.ok ? { ok: true, path } : result;
}
