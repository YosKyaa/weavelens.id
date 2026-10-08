import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/** Catat error ke tabel `error_events` (dibaca admin di Pengaturan → Sistem). Tidak pernah melempar. */
export async function logError(entry: {
  source: "client" | "server";
  message: string;
  digest?: string | null;
  path?: string | null;
  userId?: string | null;
  userAgent?: string | null;
}) {
  try {
    const db = createServiceClient();
    if (!db) return;
    await db.from("error_events").insert({
      source: entry.source,
      message: entry.message.slice(0, 1000) || "(tanpa pesan)",
      digest: entry.digest?.slice(0, 100) ?? null,
      path: entry.path?.slice(0, 300) ?? null,
      user_id: entry.userId ?? null,
      user_agent: entry.userAgent?.slice(0, 300) ?? null,
    });
  } catch {
    // Pencatat error tidak boleh menimbulkan error baru.
  }
}
