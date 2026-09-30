import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { driveConfigured, fetchThumbnail } from "@/lib/drive";
import { resolveShare } from "@/lib/share";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Thumbnail foto/video dari Google Drive, lewat server (browser tidak pernah menyentuh Drive).
 * Akses: admin yang login, atau pemegang link klien untuk proyek pemilik foto.
 * Hasil di-cache CDN supaya galeri ratusan foto tetap cepat & hemat kuota Drive.
 */
const SIZES = [400, 1600] as const;

export async function GET(request: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(photoId) || !driveConfigured()) {
    return new NextResponse(null, { status: 404 });
  }
  const token = request.nextUrl.searchParams.get("t");
  const requested = Number(request.nextUrl.searchParams.get("s"));
  const size = SIZES.find((value) => value >= requested) ?? SIZES[0];

  const db = createServiceClient();
  if (!db) return new NextResponse(null, { status: 404 });
  const { data: photo } = await db
    .from("photos")
    .select("drive_file_id, photo_sets!inner(project_id)")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) return new NextResponse(null, { status: 404 });

  let publicCache = false;
  if (token) {
    const share = await resolveShare(token);
    if (!share || share.project.id !== photo.photo_sets.project_id) {
      return new NextResponse(null, { status: 403 });
    }
    publicCache = true;
  } else {
    const session = await getSession();
    if (session?.profile.role !== "admin") return new NextResponse(null, { status: 403 });
  }

  const thumbnail = await fetchThumbnail(photo.drive_file_id, size);
  if (!thumbnail) return new NextResponse(null, { status: 404 });

  return new NextResponse(thumbnail.body, {
    headers: {
      "Content-Type": thumbnail.type,
      // URL berisi token rahasia; cache CDN aman selama link belum dicabut (maks. 1 hari).
      "Cache-Control": publicCache
        ? "public, max-age=3600, s-maxage=86400"
        : "private, max-age=3600",
    },
  });
}
