import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STAGES, FORMATS, type ContentFormat, type Stage } from "@/content/workspace";
import { parseFiles, signFiles } from "@/lib/design-files";
import type { DesignPreview } from "@/lib/design-preview";
import { driveConfigured } from "@/lib/drive";
import type { Database } from "@/types/database";

export type BoardRow = {
  id: string;
  title: string;
  stage: Stage;
  format: ContentFormat;
  sort: number;
  brandId: string | null;
  assigneeId: string | null;
  publishedUrl: string | null;
  dueDate: string | null;
  publishDate: string | null;
  caption: string | null;
  versions: number;
  latestVersionId: string | null;
  latestStatus: string | null;
  openComments: number;
  preview: DesignPreview;
  /** Jumlah file versi terbaru (carousel > 1). */
  slides: number;
};

const asStage = (value: string): Stage =>
  (STAGES as readonly string[]).includes(value) ? (value as Stage) : "brief";
const asFormat = (value: string): ContentFormat =>
  (FORMATS as readonly string[]).includes(value) ? (value as ContentFormat) : "other";

/**
 * Semua kartu konten proyek + ringkasan versi terbaru & pratinjau desain (URL bertanda tangan).
 * Dipakai papan admin dan halaman klien (dengan filter brand dari link).
 */
export async function loadBoard(
  db: SupabaseClient<Database>,
  projectId: string,
  brandId: string | null = null,
  options: { shareToken?: string } = {},
): Promise<BoardRow[]> {
  let query = db
    .from("design_assets")
    .select(
      "id, title, stage, format, sort, brand_id, assignee_id, published_url, due_date, publish_date, caption, design_versions(id, version_no, files, external_url, status, design_comments(resolved))",
    )
    .eq("project_id", projectId);
  if (brandId) query = query.eq("brand_id", brandId);
  const { data } = await query;

  const rows = (data ?? []).map((item) => {
    const latest = [...item.design_versions].sort((a, b) => b.version_no - a.version_no)[0];
    const files = latest ? parseFiles(latest.files) : [];
    // Gambar diutamakan sebagai sampul; tanpa gambar, pakai file pertama (video/PDF).
    const cover = files.find((file) => file.kind === "image") ?? files[0];
    return { item, latest, files, cover };
  });

  const signed = await signFiles(
    db,
    rows.flatMap((row) => (row.cover && row.cover.kind !== "pdf" ? [row.cover] : [])),
  );
  const urlByPath = new Map(signed.map((file) => [file.path, file.url]));
  const drive = driveConfigured();

  function preview(row: (typeof rows)[number]): DesignPreview {
    const { latest, cover } = row;
    if (!latest) return { kind: "none" };
    if (cover) {
      if (cover.kind === "pdf") return { kind: "pdf" };
      const url = urlByPath.get(cover.path);
      if (!url) return { kind: cover.kind === "video" ? "video" : "image", url: "" };
      return { kind: cover.kind === "video" ? "video" : "image", url };
    }
    if (latest.external_url) {
      const token = options.shareToken ? `?t=${encodeURIComponent(options.shareToken)}` : "";
      return { kind: "drive", url: drive ? `/api/drive/design-thumb/${latest.id}${token}` : null };
    }
    return { kind: "none" };
  }

  return rows.map((row) => {
    const { item, latest, files } = row;
    return {
      id: item.id,
      title: item.title,
      stage: asStage(item.stage),
      format: asFormat(item.format),
      sort: item.sort,
      brandId: item.brand_id,
      assigneeId: item.assignee_id,
      publishedUrl: item.published_url,
      dueDate: item.due_date,
      publishDate: item.publish_date,
      caption: item.caption,
      versions: item.design_versions.length,
      latestVersionId: latest?.id ?? null,
      latestStatus: latest?.status ?? null,
      openComments: latest
        ? latest.design_comments.filter((comment) => !comment.resolved).length
        : 0,
      preview: preview(row),
      slides: files.length,
    };
  });
}

/** Baris papan → item kalender (warna & nama brand). */
export function toCalendarItems(
  items: BoardRow[],
  brands: { id: string; name: string; color: string }[],
) {
  const byId = new Map(brands.map((brand) => [brand.id, brand]));
  return items.map((item) => {
    const brand = item.brandId ? byId.get(item.brandId) : undefined;
    return {
      id: item.id,
      title: item.title,
      stage: item.stage,
      publishDate: item.publishDate,
      brandName: brand?.name ?? null,
      brandColor: brand?.color ?? null,
    };
  });
}
