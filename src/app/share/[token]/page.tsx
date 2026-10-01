import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/atoms/EmptyState";
import { ViewSwitch } from "@/components/molecules/ViewSwitch";
import { ContentCalendar } from "@/components/organisms/ContentCalendar";
import { ContentReviewList } from "@/components/organisms/ContentReviewList";
import { shareText } from "@/content/workspace";
import { loadBoard, toCalendarItems } from "@/lib/board-data";
import { isMonth, shiftMonth } from "@/lib/calendar";
import { todayJakarta } from "@/lib/format";
import { resolveShare } from "@/lib/share";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ brand?: string; view?: string; month?: string }>;
};

export default async function ShareContentPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { brand: brandParam, view, month: monthParam } = await searchParams;
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

  const calendar = view === "calendar";
  const month = isMonth(monthParam) ? monthParam : todayJakarta().slice(0, 7);
  const monthHref = (value: string) => `${base}?view=calendar&month=${value}`;

  return (
    <div className="grid gap-5">
      <ViewSwitch
        label="Tampilan konten"
        active={calendar ? "calendar" : "list"}
        options={[
          { id: "list", label: "Daftar", href: base },
          { id: "calendar", label: "Kalender", href: monthHref(month) },
        ]}
      />
      {calendar ? (
        <ContentCalendar
          key={month}
          items={toCalendarItems(items, context.brand ? [context.brand] : (brands ?? []))}
          month={month}
          monthHrefs={{
            previous: monthHref(shiftMonth(month, -1)),
            next: monthHref(shiftMonth(month, 1)),
            current: monthHref(todayJakarta().slice(0, 7)),
          }}
          itemHrefPrefix={`${base}/content/`}
        />
      ) : (
        <ContentReviewList
          items={items}
          brands={brands ?? []}
          activeBrand={activeBrand}
          filterHref={(brandId) => (brandId ? `${base}?brand=${brandId}` : base)}
          itemHref={(contentId) => `${base}/content/${contentId}`}
        />
      )}
    </div>
  );
}
