import "server-only";
import { createSign } from "node:crypto";

/**
 * Google Drive lewat service account (tanpa OAuth per klien, tanpa library tambahan).
 * Env GOOGLE_SERVICE_ACCOUNT_JSON: isi file JSON key, boleh mentah atau base64.
 * Folder klien harus dibagikan ke email service account sebagai Editor.
 */

type ServiceAccount = { client_email: string; private_key: string };

let cachedToken: { value: string; expiresAt: number } | null = null;

function readServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json) as Partial<ServiceAccount>;
    return parsed.client_email && parsed.private_key
      ? { client_email: parsed.client_email, private_key: parsed.private_key }
      : null;
  } catch {
    return null;
  }
}

export function driveConfigured(): boolean {
  return readServiceAccount() !== null;
}

export function serviceAccountEmail(): string | null {
  return readServiceAccount()?.client_email ?? null;
}

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const account = readServiceAccount();
  if (!account) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON belum diisi.");

  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(account.private_key, "base64url");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Login Google gagal (${response.status}).`);
  const body = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return body.access_token;
}

async function drive(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken();
  return fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

/** Link folder/file Drive atau ID mentah → ID. */
export function driveIdFromUrl(input: string): string | null {
  const value = input.trim();
  const match =
    value.match(/\/folders\/([A-Za-z0-9_-]{10,})/) ??
    value.match(/\/d\/([A-Za-z0-9_-]{10,})/) ??
    value.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  if (match) return match[1];
  return /^[A-Za-z0-9_-]{10,}$/.test(value) ? value : null;
}

export function folderUrl(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`;
}

export type DriveMedia = {
  id: string;
  name: string;
  mimeType: string;
  kind: "image" | "video";
  size: number | null;
  width: number | null;
  height: number | null;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  hasThumbnail?: boolean;
  imageMediaMetadata?: { width?: number; height?: number };
  videoMediaMetadata?: { width?: number; height?: number };
};

/** Semua foto & video langsung di dalam folder (subfolder seperti "Edited" diabaikan). */
export async function listMedia(
  folderId: string,
): Promise<{ media: DriveMedia[]; skipped: number }> {
  const media: DriveMedia[] = [];
  let skipped = 0;
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
      fields:
        "nextPageToken, files(id, name, mimeType, size, hasThumbnail, imageMediaMetadata(width, height), videoMediaMetadata(width, height))",
      pageSize: "1000",
      orderBy: "name_natural",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await drive(`files?${params}`);
    if (!response.ok) {
      throw new Error(
        response.status === 404
          ? "Folder tidak ditemukan. Pastikan folder sudah dibagikan ke email service account."
          : `Gagal membaca folder Drive (${response.status}).`,
      );
    }
    const body = (await response.json()) as { files: DriveFile[]; nextPageToken?: string };
    for (const file of body.files) {
      const isVideo = file.mimeType.startsWith("video/");
      const isImage = file.mimeType.startsWith("image/");
      // RAW tanpa pratinjau dari Drive tidak bisa ditampilkan ke klien.
      if ((!isImage && !isVideo) || (isImage && file.hasThumbnail === false)) {
        skipped += 1;
        continue;
      }
      const meta = isVideo ? file.videoMediaMetadata : file.imageMediaMetadata;
      media.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        kind: isVideo ? "video" : "image",
        size: file.size ? Number(file.size) : null,
        width: meta?.width ?? null,
        height: meta?.height ?? null,
      });
    }
    pageToken = body.nextPageToken;
  } while (pageToken);

  return { media, skipped };
}

/** Thumbnail dari Drive dalam ukuran tertentu (sisi terpanjang, piksel). */
export async function fetchThumbnail(
  fileId: string,
  size: number,
): Promise<{ body: ArrayBuffer; type: string } | null> {
  const meta = await drive(`files/${fileId}?fields=thumbnailLink&supportsAllDrives=true`);
  if (!meta.ok) return null;
  const { thumbnailLink } = (await meta.json()) as { thumbnailLink?: string };
  if (!thumbnailLink) return null;

  const token = await accessToken();
  const url = thumbnailLink.replace(/=s\d+(-c)?$/, `=s${size}`);
  const image = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!image.ok) return null;
  return {
    body: await image.arrayBuffer(),
    type: image.headers.get("content-type") ?? "image/jpeg",
  };
}

/** Folder bisa dilihat siapa pun yang punya link (dibutuhkan agar video bisa diputar di portal). */
export async function shareFolderWithLink(folderId: string): Promise<void> {
  const response = await drive(`files/${folderId}/permissions?supportsAllDrives=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  if (!response.ok) throw new Error(`Gagal membagikan folder (${response.status}).`);
}
