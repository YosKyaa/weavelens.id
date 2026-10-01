"use server";

import { requireStaff } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

/** Tandai semua notifikasi sudah dibaca (saat lonceng dibuka). */
export async function markNotificationsSeen(): Promise<{ ok: boolean }> {
  const { supabase, user } = await requireStaff();
  // Profil tim tidak boleh mengubah kolom lain lewat RLS; cukup service role untuk satu kolom ini.
  const db = createServiceClient() ?? supabase;
  const { error } = await db
    .from("profiles")
    .update({ notifications_seen_at: new Date().toISOString() })
    .eq("id", user.id);
  return { ok: !error };
}
