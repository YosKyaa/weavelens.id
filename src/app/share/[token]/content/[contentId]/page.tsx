import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { guestApprove, guestComment, guestRequestRevision } from "@/app/share/actions";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { ReviewWorkspace } from "@/components/organisms/ReviewWorkspace";
import { FORMATS, formatLabels, shareText, type ContentFormat } from "@/content/workspace";
import { formatDate } from "@/lib/format";
import { loadReviewVersions } from "@/lib/review-data";
import { resolveShare } from "@/lib/share";

const text = shareText.content;

type PageProps = { params: Promise<{ token: string; contentId: string }> };

export default async function ShareReviewPage({ params }: PageProps) {
  const { token, contentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(contentId)) notFound();
  const context = await resolveShare(token);
  if (!context) notFound();

  let query = context.db
    .from("design_assets")
    .select("id, title, stage, format, caption, publish_date, brief, brands(name, color)")
    .eq("id", contentId)
    .eq("project_id", context.project.id);
  if (context.brandId) query = query.eq("brand_id", context.brandId);
  const { data: content } = await query.maybeSingle();
  if (!content) notFound();

  const versions = await loadReviewVersions(context.db, contentId);
  const format = (FORMATS as readonly string[]).includes(content.format)
    ? (content.format as ContentFormat)
    : "other";

  return (
    <div className="grid gap-6">
      <Link
        href={`/share/${token}`}
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
        canComment={context.canReview}
        showDecision
        emptyMessage={text.noVersion}
        actions={{
          comment: guestComment.bind(null, token),
          approve: guestApprove.bind(null, token),
          revise: guestRequestRevision.bind(null, token),
        }}
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
