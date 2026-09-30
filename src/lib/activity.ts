import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

/** Mencatat aktivitas proyek. Gagal mencatat tidak boleh menggagalkan aksi utama. */
export async function logActivity(
  db: SupabaseClient<Database>,
  entry: {
    projectId: string;
    action: string;
    actorId?: string | null;
    actorName?: string | null;
    meta?: Json;
  },
) {
  const { error } = await db.from("activity_log").insert({
    project_id: entry.projectId,
    action: entry.action,
    actor_id: entry.actorId ?? null,
    actor_name: entry.actorName ?? null,
    meta: entry.meta ?? {},
  });
  if (error) console.error("[activity] gagal mencatat:", error.message);
}
