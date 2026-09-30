import Link from "next/link";
import { BarChart3, FilePlus2, LayoutTemplate } from "lucide-react";
import { DateText } from "@/components/atoms/DateText";
import { StatTile } from "@/components/atoms/StatTile";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { InboxSection, type InboxRow } from "@/components/molecules/InboxSection";
import { PageHeader } from "@/components/molecules/PageHeader";
import { portal, projectTypes } from "@/content/portal";
import { rangeWindow } from "@/lib/analytics-data";
import { conversionRate } from "@/lib/analytics-insights";
import { requireAdmin } from "@/lib/auth";
import { formatDate, todayJakarta } from "@/lib/format";
import { computeTotals, formatRupiah } from "@/lib/invoice";

const text = portal.adminHome;
const ACTIVE_STATUSES = ["active", "in_review", "revision", "approved"];
const number = new Intl.NumberFormat("id-ID");

const quickActions = [
  { href: "/admin/invoice/baru", label: "Buat invoice", icon: FilePlus2 },
  { href: "/admin/analitik", label: "Lihat analitik", icon: BarChart3 },
  { href: "/admin/konten", label: "Ubah konten website", icon: LayoutTemplate },
];

/** Ringkasan: angka 7 hari terakhir, jalan pintas, lalu daftar yang menunggu tindakan. */
export default async function AdminHomePage() {
  const { supabase, profile } = await requireAdmin();
  const today = todayJakarta();
  const week = rangeWindow(7);

  const [traffic, unpaid, revisions, selections, active] = await Promise.all([
    supabase.rpc("analytics_overview", { p_from: week.from, p_to: week.to }),
    supabase
      .from("invoices")
      .select(
        "id, number, due_date, discount, tax_rate, bill_to_name, clients(name), invoice_items(qty, unit_price)",
      )
      .eq("status", "sent")
      .order("due_date"),
    supabase
      .from("design_versions")
      .select(
        "id, asset_id, version_no, design_assets!inner(title, projects!inner(id, title, clients(name)))",
      )
      .eq("status", "changes_requested")
      .order("created_at", { ascending: false }),
    supabase
      .from("photo_sets")
      .select("id, title, projects!inner(id, title, clients(name))")
      .eq("status", "selection_closed")
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, title, type, event_date, status, clients(name)")
      .in("status", ACTIVE_STATUSES)
      .order("event_date", { ascending: true, nullsFirst: false }),
  ]);

  // Revisi hanya menunggu jika versi itu masih yang terbaru untuk asset-nya.
  const assetIds = [...new Set((revisions.data ?? []).map((row) => row.asset_id))];
  const { data: versions } = assetIds.length
    ? await supabase.from("design_versions").select("asset_id, version_no").in("asset_id", assetIds)
    : { data: [] };
  const latest = new Map<string, number>();
  for (const version of versions ?? []) {
    latest.set(version.asset_id, Math.max(latest.get(version.asset_id) ?? 0, version.version_no));
  }

  const visits = traffic.data?.[0];
  const overview = {
    visitors: Number(visits?.visitors ?? 0),
    pageviews: Number(visits?.pageviews ?? 0),
    ctaClicks: Number(visits?.cta_clicks ?? 0),
    ctaVisitors: Number(visits?.cta_visitors ?? 0),
  };

  const unpaidRows = (unpaid.data ?? []).map((invoice) => ({
    ...invoice,
    total: computeTotals(
      invoice.invoice_items.map((item) => ({ qty: item.qty, unitPrice: item.unit_price })),
      invoice.discount,
      invoice.tax_rate,
    ).total,
  }));
  const overdueRows: InboxRow[] = unpaidRows
    .filter((invoice) => invoice.due_date < today)
    .map((invoice) => ({
      id: invoice.id,
      href: `/admin/invoice/${invoice.id}`,
      title: `${invoice.number} · ${formatRupiah(invoice.total)}`,
      meta: [
        invoice.bill_to_name || invoice.clients?.name,
        text.overdue.due(formatDate(invoice.due_date)),
      ]
        .filter(Boolean)
        .join(" · "),
      aside: <StatusBadge kind="invoice" status="sent" />,
    }));

  const revisionRows: InboxRow[] = (revisions.data ?? [])
    .filter((row) => latest.get(row.asset_id) === row.version_no)
    .map((row) => ({
      id: row.id,
      title: text.revisions.item(row.design_assets.title, row.version_no),
      meta: [row.design_assets.projects.clients?.name, row.design_assets.projects.title]
        .filter(Boolean)
        .join(" · "),
      aside: <StatusBadge kind="design" status="changes_requested" />,
    }));

  const selectionRows: InboxRow[] = (selections.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    meta: [row.projects.clients?.name, row.projects.title].filter(Boolean).join(" · "),
    aside: <StatusBadge kind="photoSet" status="selection_closed" />,
  }));

  const activeRows: InboxRow[] = (active.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    meta: [row.clients?.name, projectTypes[row.type]].filter(Boolean).join(" · "),
    aside: (
      <span className="flex items-center gap-3 text-sm text-ink/70">
        <DateText value={row.event_date} />
        <StatusBadge kind="project" status={row.status} />
      </span>
    ),
  }));

  const firstName = (profile.full_name ?? "").split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Halo, ${firstName}` : "Ringkasan"}
        description="Angka 7 hari terakhir dan hal yang menunggu tindak lanjut."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Pengunjung website"
          value={number.format(overview.visitors)}
          hint="7 hari terakhir"
        />
        <StatTile
          label="Klik WhatsApp"
          value={number.format(overview.ctaClicks)}
          hint={`Konversi ${conversionRate(overview).toFixed(1)}%`}
        />
        <StatTile
          label="Invoice belum dibayar"
          value={formatRupiah(unpaidRows.reduce((sum, invoice) => sum + invoice.total, 0))}
          hint={`${unpaidRows.length} invoice · ${overdueRows.length} lewat jatuh tempo`}
        />
        <StatTile label="Proyek berjalan" value={number.format(activeRows.length)} />
      </div>

      <nav aria-label="Jalan pintas" className="mt-6 flex flex-wrap gap-2">
        {quickActions.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-paper px-4 text-sm font-medium text-ink transition-colors hover:border-sand-deep hover:bg-sand/40"
          >
            <Icon aria-hidden className="size-4 text-primary" />
            {label}
          </Link>
        ))}
      </nav>

      <h2 className="mt-10 mb-4 text-xl">{text.heading}</h2>
      <div className="grid gap-8 xl:grid-cols-2">
        <InboxSection
          heading={text.overdue.heading}
          empty={text.overdue.empty}
          rows={overdueRows}
        />
        <InboxSection
          heading={text.revisions.heading}
          empty={text.revisions.empty}
          rows={revisionRows}
        />
        <InboxSection
          heading={text.selections.heading}
          empty={text.selections.empty}
          rows={selectionRows}
        />
        <InboxSection heading={text.active.heading} empty={text.active.empty} rows={activeRows} />
      </div>
    </>
  );
}
