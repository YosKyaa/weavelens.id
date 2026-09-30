import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

export const DESIGN_BUCKET = "designs";

/** Satu file dalam versi desain (carousel = beberapa file berurutan). */
export type DesignFile = {
  path: string;
  kind: "image" | "video" | "pdf";
  name: string;
  width?: number;
  height?: number;
};

export type SignedDesignFile = DesignFile & { url: string };

export function parseFiles(value: Json): DesignFile[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, Json | undefined>;
    if (typeof record.path !== "string") return [];
    const kind = record.kind === "video" || record.kind === "pdf" ? record.kind : "image";
    return [
      {
        path: record.path,
        kind,
        name: typeof record.name === "string" ? record.name : (record.path.split("/").pop() ?? ""),
        width: typeof record.width === "number" ? record.width : undefined,
        height: typeof record.height === "number" ? record.height : undefined,
      },
    ];
  });
}

/** URL bertanda tangan 1 jam (bucket designs privat). Dipanggil di server. */
export async function signFiles(
  db: SupabaseClient<Database>,
  files: DesignFile[],
): Promise<SignedDesignFile[]> {
  if (files.length === 0) return [];
  const { data } = await db.storage.from(DESIGN_BUCKET).createSignedUrls(
    files.map((file) => file.path),
    60 * 60,
  );
  const byPath = new Map((data ?? []).map((item) => [item.path, item.signedUrl]));
  return files.flatMap((file) => {
    const url = byPath.get(file.path);
    return url ? [{ ...file, url }] : [];
  });
}

/** Link Google Drive → URL pratinjau yang bisa disematkan (iframe). */
export function drivePreviewUrl(url: string): string | null {
  const match = url.match(/\/d\/([A-Za-z0-9_-]{10,})/) ?? url.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null;
}
