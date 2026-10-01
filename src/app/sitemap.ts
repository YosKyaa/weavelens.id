import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { getCms } from "@/lib/cms/data";

export const revalidate = 3600;

/** "/portfolio/a.webp" atau URL Supabase Storage → URL absolut. */
function absolute(src: string): string {
  return src.startsWith("http") ? src : `${site.url}${src.startsWith("/") ? "" : "/"}${src}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { portfolioImages } = await getCms();

  return [
    {
      url: `${site.url}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
      // Foto portofolio ikut didaftarkan agar muncul di pencarian gambar.
      images: portfolioImages.flatMap((image) => (image.src ? [absolute(image.src)] : [])),
    },
    {
      url: `${site.url}/bio`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
