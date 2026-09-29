/** Kunci publik Supabase. `null` = CMS belum dikonfigurasi, situs memakai konten statis. */
export function supabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

/** Bucket Storage untuk foto yang diunggah dari admin. */
export const MEDIA_BUCKET = "media";
