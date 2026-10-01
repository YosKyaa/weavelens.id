import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { drivePreviewUrl, parseFiles, signFiles } from "@/lib/design-files";
import type { ReviewVersion } from "@/lib/review";
import type { Database } from "@/types/database";

/** Semua versi satu konten (terbaru dulu) beserta file bertanda tangan & komentar. */
export async function loadReviewVersions(
  db: SupabaseClient<Database>,
  contentId: string,
): Promise<ReviewVersion[]> {
  const { data } = await db
    .from("design_versions")
    .select(
      "id, version_no, status, note, created_at, decided_by, files, external_url, design_comments(id, body, x, y, slide, target, resolved, created_at, guest_name, author_id, profiles(full_name, role))",
    )
    .eq("asset_id", contentId)
    .order("version_no", { ascending: false });

  return Promise.all(
    (data ?? []).map(async (version) => ({
      id: version.id,
      versionNo: version.version_no,
      status: version.status as ReviewVersion["status"],
      note: version.note,
      createdAt: version.created_at,
      decidedBy: version.decided_by,
      files: await signFiles(db, parseFiles(version.files)),
      externalPreview: version.external_url ? drivePreviewUrl(version.external_url) : null,
      comments: [...version.design_comments]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((comment) => ({
          id: comment.id,
          body: comment.body,
          author: comment.guest_name ?? comment.profiles?.full_name ?? "Tim WeaveLens",
          isTeam: comment.profiles?.role === "admin" || comment.profiles?.role === "team",
          x: comment.x,
          y: comment.y,
          slide: comment.slide,
          resolved: comment.resolved,
          createdAt: comment.created_at,
          target: comment.target === "caption" ? ("caption" as const) : ("design" as const),
        })),
    })),
  );
}
