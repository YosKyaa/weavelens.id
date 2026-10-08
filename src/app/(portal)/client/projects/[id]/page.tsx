import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EmptyState } from "@/components/atoms/EmptyState";
import { ProjectAvatar } from "@/components/atoms/ProjectAvatar";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { ViewSwitch } from "@/components/molecules/ViewSwitch";
import { ContentCalendar } from "@/components/organisms/ContentCalendar";
import { ContentReviewList } from "@/components/organisms/ContentReviewList";
import { MonthlyReport } from "@/components/organisms/MonthlyReport";
import { PlanTimeline } from "@/components/organisms/PlanTimeline";
import { portal } from "@/content/portal";
import { loadBoard, toCalendarItems } from "@/lib/board-data";
import { isMonth, shiftMonth } from "@/lib/calendar";
import { todayJakarta } from "@/lib/format";
import { loadMonthlyReport } from "@/lib/report-data";
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

  const [items, { data: brands }, { data: plan }] = await Promise.all([
    loadBoard(db, project.id),
    supabase
      .from("brands")
      .select("id, name, color")
      .eq("client_id", project.client_id)
      .order("sort"),
    db
      .from("plan_items")
      .select("id, title, due_date, status, description")
      .eq("project_id", project.id)
      .order("order"),
  ]);
  // Proyek khusus satu brand: hanya brand itu (filter brand tidak ditampilkan).
  const projectBrands = (brands ?? []).filter(
    (item) => !project.brand_id || item.id === project.brand_id,
  );
  const activeBrand = brand && projectBrands.some((item) => item.id === brand) ? brand : null;
  const base = `/client/projects/${project.id}`;
  const calendar = view === "calendar";
  const planView = view === "plan";
  const reportView = view === "report";
  const currentMonth = todayJakarta().slice(0, 7);
  const month = isMonth(monthParam) ? monthParam : currentMonth;
  const monthHref = (value: string) => `${base}?view=calendar&month=${value}`;
  const reportHref = (value: string) => `${base}?view=report&month=${value}`;
  const report = reportView
    ? await loadMonthlyReport(db, project.id, month, project.brand_id)
    : null;

  return (
    <div className="grid gap-6">
      <Link
        href="/client"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-ink/75 hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {text.backToProjects}
      </Link>
      {/* Logo + judul sebaris (status di bawah judul), keterangan selebar layar di bawahnya. */}
      <div className="grid gap-3">
        <div className="flex items-center gap-4">
          <ProjectAvatar title={project.title} logoPath={project.logo_path} size="lg" />
          <div className="grid min-w-0 flex-1 justify-items-start gap-2">
            <h1 className="text-2xl leading-tight break-words sm:text-3xl">{project.title}</h1>
            <StatusBadge kind="project" status={project.status} />
          </div>
        </div>
        <p className="max-w-2xl text-ink/75">
          {reportView
            ? "Rekap konten, persetujuan, dan postingan per bulan. Bisa diunduh sebagai PDF."
            : planView
              ? text.planSub
              : calendar
                ? text.calendarSub
                : text.contentSub}
        </p>
      </div>
      <ViewSwitch
        label="Tampilan proyek"
        active={reportView ? "report" : planView ? "plan" : calendar ? "calendar" : "list"}
        options={[
          { id: "list", label: "Konten", href: base },
          { id: "calendar", label: "Kalender", href: monthHref(month) },
          { id: "plan", label: "Rencana kerja", shortLabel: "Rencana", href: `${base}?view=plan` },
          { id: "report", label: "Laporan", href: reportHref(month) },
        ]}
      />
      {report ? (
        <MonthlyReport
          report={report}
          meta={{
            projectTitle: project.title,
            clientName: null,
            brandName: null,
            logoPath: project.logo_path,
          }}
          hrefs={{
            previous: reportHref(shiftMonth(month, -1)),
            next: reportHref(shiftMonth(month, 1)),
            current: reportHref(currentMonth),
          }}
          isCurrentMonth={month === currentMonth}
        />
      ) : planView ? (
        <PlanTimeline plan={plan ?? []} />
      ) : items.length === 0 ? (
        <EmptyState message={text.noContent} />
      ) : calendar ? (
        <ContentCalendar
          key={month}
          items={toCalendarItems(items, projectBrands)}
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
          brands={projectBrands}
          activeBrand={activeBrand}
          filterHref={(brandId) => (brandId ? `${base}?brand=${brandId}` : base)}
          itemHref={(contentId) => `${base}/content/${contentId}`}
        />
      )}
    </div>
  );
}
