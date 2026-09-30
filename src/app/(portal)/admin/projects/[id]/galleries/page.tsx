import Link from "next/link";
import { EmptyState } from "@/components/atoms/EmptyState";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { GalleryCreate } from "@/components/organisms/GalleryCreate";
import { workspaceText } from "@/content/workspace";
import { requireAdmin } from "@/lib/auth";
import { serviceAccountEmail } from "@/lib/drive";
import { loadGalleries } from "@/lib/gallery-data";

const text = workspaceText.galleries;

type PageProps = { params: Promise<{ id: string }> };

export default async function ProjectGalleriesPage({ params }: PageProps) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const galleries = await loadGalleries(supabase, id);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[60ch] text-sm text-ink/75">{text.description}</p>
        <GalleryCreate projectId={id} serviceAccount={serviceAccountEmail()} />
      </div>
      {galleries.length === 0 ? (
        <EmptyState message={text.empty} className="bg-paper" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {galleries.map((gallery) => (
            <li key={gallery.id}>
              <Link
                href={`/admin/galleries/${gallery.id}`}
                className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-paper p-5 transition-shadow hover:shadow-soft"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="font-heading font-semibold text-ink">{gallery.title}</span>
                  <StatusBadge kind="photoSet" status={gallery.status} />
                </span>
                <span className="text-sm text-ink/70">
                  {text.selectedCount(gallery.selected, gallery.maxSelection)} · {gallery.total}{" "}
                  file
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
