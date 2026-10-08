import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ListChecks,
} from "lucide-react";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { ReviewWorkspace } from "@/components/organisms/ReviewWorkspace";
import { formatLabels, shareText, type ContentFormat } from "@/content/workspace";
import { formatDate } from "@/lib/format";
import type { ReviewActions, ReviewVersion } from "@/lib/review";
import type { QueueItem } from "@/lib/review-queue";
import { queuePosition } from "@/lib/review-queue";

const text = shareText.content;

export type ReviewContent = {
  id: string;
  title: string;
  stage: string;
  caption: string | null;
  publish_date: string | null;
  /** Link postingan setelah tayang (diisi tim). */
  published_url?: string | null;
  brands: { name: string; color: string } | null;
};

type ContentReviewDetailProps = {
  backHref: string;
  content: ReviewContent;
  format: ContentFormat;
  versions: ReviewVersion[];
  /** `false` = hanya melihat (link tanpa izin review). */
  canReview: boolean;
  actions: ReviewActions;
  /** Konten yang menunggu review (mode review berurutan). */
  queue: QueueItem[];
  hrefFor: (contentId: string) => string;
};

/** Halaman satu desain untuk klien: pratinjau, komentar bertitik, setujui / minta revisi. */
export function ContentReviewDetail({
  backHref,
  content,
  format,
  versions,
  canReview,
  actions,
  queue,
  hrefFor,
}: ContentReviewDetailProps) {
  const position = queuePosition(queue, content.id);
  const inQueue = position.index >= 0;
  const nextHref = canReview && position.next ? hrefFor(position.next.id) : null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-ink/75 hover:text-ink"
        >
          <ChevronLeft aria-hidden className="size-4" />
          {text.back}
        </Link>

        {/* Mode review berurutan: posisi + sebelumnya/berikutnya. */}
        {canReview && inQueue && position.total > 1 && (
          <nav
            aria-label={text.queue.label}
            className="flex items-center gap-1 rounded-full border border-line bg-paper p-1 pl-3 text-sm"
          >
            <ListChecks aria-hidden className="size-4 text-primary" />
            <span className="px-1 font-semibold text-ink">
              {text.queue.position(position.index + 1, position.total)}
            </span>
            <QueueLink
              href={position.previous ? hrefFor(position.previous.id) : null}
              label={text.queue.previous}
            >
              <ChevronLeft aria-hidden className="size-4" />
            </QueueLink>
            <QueueLink
              href={position.next ? hrefFor(position.next.id) : null}
              label={text.queue.next}
            >
              <ChevronRight aria-hidden className="size-4" />
            </QueueLink>
          </nav>
        )}
      </div>

      {/* Desain ini sudah diputuskan: arahkan ke desain berikutnya atau tutup sesi review. */}
      {canReview && !inQueue && content.stage !== "client_review" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success/30 bg-success-soft px-4 py-3">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-ink">
            <CheckCircle2 aria-hidden className="size-5 text-success" />
            {position.remaining > 0 ? text.queue.more(position.remaining) : text.queue.done}
          </p>
          {position.next ? (
            <Link
              href={hrefFor(position.next.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-brand-hover"
            >
              {text.queue.continue}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          ) : (
            <Link
              href={backHref}
              className="text-sm font-semibold text-primary underline underline-offset-4"
            >
              {text.back}
            </Link>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink/70">
            {content.brands && (
              <span className="inline-flex items-center gap-1 font-semibold text-ink">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: content.brands.color }}
                />
                {content.brands.name}
              </span>
            )}
            <span>{formatLabels[format]}</span>
            {content.publish_date && (
              <span>
                · {text.publishDate} {formatDate(content.publish_date)}
              </span>
            )}
          </p>
          <h2 className="mt-1 text-2xl">{content.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {content.published_url && (
            <a
              href={content.published_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-paper px-3 text-sm font-medium text-ink hover:border-ink"
            >
              Lihat postingan
              <ExternalLink aria-hidden className="size-4" />
            </a>
          )}
          <StatusBadge kind="stage" status={content.stage} />
        </div>
      </div>

      <ReviewWorkspace
        versions={versions}
        format={format}
        canComment={canReview}
        showDecision
        emptyMessage={text.noVersion}
        actions={actions}
        caption={content.caption}
        nextHref={nextHref}
      />
    </div>
  );
}

function QueueLink({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  const className =
    "flex size-8 items-center justify-center rounded-full text-ink/75 transition-colors";
  return href ? (
    <Link href={href} aria-label={label} className={`${className} hover:bg-canvas hover:text-ink`}>
      {children}
    </Link>
  ) : (
    <span aria-hidden className={`${className} opacity-35`}>
      {children}
    </span>
  );
}
