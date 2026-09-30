"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { idSchema, isId } from "@/lib/ids";
import { logActivity } from "@/lib/activity";
import { requireAdmin } from "@/lib/auth";
import {
  driveConfigured,
  driveIdFromUrl,
  folderUrl,
  listMedia,
  shareFolderWithLink,
} from "@/lib/drive";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const FAILED = "Gagal menyimpan. Periksa koneksi lalu coba lagi.";
const uuid = idSchema;

function refresh(galleryId: string, projectId?: string) {
  revalidatePath(`/admin/galleries/${galleryId}`);
  revalidatePath("/admin/galleries");
  if (projectId) revalidatePath(`/admin/projects/${projectId}/galleries`);
  revalidatePath("/admin");
}

const gallerySchema = z.object({
  title: z.string().trim().min(1, "Isi nama galeri.").max(120),
  driveFolder: z
    .string()
    .trim()
    .max(500)
    .refine((value) => !value || driveIdFromUrl(value), "Link folder Drive tidak dikenali.")
    .transform((value) => (value ? driveIdFromUrl(value) : null)),
  maxSelection: z
    .string()
    .trim()
    .refine((value) => !value || /^\d{1,5}$/.test(value), "Isi angka, mis. 50.")
    .transform((value) => (value ? Number(value) || null : null)),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .transform((value) => (value ? `${value}T23:59:59+07:00` : null)),
});

export type GalleryInput = z.input<typeof gallerySchema>;

export async function saveGallery(
  projectId: string,
  galleryId: string | null,
  input: GalleryInput,
): Promise<Result<{ id: string }>> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  const parsed = gallerySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  const { supabase } = await requireAdmin();
  const row = {
    title: parsed.data.title,
    drive_folder_id: parsed.data.driveFolder,
    max_selection: parsed.data.maxSelection,
    deadline: parsed.data.deadline,
  };

  if (galleryId) {
    if (!isId(galleryId)) return { ok: false, error: FAILED };
    const { error } = await supabase
      .from("photo_sets")
      .update(row)
      .eq("id", galleryId)
      .eq("project_id", projectId);
    if (error) return { ok: false, error: FAILED };
    refresh(galleryId, projectId);
    return { ok: true, id: galleryId };
  }
  const { data, error } = await supabase
    .from("photo_sets")
    .insert({ ...row, project_id: projectId, status: "uploading" })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: FAILED };
  refresh(data.id, projectId);
  return { ok: true, id: data.id };
}

export async function deleteGallery(galleryId: string): Promise<Result<{ projectId: string }>> {
  if (!isId(galleryId)) return { ok: false, error: FAILED };
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("photo_sets")
    .delete()
    .eq("id", galleryId)
    .select("project_id")
    .single();
  if (error || !data) return { ok: false, error: FAILED };
  refresh(galleryId, data.project_id);
  return { ok: true, projectId: data.project_id };
}

/**
 * Membaca isi folder Drive dan menyamakan daftar file di portal.
 * Dikunci per galeri (5 menit) supaya dua klik beruntun tidak menyinkronkan bersamaan.
 */
export async function syncGallery(
  galleryId: string,
): Promise<Result<{ added: number; total: number; skipped: number }>> {
  if (!isId(galleryId)) return { ok: false, error: FAILED };
  if (!driveConfigured()) {
    return {
      ok: false,
      error:
        "Google Drive belum terhubung. Isi GOOGLE_SERVICE_ACCOUNT_JSON (lihat README-PORTAL.md).",
    };
  }
  const { supabase, user } = await requireAdmin();

  const staleLock = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: locked } = await supabase
    .from("photo_sets")
    .update({ sync_locked_at: new Date().toISOString() })
    .eq("id", galleryId)
    .or(`sync_locked_at.is.null,sync_locked_at.lt.${staleLock}`)
    .select("project_id, drive_folder_id, status, title")
    .maybeSingle();
  if (!locked)
    return { ok: false, error: "Sinkronisasi sedang berjalan. Tunggu sebentar lalu muat ulang." };

  const unlock = (extra: Record<string, unknown> = {}) =>
    supabase
      .from("photo_sets")
      .update({ sync_locked_at: null, ...extra })
      .eq("id", galleryId);

  if (!locked.drive_folder_id) {
    await unlock();
    return { ok: false, error: "Tempel link folder Drive dulu di pengaturan galeri." };
  }

  try {
    const { media, skipped } = await listMedia(locked.drive_folder_id);
    const { data: existing } = await supabase
      .from("photos")
      .select("id, drive_file_id")
      .eq("set_id", galleryId);
    const known = new Set((existing ?? []).map((photo) => photo.drive_file_id));
    const inDrive = new Set(media.map((file) => file.id));

    if (media.length) {
      const { error } = await supabase.from("photos").upsert(
        media.map((file, index) => ({
          set_id: galleryId,
          drive_file_id: file.id,
          filename: file.name,
          mime_type: file.mimeType,
          kind: file.kind,
          size_bytes: file.size,
          width: file.width,
          height: file.height,
          sort_order: index,
        })),
        { onConflict: "set_id,drive_file_id" },
      );
      if (error) throw new Error(error.message);
    }

    // File yang dihapus dari Drive ikut hilang dari galeri (beserta pilihannya).
    const removed = (existing ?? []).filter((photo) => !inDrive.has(photo.drive_file_id));
    if (removed.length) {
      await supabase
        .from("photos")
        .delete()
        .in(
          "id",
          removed.map((photo) => photo.id),
        );
    }

    await unlock({
      synced_at: new Date().toISOString(),
      ...(locked.status === "uploading" && media.length ? { status: "ready" } : {}),
    });
    await logActivity(supabase, {
      projectId: locked.project_id,
      action: "gallery.synced",
      actorId: user.id,
      meta: { gallery: locked.title, count: media.length },
    });
    refresh(galleryId, locked.project_id);
    return {
      ok: true,
      added: media.filter((file) => !known.has(file.id)).length,
      total: media.length,
      skipped,
    };
  } catch (error) {
    await unlock();
    return { ok: false, error: error instanceof Error ? error.message : FAILED };
  }
}

const TRANSITIONS: Record<string, string[]> = {
  selecting: ["ready", "selection_closed"],
  selection_closed: ["selecting"],
  editing: ["selection_closed"],
};

/** Ubah tahap galeri. Saat seleksi dibuka, folder Drive dibuat bisa dilihat via link (untuk video). */
export async function setGalleryStatus(galleryId: string, status: string): Promise<Result> {
  if (!isId(galleryId)) return { ok: false, error: FAILED };
  const parsedStatus = z.enum(["selecting", "selection_closed", "editing"]).safeParse(status);
  if (!parsedStatus.success) return { ok: false, error: FAILED };
  const next = parsedStatus.data;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("photo_sets")
    .update({
      status: next,
      ...(next === "selecting" ? { submitted_at: null, submitted_by: null } : {}),
    })
    .eq("id", galleryId)
    .in("status", TRANSITIONS[next])
    .select("project_id, drive_folder_id")
    .maybeSingle();
  if (error || !data)
    return { ok: false, error: "Tahap galeri sudah berubah. Muat ulang halaman." };

  if (next === "selecting" && data.drive_folder_id && driveConfigured()) {
    // Video diputar lewat pemutar Google Drive; gagal membagikan tidak menghentikan seleksi.
    await shareFolderWithLink(data.drive_folder_id).catch((cause) =>
      console.error("[drive] gagal membagikan folder:", cause),
    );
  }
  refresh(galleryId, data.project_id);
  return { ok: true };
}

export async function deliverGallery(galleryId: string, editedFolder: string): Promise<Result> {
  if (!isId(galleryId)) return { ok: false, error: FAILED };
  const folderId = driveIdFromUrl(editedFolder);
  if (!folderId) return { ok: false, error: "Tempel link folder Google Drive hasil edit." };
  const { supabase, user } = await requireAdmin();

  if (driveConfigured()) {
    await shareFolderWithLink(folderId).catch((cause) =>
      console.error("[drive] gagal membagikan folder hasil edit:", cause),
    );
  }
  const { data, error } = await supabase
    .from("photo_sets")
    .update({
      status: "delivered",
      edited_folder_id: folderId,
      edited_share_url: folderUrl(folderId),
    })
    .eq("id", galleryId)
    .in("status", ["selection_closed", "editing", "delivered"])
    .select("project_id, title")
    .maybeSingle();
  if (error || !data)
    return { ok: false, error: "Tutup seleksi dulu sebelum mengirim hasil edit." };

  await logActivity(supabase, {
    projectId: data.project_id,
    action: "gallery.delivered",
    actorId: user.id,
    meta: { gallery: data.title },
  });
  refresh(galleryId, data.project_id);
  return { ok: true };
}
