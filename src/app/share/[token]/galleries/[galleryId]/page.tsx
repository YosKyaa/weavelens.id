import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PhotoSelector } from "@/components/organisms/PhotoSelector";
import { shareText } from "@/content/workspace";
import { loadGalleryPhotos } from "@/lib/gallery-data";
import { resolveShare } from "@/lib/share";

type PageProps = { params: Promise<{ token: string; galleryId: string }> };

export default async function ShareGalleryPage({ params }: PageProps) {
  const { token, galleryId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(galleryId)) notFound();
  const context = await resolveShare(token);
  if (!context) notFound();

  const { data: gallery } = await context.db
    .from("photo_sets")
    .select("id, title, status, max_selection, deadline, edited_share_url")
    .eq("id", galleryId)
    .eq("project_id", context.project.id)
    .neq("status", "uploading")
    .maybeSingle();
  if (!gallery) notFound();

  const photos = await loadGalleryPhotos(context.db, galleryId);
  const open =
    gallery.status === "selecting" &&
    (!gallery.deadline || new Date(gallery.deadline) > new Date());

  return (
    <div className="grid gap-4">
      <Link
        href={`/share/${token}/galleries`}
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-ink/75 hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {shareText.tabs.galleries}
      </Link>
      <PhotoSelector
        key={`${gallery.id}-${gallery.status}`}
        token={token}
        canSelect={open}
        photos={photos.map((photo) => ({
          id: photo.id,
          filename: photo.filename,
          kind: photo.kind,
          driveFileId: photo.driveFileId,
          selected: photo.selected,
          note: photo.note,
        }))}
        gallery={{
          id: gallery.id,
          title: gallery.title,
          status: gallery.status,
          maxSelection: gallery.max_selection,
          deadline: gallery.deadline,
          editedShareUrl: gallery.edited_share_url,
        }}
      />
    </div>
  );
}
