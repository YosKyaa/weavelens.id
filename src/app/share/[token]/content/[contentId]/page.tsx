import { notFound } from "next/navigation";
import { guestApprove, guestComment, guestRequestRevision } from "@/app/share/actions";
import { ContentReviewDetail } from "@/components/organisms/ContentReviewDetail";
import { FORMATS, type ContentFormat } from "@/content/workspace";
import { loadReviewVersions } from "@/lib/review-data";
import { resolveShare } from "@/lib/share";

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
    <ContentReviewDetail
      backHref={`/share/${token}`}
      content={content}
      format={format}
      versions={versions}
      canReview={context.canReview}
      actions={{
        comment: guestComment.bind(null, token),
        approve: guestApprove.bind(null, token),
        revise: guestRequestRevision.bind(null, token),
      }}
    />
  );
}
