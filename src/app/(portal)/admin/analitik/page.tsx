import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { StatTile } from "@/components/atoms/StatTile";
import { BarList } from "@/components/molecules/BarList";
import { PageHeader } from "@/components/molecules/PageHeader";
import { RangeFilter } from "@/components/molecules/RangeFilter";
import { TrendChart } from "@/components/organisms/TrendChart";
import { site } from "@/content/site";
import { requireAdmin } from "@/lib/auth";
import { loadAnalytics, parseRange, RANGES, type Overview } from "@/lib/analytics-data";
import {
  buildInsights,
  conversionRate,
  deviceLabel,
  sectionLabel,
  type Insight,
} from "@/lib/analytics-insights";
import { getCms } from "@/lib/cms/data";
import { cn } from "@/lib/utils";

type PageProps = { searchParams: Promise<{ hari?: string }> };

const number = new Intl.NumberFormat("id-ID");

function change(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

const insightStyle: Record<Insight["tone"], { icon: typeof Info; className: string }> = {
  good: { icon: CircleCheck, className: "text-success" },
  attention: { icon: CircleAlert, className: "text-danger" },
  info: { icon: Info, className: "text-primary" },
};

function tiles(current: Overview, previous: Overview) {
  const rate = conversionRate(current);
  const previousRate = conversionRate(previous);
  return [
    {
      label: "Pengunjung",
      value: number.format(current.visitors),
      delta: change(current.visitors, previous.visitors),
      hint: "Dihitung unik per hari, tanpa cookie.",
    },
    {
      label: "Halaman dilihat",
      value: number.format(current.pageviews),
      delta: change(current.pageviews, previous.pageviews),
    },
    {
      label: "Klik WhatsApp",
      value: number.format(current.ctaClicks),
      delta: change(current.ctaClicks, previous.ctaClicks),
    },
    {
      label: "Konversi ke WhatsApp",
      value: `${rate.toFixed(1)}%`,
      delta: previous.visitors ? Math.round((rate - previousRate) * 10) / 10 : null,
      deltaUnit: " poin",
      hint: "Pengunjung yang mengklik WhatsApp.",
    },
  ];
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const { hari } = await searchParams;
  const days = parseRange(hari);
  const { supabase } = await requireAdmin();
  const [data, cms] = await Promise.all([loadAnalytics(supabase, days), getCms()]);

  const adminName = (id: string) => {
    const index = cms.admins.findIndex((admin) => admin.id === id);
    return index >= 0 ? site.wa.chooser.adminLabel(index) : "Tidak diketahui";
  };
  const insights = buildInsights(data);

  return (
    <>
      <PageHeader
        title="Analitik website"
        description={`Kunjungan ke ${site.url.replace("https://", "")} dan klik tombol WhatsApp. Tim yang sedang login tidak ikut dihitung.`}
        actions={<RangeFilter basePath="/admin/analitik" options={RANGES} value={days} />}
      />

      {data.failed && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          Data analitik belum bisa dimuat. Pastikan migrasi 0003 sudah dijalankan (npm run db:push).
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles(data.current, data.previous).map((tile) => (
          <StatTile key={tile.label} {...tile} />
        ))}
      </div>

      <section
        aria-labelledby="insight-heading"
        className="mt-6 rounded-2xl border border-line bg-paper p-5"
      >
        <h2 id="insight-heading" className="text-base">
          Rekomendasi minggu ini
        </h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {insights.map((insight) => {
            const { icon: Icon, className } = insightStyle[insight.tone];
            return (
              <li key={insight.title} className="flex gap-3">
                <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", className)} />
                <div>
                  <p className="font-heading font-semibold text-ink">{insight.title}</p>
                  <p className="mt-1 text-sm text-ink/75">{insight.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TrendChart
          title="Pengunjung per hari"
          valueLabel="Pengunjung"
          points={data.daily.map((point) => ({ day: point.day, value: point.visitors }))}
        />
        <TrendChart
          title="Klik WhatsApp per hari"
          valueLabel="Klik"
          kind="bar"
          points={data.daily.map((point) => ({ day: point.day, value: point.ctaClicks }))}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <BarList
          title="Sumber kunjungan"
          valueLabel="pengunjung · klik WA"
          empty="Belum ada kunjungan."
          rows={data.sources.map((row) => ({
            label: row.label,
            value: row.visitors,
            secondary: `${row.ctaClicks} klik`,
          }))}
        />
        <BarList
          title="Halaman paling dilihat"
          valueLabel="dilihat"
          empty="Belum ada kunjungan."
          rows={data.pages.map((row) => ({ label: row.label, value: row.pageviews }))}
        />
        <BarList
          title="Tombol WhatsApp yang diklik"
          valueLabel="klik"
          empty="Belum ada klik WhatsApp."
          rows={data.sections.map((row) => ({
            label: sectionLabel(row.label),
            value: row.ctaClicks,
          }))}
        />
        <BarList
          title="Admin yang dipilih"
          valueLabel="klik"
          empty="Belum ada klik WhatsApp."
          rows={data.admins.map((row) => ({ label: adminName(row.label), value: row.ctaClicks }))}
        />
        <BarList
          title="Perangkat"
          valueLabel="pengunjung"
          empty="Belum ada kunjungan."
          rows={data.devices.map((row) => ({ label: deviceLabel(row.label), value: row.visitors }))}
        />
        <BarList
          title="Kota"
          valueLabel="pengunjung"
          empty="Belum ada kunjungan."
          rows={data.cities.map((row) => ({ label: row.label, value: row.visitors }))}
        />
      </div>
    </>
  );
}
