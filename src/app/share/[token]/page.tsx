import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/atoms/EmptyState";
import { ContentReviewList } from "@/components/organisms/ContentReviewList";
import { shareText } from "@/content/workspace";
import { loadBoard } from "@/lib/board-data";
import { resolveShare } from "@/lib/share";

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
  const items = await loadBoard(context.db, context.project.id, context.brandId, {
    shareToken: token,
  });
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

  const base = `/share/${token}`;

  if (items.length === 0)
    return <EmptyState message={shareText.content.empty} className="bg-paper" />;

  return (
    <ContentReviewList
      items={items}
      brands={brands ?? []}
      activeBrand={activeBrand}
      filterHref={(brandId) => (brandId ? `${base}?brand=${brandId}` : base)}
      itemHref={(contentId) => `${base}/content/${contentId}`}
    />
  );
}
