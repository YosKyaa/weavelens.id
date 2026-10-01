import { notFound } from "next/navigation";
import { clientApprove, clientComment, clientRequestRevision } from "@/app/(portal)/client/actions";
import { ContentReviewDetail } from "@/components/organisms/ContentReviewDetail";
import { FORMATS, type ContentFormat } from "@/content/workspace";
import { isId } from "@/lib/ids";
import { loadReviewVersions } from "@/lib/review-data";
import { loadClientProject } from "../../data";

type PageProps = { params: Promise<{ id: string; contentId: string }> };

/** Review satu desain oleh klien yang login: komentar bertitik, setujui, atau minta revisi. */
export default async function ClientContentPage({ params }: PageProps) {
  const { id, contentId } = await params;
  if (!isId(contentId)) notFound();
  const { db, project } = await loadClientProject(id);

  const { data: content } = await db
    .from("design_assets")
    .select("id, title, stage, format, caption, publish_date, brands(name, color)")
    .eq("id", contentId)
    .eq("project_id", project.id)
    .maybeSingle();
  if (!content) notFound();

  const versions = await loadReviewVersions(db, contentId);
  const format = (FORMATS as readonly string[]).includes(content.format)
    ? (content.format as ContentFormat)
    : "other";

  return (
    <ContentReviewDetail
      backHref={`/client/projects/${project.id}`}
      content={content}
      format={format}
      versions={versions}
      canReview
      actions={{ comment: clientComment, approve: clientApprove, revise: clientRequestRevision }}
    />
  );
}
