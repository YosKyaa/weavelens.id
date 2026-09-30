import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type GallerySummary = {
  id: string;
  title: string;
  status: string;
  projectId: string;
  projectTitle: string;
  clientName: string;
  total: number;
  selected: number;
  maxSelection: number | null;
  deadline: string | null;
};

/** Ringkasan galeri (jumlah file & pilihan). `projectId` kosong = semua proyek. */
export async function loadGalleries(
  db: SupabaseClient<Database>,
  projectId?: string,
): Promise<GallerySummary[]> {
  let query = db
    .from("photo_sets")
    .select(
      "id, title, status, max_selection, deadline, project_id, projects!inner(title, clients(name)), photos(count), photo_selections(count)",
    )
    .order("created_at", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);
  const { data } = await query;

  return (data ?? []).map((set) => ({
    id: set.id,
    title: set.title,
    status: set.status,
    projectId: set.project_id,
    projectTitle: set.projects.title,
    clientName: set.projects.clients?.name ?? "",
    total: set.photos[0]?.count ?? 0,
    selected: set.photo_selections[0]?.count ?? 0,
    maxSelection: set.max_selection,
    deadline: set.deadline,
  }));
}

export type GalleryPhoto = {
  id: string;
  filename: string;
  kind: "image" | "video";
  driveFileId: string;
  width: number | null;
  height: number | null;
  selected: boolean;
  note: string | null;
  selectedBy: string | null;
};

export async function loadGalleryPhotos(
  db: SupabaseClient<Database>,
  galleryId: string,
): Promise<GalleryPhoto[]> {
  const [{ data: photos }, { data: selections }] = await Promise.all([
    db
      .from("photos")
      .select("id, filename, kind, drive_file_id, width, height")
      .eq("set_id", galleryId)
      .order("sort_order"),
    db.from("photo_selections").select("photo_id, note, guest_name").eq("set_id", galleryId),
  ]);
  const byPhoto = new Map((selections ?? []).map((selection) => [selection.photo_id, selection]));

  return (photos ?? []).map((photo) => {
    const selection = byPhoto.get(photo.id);
    return {
      id: photo.id,
      filename: photo.filename,
      kind: photo.kind === "video" ? "video" : "image",
      driveFileId: photo.drive_file_id,
      width: photo.width,
      height: photo.height,
      selected: Boolean(selection),
      note: selection?.note ?? null,
      selectedBy: selection?.guest_name ?? null,
    };
  });
}
