import { FormSection } from "@/components/molecules/FormSection";
import { ShareLinksManager, type ShareLinkRow } from "@/components/organisms/ShareLinksManager";
import { workspaceText } from "@/content/workspace";
import { requireStaff } from "@/lib/auth";

type PageProps = { params: Promise<{ id: string }> };

export default async function ProjectSharePage({ params }: PageProps) {
  const { id } = await params;
  const { supabase } = await requireStaff();

  const [{ data: project }, { data: links }] = await Promise.all([
    supabase.from("projects").select("title, client_id").eq("id", id).single(),
    supabase
      .from("share_links")
      .select(
        "id, token, label, brand_id, can_review, expires_at, revoked_at, last_opened_at, brands(name)",
      )
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const { data: brands } = await supabase
    .from("brands")
    .select("id, name")
    .eq("client_id", project?.client_id ?? "")
    .order("sort");

  const now = new Date();
  const rows: ShareLinkRow[] = (links ?? []).map((link) => ({
    id: link.id,
    token: link.token,
    label: link.label,
    brandName: link.brands?.name ?? null,
    canReview: link.can_review,
    expiresAt: link.expires_at,
    lastOpenedAt: link.last_opened_at,
    status: link.revoked_at
      ? "revoked"
      : link.expires_at && new Date(link.expires_at) < now
        ? "expired"
        : "active",
  }));

  return (
    <FormSection title={workspaceText.share.title} description={workspaceText.share.description}>
      <ShareLinksManager
        projectId={id}
        projectTitle={project?.title ?? ""}
        brands={brands ?? []}
        links={rows}
        missingBrands={
          (brands ?? []).filter(
            (brand) =>
              !(links ?? []).some(
                (link) =>
                  link.brand_id === brand.id &&
                  !link.revoked_at &&
                  (!link.expires_at || new Date(link.expires_at) >= now),
              ),
          ).length
        }
      />
    </FormSection>
  );
}
