import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { ProjectAvatar } from "@/components/atoms/ProjectAvatar";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { ReportPrint } from "@/components/molecules/ReportPrint";
import { formatLabels, workspaceText } from "@/content/workspace";
import { monthLabel } from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import type { MonthlyReport as Report } from "@/lib/report-data";
import { cn } from "@/lib/utils";

const planStatus = workspaceText.plan.statuses as Record<string, string>;

type ReportMeta = {
  projectTitle: string;
  clientName: string | null;
  /** Nama brand bila laporan dibatasi ke satu brand. */
  brandName: string | null;
  logoPath: string | null;
};

const days = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/** Isi laporan (dipakai di layar dan salinan cetak/PDF). */
function ReportDocument({ report, meta }: { report: Report; meta: ReportMeta }) {
  const { kpi } = report;
  const tiles = [
    { label: "Konten bulan ini", value: String(kpi.total) },
    { label: "Disetujui", value: `${kpi.approved}/${kpi.total}` },
    { label: "Sudah tayang", value: String(kpi.published) },
    {
      label: "Tayang sesuai jadwal",
      value: kpi.published ? `${Math.round((kpi.onTime / kpi.published) * 100)}%` : "–",
    },
    { label: "Putaran revisi", value: String(kpi.revisions) },
    {
      label: "Rata-rata sampai disetujui",
      value: kpi.avgApprovalDays === null ? "–" : `${days.format(kpi.avgApprovalDays)} hari`,
    },
  ];
  const planDone = report.plan.filter((item) => item.status === "done").length;

  return (
    <article className="report-doc grid min-w-0 grid-cols-1 gap-6 rounded-2xl border border-line bg-paper p-5 text-ink md:p-8">
      <header className="flex flex-wrap items-center gap-4 border-b border-line pb-5">
        <ProjectAvatar title={meta.projectTitle} logoPath={meta.logoPath} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">
            Laporan bulanan · {monthLabel(report.month)}
          </p>
          <h2 className="mt-1 text-2xl leading-tight break-words">{meta.projectTitle}</h2>
          <p className="text-sm text-ink/70">
            {[meta.clientName, meta.brandName].filter(Boolean).join(" · ")}
          </p>
        </div>
        <p className="font-heading text-lg font-bold tracking-tight">WeaveLens</p>
      </header>

      <section aria-label="Ringkasan angka" className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="report-keep rounded-xl border border-line p-4">
            <p className="text-sm text-ink/70">{tile.label}</p>
            <p className="mt-1 font-heading text-2xl font-bold">{tile.value}</p>
          </div>
        ))}
      </section>
      {kpi.waitingClient > 0 && (
        <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-ink">
          {kpi.waitingClient} konten sedang menunggu review dari klien.
        </p>
      )}

      <section aria-labelledby="report-content">
        <h3 id="report-content" className="mb-3 text-lg">
          Daftar konten
        </h3>
        {report.items.length === 0 ? (
          <p className="text-sm text-ink/70">Belum ada konten yang dijadwalkan di bulan ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs text-ink/65">
                <tr className="border-b border-line">
                  <th className="py-2 pr-3 font-semibold">Tayang</th>
                  <th className="py-2 pr-3 font-semibold">Konten</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Revisi</th>
                  <th className="py-2 font-semibold">Postingan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.items.map((item) => {
                  const late =
                    item.publishedOn && item.publishDate && item.publishedOn > item.publishDate;
                  return (
                    <tr key={item.id} className="report-keep align-top">
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {item.publishedOn
                          ? formatDate(item.publishedOn)
                          : item.publishDate
                            ? formatDate(item.publishDate)
                            : "–"}
                        {item.publishedOn ? null : item.publishDate ? (
                          <span className="block text-xs text-ink/60">rencana</span>
                        ) : null}
                        {late && <span className="block text-xs text-danger">lewat jadwal</span>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="block font-medium">{item.title}</span>
                        <span className="flex flex-wrap items-center gap-1.5 text-xs text-ink/65">
                          {item.brand && (
                            <span className="inline-flex items-center gap-1">
                              <span
                                aria-hidden
                                className="size-2 rounded-full"
                                style={{ backgroundColor: item.brand.color }}
                              />
                              {item.brand.name} ·
                            </span>
                          )}
                          {formatLabels[item.format]}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <StatusBadge kind="stage" status={item.stage} />
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">{item.revisions}</td>
                      <td className="py-2.5">
                        {item.publishedUrl ? (
                          <a
                            href={item.publishedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                          >
                            Lihat
                            <ExternalLink aria-hidden className="size-3.5" />
                          </a>
                        ) : (
                          <span className="text-ink/50">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {report.plan.length > 0 && (
        <section aria-labelledby="report-plan" className="report-keep">
          <h3 id="report-plan" className="mb-1 text-lg">
            Rencana kerja bulan ini
          </h3>
          <p className="mb-3 text-sm text-ink/70">
            {planDone} dari {report.plan.length} tahap selesai
          </p>
          <ul className="grid gap-1.5 text-sm">
            {report.plan.map((item, index) => (
              <li key={`${item.title}-${index}`} className="flex flex-wrap justify-between gap-2">
                <span className={cn(item.status === "done" && "text-ink/60 line-through")}>
                  {item.title}
                </span>
                <span className="text-ink/65">
                  {planStatus[item.status] ?? item.status}
                  {item.dueDate && ` · ${formatDate(item.dueDate)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t border-line pt-4 text-xs text-ink/60">
        Disusun otomatis oleh portal WeaveLens · weavelens.id
      </footer>
    </article>
  );
}

type MonthlyReportProps = {
  report: Report;
  meta: ReportMeta;
  hrefs: { previous: string; next: string; current: string };
  isCurrentMonth: boolean;
};

/** Laporan bulanan: navigasi bulan, unduh PDF, lalu isi laporan. */
export function MonthlyReport({ report, meta, hrefs, isCurrentMonth }: MonthlyReportProps) {
  const doc = <ReportDocument report={report} meta={meta} />;
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Pilih bulan" className="flex items-center gap-1">
          <Link
            href={hrefs.previous}
            aria-label="Bulan sebelumnya"
            className="inline-flex size-9 items-center justify-center rounded-md border border-line bg-paper hover:border-ink"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Link>
          <p className="min-w-36 text-center font-heading font-semibold capitalize">
            {monthLabel(report.month)}
          </p>
          <Link
            href={hrefs.next}
            aria-label="Bulan berikutnya"
            className="inline-flex size-9 items-center justify-center rounded-md border border-line bg-paper hover:border-ink"
          >
            <ChevronRight aria-hidden className="size-4" />
          </Link>
          {!isCurrentMonth && (
            <Link
              href={hrefs.current}
              className="ml-2 text-sm font-medium text-ink/70 underline-offset-4 hover:underline"
            >
              Bulan ini
            </Link>
          )}
        </nav>
        <ReportPrint>{doc}</ReportPrint>
      </div>
      {doc}
    </div>
  );
}
