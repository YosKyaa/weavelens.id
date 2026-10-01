import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { ReviewWorkspace } from "@/components/organisms/ReviewWorkspace";
import { formatLabels, shareText, type ContentFormat } from "@/content/workspace";
import { formatDate } from "@/lib/format";
import type { ReviewActions, ReviewVersion } from "@/lib/review";

const text = shareText.content;

export type ReviewContent = {
  title: string;
  stage: string;
  caption: string | null;
  publish_date: string | null;
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
};

/** Halaman satu desain untuk klien: pratinjau, komentar bertitik, setujui / minta revisi. */
export function ContentReviewDetail({
  backHref,
  content,
  format,
  versions,
  canReview,
  actions,
}: ContentReviewDetailProps) {
  return (
    <div className="grid gap-6">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-ink/75 hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {text.back}
      </Link>
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
        <StatusBadge kind="stage" status={content.stage} />
      </div>

      <ReviewWorkspace
        versions={versions}
        format={format}
        canComment={canReview}
        showDecision
        emptyMessage={text.noVersion}
        actions={actions}
      />

      {content.caption && (
        <section className="rounded-2xl border border-line bg-paper p-5">
          <h3 className="font-heading font-semibold">{text.caption}</h3>
          <p className="mt-2 whitespace-pre-line text-ink/85">{content.caption}</p>
        </section>
      )}
    </div>
  );
}
