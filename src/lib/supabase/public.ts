import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/** Klien tanpa sesi untuk membaca konten publik (aman di-cache, tidak menyentuh cookie). */
export function createPublicClient() {
  const env = supabaseEnv();
  if (!env) return null;
  return createClient<Database>(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
