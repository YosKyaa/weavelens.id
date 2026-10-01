import { PageHeader } from "@/components/molecules/PageHeader";
import { GalleryList } from "@/components/organisms/GalleryList";
import { workspaceText } from "@/content/workspace";
import { requireStaff } from "@/lib/auth";
import { loadGalleries } from "@/lib/gallery-data";

const text = workspaceText.galleries;

/** Semua galeri seleksi dari semua proyek. Galeri baru dibuat dari halaman proyek. */
export default async function GalleriesPage() {
  const { supabase } = await requireStaff();
  const galleries = await loadGalleries(supabase);

  return (
    <>
      <PageHeader
        title={text.title}
        description={`${text.description} Galeri baru dibuat dari tab “Galeri seleksi” di halaman proyek.`}
      />
      <GalleryList
        rows={galleries.map((gallery) => ({
          id: gallery.id,
          title: gallery.title,
          project: gallery.projectTitle,
          client: gallery.clientName,
          status: gallery.status,
          total: gallery.total,
          selected: gallery.selected,
          maxSelection: gallery.maxSelection,
          deadline: gallery.deadline,
        }))}
      />
    </>
  );
}
