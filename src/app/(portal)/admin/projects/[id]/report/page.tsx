import { notFound } from "next/navigation";
import { MonthlyReport } from "@/components/organisms/MonthlyReport";
import { requireStaff } from "@/lib/auth";
import { isMonth, shiftMonth } from "@/lib/calendar";
import { todayJakarta } from "@/lib/format";
import { loadMonthlyReport } from "@/lib/report-data";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
};

/** Laporan bulanan proyek — sama dengan yang dilihat klien di portal & link klien. */
export default async function ProjectReportPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { month: monthParam } = await searchParams;
  const { supabase } = await requireStaff();
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, logo_path, clients(name), brands!projects_brand_id_fkey(name)")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const current = todayJakarta().slice(0, 7);
  const month = isMonth(monthParam) ? monthParam : current;
  const report = await loadMonthlyReport(supabase, id, month);
  const href = (value: string) => `/admin/projects/${id}/report?month=${value}`;

  return (
    <div className="grid gap-4">
      <p className="max-w-2xl text-sm text-ink/75">
        Klien melihat laporan yang sama di portal dan link klien (menu Laporan). Unduh PDF untuk
        dikirim lewat WhatsApp atau email.
      </p>
      <MonthlyReport
        report={report}
        meta={{
          projectTitle: project.title,
          clientName: project.clients?.name ?? null,
          brandName: project.brands?.name ?? null,
          logoPath: project.logo_path,
        }}
        hrefs={{
          previous: href(shiftMonth(month, -1)),
          next: href(shiftMonth(month, 1)),
          current: href(current),
        }}
        isCurrentMonth={month === current}
      />
    </div>
  );
}
