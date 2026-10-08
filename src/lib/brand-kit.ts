import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type BrandFile = {
  id: string;
  name: string;
  size: number | null;
  contentType: string | null;
  createdAt: string;
  /** Link unduh bertanda tangan (1 jam); null bila gagal dibuat. */
  url: string | null;
};

export type BrandKit = {
  id: string;
  name: string;
  color: string;
  instagram: string | null;
  guideline: string | null;
  voice: string | null;
  palette: string[];
  fonts: string | null;
  assetUrl: string | null;
  files: BrandFile[];
};

export const hasKit = (kit: BrandKit) =>
  Boolean(
    kit.guideline ||
    kit.voice ||
    kit.fonts ||
    kit.assetUrl ||
    kit.palette.length ||
    kit.files.length,
  );

/** Brand kit beberapa brand sekaligus, lengkap dengan link unduh file aset. */
export async function loadBrandKits(
  supabase: SupabaseClient<Database>,
  brandIds: string[],
): Promise<BrandKit[]> {
  if (brandIds.length === 0) return [];
  const [{ data: brands }, { data: files }] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, color, instagram, guideline, voice, palette, fonts, asset_url, sort")
      .in("id", brandIds)
      .order("sort"),
    supabase
      .from("brand_files")
      .select("id, brand_id, path, name, size, content_type, created_at")
      .in("brand_id", brandIds)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  const paths = (files ?? []).map((file) => file.path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("brand-assets").createSignedUrls(paths, 3600, { download: true })
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));

  return (brands ?? []).map((brand) => ({
    id: brand.id,
    name: brand.name,
    color: brand.color,
    instagram: brand.instagram,
    guideline: brand.guideline,
    voice: brand.voice,
    palette: brand.palette ?? [],
    fonts: brand.fonts,
    assetUrl: brand.asset_url,
    files: (files ?? [])
      .filter((file) => file.brand_id === brand.id)
      .map((file) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        contentType: file.content_type,
        createdAt: file.created_at,
        url: urlByPath.get(file.path) ?? null,
      })),
  }));
}
