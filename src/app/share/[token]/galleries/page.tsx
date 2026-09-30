import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/atoms/EmptyState";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { shareText } from "@/content/workspace";
import { formatDate } from "@/lib/format";
import { loadGalleries } from "@/lib/gallery-data";
import { resolveShare } from "@/lib/share";

const text = shareText.gallery;

type PageProps = { params: Promise<{ token: string }> };

export default async function ShareGalleriesPage({ params }: PageProps) {
  const { token } = await params;
  const context = await resolveShare(token);
  if (!context) notFound();

  const galleries = (await loadGalleries(context.db, context.project.id)).filter(
    (gallery) => gallery.status !== "uploading",
  );
  if (galleries.length === 0) return <EmptyState message={text.empty} className="bg-paper" />;

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {galleries.map((gallery) => (
        <li key={gallery.id}>
          <Link
            href={`/share/${token}/galleries/${gallery.id}`}
            className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-paper p-5 transition-shadow hover:shadow-lift"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="font-heading text-lg font-semibold">{gallery.title}</span>
              <StatusBadge kind="photoSet" status={gallery.status} />
            </span>
            <span className="text-sm text-ink/75">{text.statusHint[gallery.status]}</span>
            <span className="mt-auto flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold tabular-nums">
                {text.counter(gallery.selected, gallery.maxSelection)} · {gallery.total} file
              </span>
              {gallery.deadline && gallery.status === "selecting" && (
                <span className="text-ink/70">{text.deadline(formatDate(gallery.deadline))}</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
