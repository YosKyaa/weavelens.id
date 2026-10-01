import { notFound } from "next/navigation";
import { FormSection } from "@/components/molecules/FormSection";
import { PageHeader } from "@/components/molecules/PageHeader";
import { GalleryDangerZone } from "@/components/organisms/GalleryDangerZone";
import { GalleryForm } from "@/components/organisms/GalleryForm";
import { GalleryManager } from "@/components/organisms/GalleryManager";
import { requireStaff } from "@/lib/auth";
import { driveConfigured, folderUrl, serviceAccountEmail } from "@/lib/drive";
import { loadGalleryPhotos } from "@/lib/gallery-data";

type PageProps = { params: Promise<{ galleryId: string }> };

export default async function GalleryPage({ params }: PageProps) {
  const { galleryId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(galleryId)) notFound();
  const { supabase, profile } = await requireStaff();

  const { data: gallery } = await supabase
    .from("photo_sets")
    .select(
      "id, title, status, max_selection, deadline, drive_folder_id, edited_share_url, submitted_by, project_id, projects!inner(title, clients(name))",
    )
    .eq("id", galleryId)
    .maybeSingle();
  if (!gallery) notFound();

  const photos = await loadGalleryPhotos(supabase, galleryId);

  return (
    <>
      <PageHeader
        title={gallery.title}
        description={[gallery.projects.clients?.name, gallery.projects.title]
          .filter(Boolean)
          .join(" · ")}
        back={{
          href: `/admin/projects/${gallery.project_id}/galleries`,
          label: gallery.projects.title,
        }}
      />
      <div className="grid gap-6">
        <GalleryManager
          driveReady={driveConfigured()}
          photos={photos}
          gallery={{
            id: gallery.id,
            title: gallery.title,
            status: gallery.status,
            maxSelection: gallery.max_selection,
            editedShareUrl: gallery.edited_share_url,
            submittedBy: gallery.submitted_by,
            hasFolder: Boolean(gallery.drive_folder_id),
          }}
        />
        <FormSection title="Pengaturan galeri" className="max-w-3xl">
          <GalleryForm
            projectId={gallery.project_id}
            galleryId={gallery.id}
            serviceAccount={serviceAccountEmail()}
            initial={{
              title: gallery.title,
              driveFolder: gallery.drive_folder_id ? folderUrl(gallery.drive_folder_id) : "",
              maxSelection: gallery.max_selection ? String(gallery.max_selection) : "",
              deadline: gallery.deadline ? gallery.deadline.slice(0, 10) : "",
            }}
          />
        </FormSection>
        {profile.role === "admin" && (
          <GalleryDangerZone galleryId={gallery.id} title={gallery.title} />
        )}
      </div>
    </>
  );
}
