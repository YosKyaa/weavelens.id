import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type QueueItem = { id: string; title: string };

/**
 * Antrean mode review klien: konten yang menunggu review, urut seperti daftar klien
 * (tanggal tayang terdekat dulu; tanpa tanggal paling depan, lalu urutan papan).
 */
export async function loadReviewQueue(
  db: SupabaseClient<Database>,
  projectId: string,
  brandId: string | null,
): Promise<QueueItem[]> {
  let query = db
    .from("design_assets")
    .select("id, title, publish_date, sort")
    .eq("project_id", projectId)
    .eq("stage", "client_review");
  if (brandId) query = query.eq("brand_id", brandId);
  const { data } = await query;
  return (data ?? [])
    .sort((a, b) => (a.publish_date ?? "").localeCompare(b.publish_date ?? "") || a.sort - b.sort)
    .map((item) => ({ id: item.id, title: item.title }));
}

/** Posisi konten saat ini dalam antrean + desain sebelum/berikutnya. */
export function queuePosition(queue: QueueItem[], currentId: string) {
  const index = queue.findIndex((item) => item.id === currentId);
  const others = queue.filter((item) => item.id !== currentId);
  const next = index >= 0 ? (queue[index + 1] ?? others[0] ?? null) : (others[0] ?? null);
  const previous = index > 0 ? queue[index - 1] : null;
  return { index, total: queue.length, remaining: others.length, next, previous };
}
