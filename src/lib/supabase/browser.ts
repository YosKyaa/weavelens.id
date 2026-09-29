import { createBrowserClient } from "@supabase/ssr";

/** Klien di browser admin, hanya untuk unggah foto ke Storage. */
export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase belum dikonfigurasi.");
  return createBrowserClient(url, key);
}
