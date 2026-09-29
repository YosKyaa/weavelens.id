import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Koleksi CMS dibentuk dari konfigurasi (collections.ts) dengan nama tabel dinamis,
 * jadi query-nya tidak bisa bertipe per tabel. Validasi isinya dilakukan parseForm.
 */
export function cmsFrom(client: SupabaseClient<Database>, table: string) {
  return (client as unknown as SupabaseClient).from(table);
}
