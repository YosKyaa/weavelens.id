import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { driveConfigured, driveIdFromUrl, fetchThumbnail } from "@/lib/drive";
import { resolveShare } from "@/lib/share";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Thumbnail kecil untuk versi desain yang berupa link Google Drive (mis. Reels > 50 MB),
 * dipakai kartu kanban dan daftar konten klien.
 * Akses: tim yang boleh mengerjakan proyek, klien pemilik proyek, atau pemegang link klien.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const { versionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(versionId) || !driveConfigured()) {
    return new NextResponse(null, { status: 404 });
  }

  const db = createServiceClient();
  if (!db) return new NextResponse(null, { status: 404 });
  const { data: version } = await db
    .from("design_versions")
    .select("external_url, design_assets!inner(project_id, brand_id)")
    .eq("id", versionId)
    .maybeSingle();
  const fileId = version?.external_url ? driveIdFromUrl(version.external_url) : null;
  if (!version || !fileId) return new NextResponse(null, { status: 404 });
  const projectId = version.design_assets.project_id;

  const token = request.nextUrl.searchParams.get("t");
  let publicCache = false;
  if (token) {
    const share = await resolveShare(token);
    const inScope =
      share &&
      share.project.id === projectId &&
      (!share.brandId || share.brandId === version.design_assets.brand_id);
    if (!inScope) return new NextResponse(null, { status: 403 });
    publicCache = true;
  } else {
    const session = await getSession();
    if (!session) return new NextResponse(null, { status: 403 });
    const rpc = session.profile.role === "client" ? "can_view_project" : "can_work_on_project";
    const { data: allowed } = await session.supabase.rpc(rpc, { pid: projectId });
    if (allowed !== true) return new NextResponse(null, { status: 403 });
  }

  const thumbnail = await fetchThumbnail(fileId, 400);
  if (!thumbnail) return new NextResponse(null, { status: 404 });

  return new NextResponse(thumbnail.body, {
    headers: {
      "Content-Type": thumbnail.type,
      "Cache-Control": publicCache
        ? "public, max-age=3600, s-maxage=86400"
        : "private, max-age=3600",
    },
  });
}
