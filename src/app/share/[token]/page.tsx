import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, MessageSquareWarning } from "lucide-react";
import { EmptyState } from "@/components/atoms/EmptyState";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { formatAspect, formatLabels, shareText, type Stage } from "@/content/workspace";
import { loadBoard } from "@/lib/board-data";
import { formatDate } from "@/lib/format";
import { resolveShare } from "@/lib/share";
import { cn } from "@/lib/utils";

const text = shareText.content;

/** Urutan tampil untuk klien: yang butuh tindakan mereka paling atas. */
const PRIORITY: Record<Stage, number> = {
  client_review: 0,
  revision: 1,
  in_progress: 2,
  brief: 3,
  approved: 4,
  published: 5,
};

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ brand?: string }>;
};

export default async function ShareContentPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { brand: brandParam } = await searchParams;
  const context = await resolveShare(token);
  if (!context) notFound();

  const isDesign = context.project.type === "design" || context.project.type === "mixed";
  const items = await loadBoard(context.db, context.project.id, context.brandId);
  if (!isDesign && items.length === 0) redirect(`/share/${token}/galleries`);

  const { data: brands } = context.brandId
    ? { data: [] }
    : await context.db
        .from("brands")
        .select("id, name, color")
        .eq("client_id", context.project.client_id)
        .order("sort");
  const brandById = new Map((brands ?? []).map((brand) => [brand.id, brand]));
  const activeBrand = brandParam && brandById.has(brandParam) ? brandParam : null;

  const visible = items
    .filter((item) => !activeBrand || item.brandId === activeBrand)
    .sort(
      (a, b) =>
        PRIORITY[a.stage] - PRIORITY[b.stage] ||
        (a.publishDate ?? "").localeCompare(b.publishDate ?? ""),
    );
  const approved = items.filter(
    (item) => item.stage === "approved" || item.stage === "published",
  ).length;
  const waiting = items.filter((item) => item.stage === "client_review").length;
  const base = `/share/${token}`;

  if (items.length === 0) return <EmptyState message={text.empty} className="bg-paper" />;

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 rounded-2xl border border-line bg-paper p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <p className="font-heading font-semibold">
            {shareText.progress.summary(approved, items.length)}
          </p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-sand"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-valuenow={approved}
            aria-label={shareText.progress.summary(approved, items.length)}
          >
            <div
              className="h-full rounded-full bg-success"
              style={{ width: `${(approved / items.length) * 100}%` }}
            />
          </div>
        </div>
        <p
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold",
            waiting ? "bg-brand-soft text-primary" : "bg-success-soft text-success",
          )}
        >
          <MessageSquareWarning aria-hidden className="size-4" />
          {shareText.progress.waiting(waiting)}
        </p>
      </section>

      {(brands?.length ?? 0) > 1 && (
        <nav aria-label="Filter brand" className="flex flex-wrap gap-2">
          <Link
            href={base}
            aria-current={!activeBrand ? "page" : undefined}
            className={cn(
              "rounded-full border border-line bg-paper px-3 py-1.5 text-sm font-medium",
              !activeBrand && "border-ink bg-ink text-paper",
            )}
          >
            Semua brand
          </Link>
          {brands!.map((brand) => (
            <Link
              key={brand.id}
              href={`${base}?brand=${brand.id}`}
              aria-current={activeBrand === brand.id ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-sm font-medium",
                activeBrand === brand.id && "border-ink bg-ink text-paper",
              )}
            >
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: brand.color }}
              />
              {brand.name}
            </Link>
          ))}
        </nav>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => {
          const brand = item.brandId ? brandById.get(item.brandId) : null;
          const needsReview = item.stage === "client_review";
          return (
            <li key={item.id}>
              <Link
                href={`${base}/content/${item.id}`}
                className={cn(
                  "group flex h-full flex-col overflow-hidden rounded-2xl border bg-paper transition-shadow hover:shadow-lift",
                  needsReview ? "border-primary ring-1 ring-primary" : "border-line",
                )}
              >
                <span
                  className={cn(
                    "relative block bg-placeholder",
                    formatAspect[item.format],
                    "max-h-80 w-full",
                  )}
                >
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 360px, 50vw"
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-ink/60">
                      {text.noVersion}
                    </span>
                  )}
                  {needsReview && (
                    <span className="absolute top-3 left-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-soft">
                      {text.waitingFirst}
                    </span>
                  )}
                </span>
                <span className="flex flex-1 flex-col gap-2 p-4">
                  <span className="flex flex-wrap items-center gap-2 text-xs">
                    {brand && (
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <span
                          aria-hidden
                          className="size-2 rounded-full"
                          style={{ backgroundColor: brand.color }}
                        />
                        {brand.name}
                      </span>
                    )}
                    <span className="rounded-full border border-line px-2 py-0.5 text-ink/75">
                      {formatLabels[item.format]}
                    </span>
                  </span>
                  <span className="font-medium text-ink group-hover:text-primary">
                    {item.title}
                  </span>
                  <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                    <StatusBadge kind="stage" status={item.stage} />
                    {item.publishDate && (
                      <span className="inline-flex items-center gap-1 text-xs text-ink/65">
                        <CalendarDays aria-hidden className="size-3.5" />
                        {formatDate(item.publishDate)}
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
