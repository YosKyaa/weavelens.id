import { NextResponse } from "next/server";
import { fetchOriginal, fetchThumbnail, findFileInFolder } from "@/lib/drive";
import {
  backupFile,
  backupUrl,
  EXTRAS,
  findBoothSession,
  normalizeCode,
  type BoothSession,
  type ExtraName,
} from "@/lib/booth/session";

export const runtime = "nodejs";

// Berkas sesi tidak berubah setelah diunggah, jadi CDN boleh menyimpannya lama.
const CACHE = "public, max-age=86400, s-maxage=31536000, immutable";
// Pengganti sementara (pratinjau belum terunggah): jangan disimpan lama agar pratinjau asli segera terpakai.
const FALLBACK_CACHE = "public, max-age=0, s-maxage=60";
const NO_STORE = { "cache-control": "no-store" };
const PHOTO = /^foto-(\d)$/;
const THUMB_SIZE = 2000;

type Params = { params: Promise<{ code: string; name: string }> };

function driveId(session: BoothSession, name: string): string | null {
  if (name === "komposisi") return session.drive_composition_id;
  const match = PHOTO.exec(name);
  if (!match) return null;
  const index = Number(match[1]);
  return session.booth_photos.find((photo) => photo.index === index)?.drive_file_id ?? null;
}

async function fromDrive(
  fileId: string,
  download: boolean,
): Promise<{ body: BodyInit; type: string } | null> {
  if (!download) {
    const thumb = await fetchThumbnail(fileId, THUMB_SIZE).catch(() => null);
    if (thumb) return thumb;
  }
  const original = await fetchOriginal(fileId).catch(() => null);
  if (!original?.body) return null;
  return { body: original.body, type: original.headers.get("content-type") ?? "image/jpeg" };
}

/** Komposisi atau foto satuan: Drive dulu, komposisi punya cadangan Supabase. */
async function photo(
  session: BoothSession,
  name: string,
  download: boolean,
  cache: string,
): Promise<NextResponse> {
  const fileId = driveId(session, name);
  const upstream = fileId ? await fromDrive(fileId, download) : null;
  if (upstream) {
    const headers = new Headers({ "content-type": upstream.type, "cache-control": cache });
    if (download) {
      headers.set("content-disposition", `attachment; filename="WeaveLens-${session.code}-${name}.jpg"`);
    }
    return new NextResponse(upstream.body, { headers });
  }
  // Drive belum siap atau gagal: komposisi masih punya cadangan kecil di bucket "booth".
  if (name === "komposisi" && session.composition_path) {
    const signed = await backupUrl(
      session.composition_path,
      download ? `WeaveLens-${session.code}.jpg` : undefined,
    );
    if (signed) return NextResponse.redirect(signed, { headers: NO_STORE });
  }
  return new NextResponse(null, { status: 404, headers: NO_STORE });
}

/** gerak.gif / pratinjau.jpg: cadangan Supabase dulu (tanpa pencarian), lalu folder sesi di Drive. */
async function extraBody(session: BoothSession, name: ExtraName): Promise<BodyInit | null> {
  const { file } = EXTRAS[name];
  const backup = await backupFile(session, file).catch(() => null);
  if (backup) return backup;
  if (!session.drive_folder_id) return null;
  const fileId = await findFileInFolder(session.drive_folder_id, file).catch(() => null);
  const upstream = fileId ? await fetchOriginal(fileId).catch(() => null) : null;
  return upstream?.body ?? null;
}

async function extra(session: BoothSession, name: ExtraName, download: boolean): Promise<NextResponse> {
  const body = await extraBody(session, name);
  if (body) {
    const headers = new Headers({ "content-type": EXTRAS[name].type, "cache-control": CACHE });
    if (download) {
      headers.set(
        "content-disposition",
        `attachment; filename="WeaveLens-${session.code}-${EXTRAS[name].file}"`,
      );
    }
    return new NextResponse(body, { headers });
  }
  // og:image tetap terisi sebelum pratinjau.jpg sampai: pakai komposisi, tetapi jangan disimpan CDN lama.
  if (name === "pratinjau") return photo(session, "komposisi", false, FALLBACK_CACHE);
  return new NextResponse(null, { status: 404, headers: NO_STORE });
}

/**
 * Gambar galeri booth: /g/<kode>/image/komposisi, /foto-<n>, /gerak (GIF), /pratinjau (og:image).
 * Tambahkan ?unduh untuk file asli sebagai unduhan. Foto di Drive tetap privat: server yang mengambilnya.
 */
export async function GET(request: Request, { params }: Params) {
  const { code: raw, name } = await params;
  const code = normalizeCode(raw);
  const session = code ? await findBoothSession(code) : null;
  if (!session) return new NextResponse(null, { status: 404, headers: NO_STORE });
  const download = new URL(request.url).searchParams.has("unduh");
  if (name === "gerak" || name === "pratinjau") return extra(session, name, download);
  if (name !== "komposisi" && !PHOTO.test(name)) {
    return new NextResponse(null, { status: 404, headers: NO_STORE });
  }
  return photo(session, name, download, CACHE);
}
