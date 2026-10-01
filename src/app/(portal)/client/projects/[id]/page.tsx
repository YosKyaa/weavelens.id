import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EmptyState } from "@/components/atoms/EmptyState";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { ViewSwitch } from "@/components/molecules/ViewSwitch";
import { ContentCalendar } from "@/components/organisms/ContentCalendar";
import { ContentReviewList } from "@/components/organisms/ContentReviewList";
import { portal } from "@/content/portal";
import { loadBoard, toCalendarItems } from "@/lib/board-data";
import { isMonth, shiftMonth } from "@/lib/calendar";
import { todayJakarta } from "@/lib/format";
import { loadClientProject } from "./data";

const text = portal.clientHome;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ brand?: string; view?: string; month?: string }>;
};

/** Semua desain satu proyek; yang menunggu review klien tampil paling atas. */
export default async function ClientProjectPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { brand, view, month: monthParam } = await searchParams;
  const { supabase, db, project } = await loadClientProject(id);

  const [items, { data: brands }] = await Promise.all([
    loadBoard(db, project.id),
    supabase
      .from("brands")
      .select("id, name, color")
      .eq("client_id", project.client_id)
      .order("sort"),
  ]);
  const activeBrand = brand && brands?.some((item) => item.id === brand) ? brand : null;
  const base = `/client/projects/${project.id}`;
  const calendar = view === "calendar";
  const month = isMonth(monthParam) ? monthParam : todayJakarta().slice(0, 7);
  const monthHref = (value: string) => `${base}?view=calendar&month=${value}`;

  return (
    <div className="grid gap-6">
      <Link
        href="/client"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-ink/75 hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {text.backToProjects}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl">{project.title}</h1>
          <p className="mt-2 max-w-2xl text-ink/75">{text.contentSub}</p>
        </div>
        <StatusBadge kind="project" status={project.status} />
      </div>
      {items.length > 0 && (
        <ViewSwitch
          label="Tampilan konten"
          active={calendar ? "calendar" : "list"}
          options={[
            { id: "list", label: "Daftar", href: base },
            { id: "calendar", label: "Kalender", href: monthHref(month) },
          ]}
        />
      )}
      {items.length === 0 ? (
        <EmptyState message={text.noContent} />
      ) : calendar ? (
        <ContentCalendar
          key={month}
          items={toCalendarItems(items, brands ?? [])}
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
