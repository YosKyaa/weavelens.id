import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STAGES, FORMATS, type ContentFormat, type Stage } from "@/content/workspace";
import { parseFiles, signFiles } from "@/lib/design-files";
import type { Database } from "@/types/database";

export type BoardRow = {
  id: string;
  title: string;
  stage: Stage;
  format: ContentFormat;
  sort: number;
  brandId: string | null;
  dueDate: string | null;
  publishDate: string | null;
  caption: string | null;
  versions: number;
  latestVersionId: string | null;
  latestStatus: string | null;
  openComments: number;
  thumbnail: string | null;
};

const asStage = (value: string): Stage =>
  (STAGES as readonly string[]).includes(value) ? (value as Stage) : "brief";
const asFormat = (value: string): ContentFormat =>
  (FORMATS as readonly string[]).includes(value) ? (value as ContentFormat) : "other";

/**
 * Semua kartu konten proyek + ringkasan versi terbaru & thumbnail bertanda tangan.
 * Dipakai papan admin dan halaman klien (dengan filter brand dari link).
 */
export async function loadBoard(
  db: SupabaseClient<Database>,
  projectId: string,
  brandId: string | null = null,
): Promise<BoardRow[]> {
  let query = db
    .from("design_assets")
    .select(
      "id, title, stage, format, sort, brand_id, due_date, publish_date, caption, design_versions(id, version_no, files, status, design_comments(resolved))",
    )
    .eq("project_id", projectId);
  if (brandId) query = query.eq("brand_id", brandId);
  const { data } = await query;

  const rows = (data ?? []).map((item) => {
    const latest = [...item.design_versions].sort((a, b) => b.version_no - a.version_no)[0];
    const firstImage = latest
      ? parseFiles(latest.files).find((file) => file.kind === "image")
      : undefined;
    return {
      item,
      latest,
      firstImage,
    };
  });

  const signed = await signFiles(
    db,
    rows.flatMap((row) => (row.firstImage ? [row.firstImage] : [])),
  );
  const urlByPath = new Map(signed.map((file) => [file.path, file.url]));

  return rows.map(({ item, latest, firstImage }) => ({
    id: item.id,
    title: item.title,
    stage: asStage(item.stage),
    format: asFormat(item.format),
    sort: item.sort,
    brandId: item.brand_id,
    dueDate: item.due_date,
    publishDate: item.publish_date,
    caption: item.caption,
    versions: item.design_versions.length,
    latestVersionId: latest?.id ?? null,
    latestStatus: latest?.status ?? null,
    openComments: latest ? latest.design_comments.filter((comment) => !comment.resolved).length : 0,
    thumbnail: firstImage ? (urlByPath.get(firstImage.path) ?? null) : null,
  }));
}
