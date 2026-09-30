import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { addTeamComment, setCommentResolved } from "@/app/(portal)/admin/projects/actions";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { FormSection } from "@/components/molecules/FormSection";
import { ContentDetailsForm } from "@/components/organisms/ContentDetailsForm";
import { ReviewWorkspace } from "@/components/organisms/ReviewWorkspace";
import { VersionUploader } from "@/components/organisms/VersionUploader";
import {
  FORMATS,
  STAGES,
  workspaceText,
  type ContentFormat,
  type Stage,
} from "@/content/workspace";
import { requireAdmin } from "@/lib/auth";
import { loadReviewVersions } from "@/lib/review-data";

const text = workspaceText.content;

type PageProps = { params: Promise<{ id: string; contentId: string }> };

export default async function ContentPage({ params }: PageProps) {
  const { id, contentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(contentId)) notFound();
  const { supabase } = await requireAdmin();

  const { data: content } = await supabase
    .from("design_assets")
    .select(
      "id, title, stage, format, brand_id, due_date, publish_date, brief, caption, projects!inner(client_id)",
    )
    .eq("id", contentId)
    .eq("project_id", id)
    .maybeSingle();
  if (!content) notFound();

  const [versions, { data: brands }] = await Promise.all([
    loadReviewVersions(supabase, contentId),
    supabase
      .from("brands")
      .select("id, name")
      .eq("client_id", content.projects.client_id)
      .order("sort"),
  ]);
  const format = (FORMATS as readonly string[]).includes(content.format)
    ? (content.format as ContentFormat)
    : "other";
  const stage = (STAGES as readonly string[]).includes(content.stage)
    ? (content.stage as Stage)
    : "brief";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/projects/${id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-ink/75 hover:text-ink"
        >
          <ChevronLeft aria-hidden className="size-4" />
          {text.back}
        </Link>
        <StatusBadge kind="stage" status={content.stage} />
      </div>
      <h2 className="text-2xl">{content.title}</h2>

      <ReviewWorkspace
        versions={versions}
        format={format}
        canComment
        emptyMessage={text.versions.empty}
        actions={{
          comment: addTeamComment.bind(null, id),
          resolve: setCommentResolved.bind(null, id),
        }}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <FormSection title={text.versions.upload}>
          <VersionUploader projectId={id} contentId={contentId} />
        </FormSection>
        <FormSection title="Detail konten">
          <ContentDetailsForm
            projectId={id}
            contentId={contentId}
            brands={brands ?? []}
            initial={{
              title: content.title,
              brandId: content.brand_id,
              format,
              stage,
              dueDate: content.due_date ?? "",
              publishDate: content.publish_date ?? "",
              brief: content.brief ?? "",
              caption: content.caption ?? "",
            }}
          />
        </FormSection>
      </div>
    </div>
  );
}
