import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Data sesi WeaveLens Booth untuk halaman galeri tamu /g/<kode>.
 * booth_sessions tidak bisa dibaca publik (RLS), jadi dibaca dengan service role di server saja.
 */

/** Kode sesi booth: 6 karakter tanpa 0 O 1 I (sama dengan SessionCodeGenerator di tablet). */
export const SESSION_CODE = /^[A-HJ-NP-Z2-9]{6}$/;

export type BoothPhoto = { index: number; drive_file_id: string | null };

export type BoothSession = {
  code: string;
  event_id: string | null;
  composition_path: string | null;
  drive_folder_id: string | null;
  drive_composition_id: string | null;
  booth_photos: BoothPhoto[];
};

/**
 * Bahan galeri yang dibuat tablet di folder sesi yang sama dengan komposisi (Drive dan bucket "booth").
 * Tidak punya kolom sendiri: dicari menurut nama berkas.
 */
export const EXTRAS = {
  gerak: { file: "gerak.gif", type: "image/gif" },
  pratinjau: { file: "pratinjau.jpg", type: "image/jpeg" },
} as const;

export type ExtraName = keyof typeof EXTRAS;

const BUCKET = "booth";

export function normalizeCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return SESSION_CODE.test(code) ? code : null;
}

export async function findBoothSession(code: string): Promise<BoothSession | null> {
  if (!SESSION_CODE.test(code)) return null;
  const db = createServiceClient();
  if (!db) return null;
  const { data, error } = await db
    .from("booth_sessions")
    .select(
      "code, event_id, composition_path, drive_folder_id, drive_composition_id, booth_photos(index, drive_file_id)",
    )
    .eq("code", code)
    .maybeSingle();
  if (error || !data) return null;
  return { ...data, booth_photos: [...(data.booth_photos ?? [])].sort((a, b) => a.index - b.index) };
}

export async function boothEventName(eventId: string | null): Promise<string | null> {
  if (!eventId) return null;
  const db = createServiceClient();
  if (!db) return null;
  const { data } = await db.from("booth_events").select("name").eq("id", eventId).maybeSingle();
  return data?.name ?? null;
}

/** Folder cadangan sesi = folder composition_path (`sessions/<event>/<kode>`). */
function backupFolder(session: BoothSession): string | null {
  const path = session.composition_path;
  return path ? path.slice(0, path.lastIndexOf("/")) : null;
}

/** Cadangan komposisi di bucket privat "booth": URL bertanda tangan, berlaku 60 detik. */
export async function backupUrl(path: string, downloadName?: string): Promise<string | null> {
  const db = createServiceClient();
  if (!db) return null;
  const options = downloadName ? { download: downloadName } : undefined;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, 60, options);
  return data?.signedUrl ?? null;
}

/** Nama berkas di folder cadangan sesi, untuk tahu apakah gerak.gif sudah ada tanpa mengunduhnya. */
export async function backupNames(session: BoothSession): Promise<Set<string>> {
  const folder = backupFolder(session);
  const db = createServiceClient();
  if (!folder || !db) return new Set();
  const { data } = await db.storage.from(BUCKET).list(folder, { limit: 20 });
  return new Set((data ?? []).map((item) => item.name));
}

/** Satu berkas dari folder cadangan sesi; `null` bila belum terunggah. */
export async function backupFile(session: BoothSession, file: string): Promise<Blob | null> {
  const folder = backupFolder(session);
  const db = createServiceClient();
  if (!folder || !db) return null;
  const { data } = await db.storage.from(BUCKET).download(`${folder}/${file}`);
  return data ?? null;
}
