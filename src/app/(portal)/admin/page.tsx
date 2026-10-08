import Link from "next/link";
import { BarChart3, FilePlus2, FolderPlus, LayoutTemplate } from "lucide-react";
import { DateText } from "@/components/atoms/DateText";
import { StatTile } from "@/components/atoms/StatTile";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { InboxSection, type InboxRow } from "@/components/molecules/InboxSection";
import { PageHeader } from "@/components/molecules/PageHeader";
import { portal, projectTypes } from "@/content/portal";
import { rangeWindow } from "@/lib/analytics-data";
import { conversionRate } from "@/lib/analytics-insights";
import { can, requireStaff } from "@/lib/auth";
import { deadlineClass, deadlineOf } from "@/lib/deadline";
import { formatDate, todayJakarta } from "@/lib/format";
import { cn } from "@/lib/utils";
import { computeTotals, formatRupiah } from "@/lib/invoice";

const text = portal.adminHome;
const ACTIVE_STATUSES = ["active", "in_review", "revision", "approved"];
const number = new Intl.NumberFormat("id-ID");

const quickActions = [
  {
    href: "/admin/projects/new",
    label: "Buat proyek",
    icon: FolderPlus,
    permission: "projects.manage",
  },
  { href: "/admin/invoices/new", label: "Buat invoice", icon: FilePlus2, permission: "admin" },
  { href: "/admin/analytics", label: "Lihat analitik", icon: BarChart3, permission: "analytics" },
  { href: "/admin/cms", label: "Ubah konten website", icon: LayoutTemplate, permission: "cms" },
] as const;

/** Ringkasan: angka 7 hari terakhir, jalan pintas, lalu daftar yang menunggu tindakan. */
export default async function AdminHomePage() {
  const session = await requireStaff();
  const { supabase, profile, user } = session;
  const isAdmin = profile.role === "admin";
  const seesAnalytics = can(session, "analytics");
  const actions = quickActions.filter((action) =>
    action.permission === "admin" ? isAdmin : can(session, action.permission),
  );
  const none = { data: null, error: null };
  const today = todayJakarta();
  const week = rangeWindow(7);
  const weekAhead = new Date(`${today}T00:00:00Z`);
  weekAhead.setUTCDate(weekAhead.getUTCDate() + 7);

  const [traffic, unpaid, revisions, selections, active, deadlines, mine] = await Promise.all([
    // Data tanpa izin tidak di-query sama sekali (lebih cepat, dan memang tidak boleh terlihat).
    seesAnalytics ? supabase.rpc("analytics_overview", { p_from: week.from, p_to: week.to }) : none,
    !isAdmin
      ? none
      : supabase
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
    // Konten yang tenggatnya lewat atau jatuh dalam 7 hari ke depan (RLS: hanya proyek yang boleh).
    supabase
      .from("design_assets")
      .select("id, title, stage, due_date, projects!inner(id, title, status, clients(name))")
      .not("due_date", "is", null)
      .lte("due_date", weekAhead.toISOString().slice(0, 10))
      .not("stage", "in", "(approved,published)")
      .order("due_date")
      .limit(30),
    // Tugas yang ditugaskan ke saya: lewat tenggat atau jatuh dalam 7 hari ke depan.
    supabase
      .from("design_assets")
      .select("id, title, stage, due_date, projects!inner(id, title, status, clients(name))")
      .eq("assignee_id", user.id)
      .not("due_date", "is", null)
      .lte("due_date", weekAhead.toISOString().slice(0, 10))
      .not("stage", "in", "(approved,published)")
      .order("due_date")
      .limit(20),
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
      href: `/admin/invoices/${invoice.id}`,
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
      href: `/admin/projects/${row.design_assets.projects.id}/content/${row.asset_id}`,
      title: text.revisions.item(row.design_assets.title, row.version_no),
      meta: [row.design_assets.projects.clients?.name, row.design_assets.projects.title]
        .filter(Boolean)
        .join(" · "),
      aside: <StatusBadge kind="design" status="changes_requested" />,
    }));

  const selectionRows: InboxRow[] = (selections.data ?? []).map((row) => ({
    id: row.id,
    href: `/admin/galleries/${row.id}`,
    title: row.title,
    meta: [row.projects.clients?.name, row.projects.title].filter(Boolean).join(" · "),
    aside: <StatusBadge kind="photoSet" status="selection_closed" />,
  }));

  const activeRows: InboxRow[] = (active.data ?? []).map((row) => ({
    id: row.id,
    href: `/admin/projects/${row.id}`,
    title: row.title,
    meta: [row.clients?.name, projectTypes[row.type]].filter(Boolean).join(" · "),
    aside: (
      <span className="flex items-center gap-3 text-sm text-ink/70">
        <DateText value={row.event_date} />
        <StatusBadge kind="project" status={row.status} />
      </span>
    ),
  }));

  const toDeadlineRow = (row: NonNullable<typeof deadlines.data>[number]): InboxRow => {
    const due = deadlineOf(row.due_date!, today, false);
    return {
      id: row.id,
      href: `/admin/projects/${row.projects.id}/content/${row.id}`,
      title: row.title,
      meta: [row.projects.clients?.name, row.projects.title].filter(Boolean).join(" · "),
      aside: (
        <span
          className={cn(
            "inline-flex h-6 items-center rounded-full px-2.5 text-xs whitespace-nowrap",
            deadlineClass[due.tone],
          )}
        >
          {due.label}
        </span>
      ),
    };
  };
  const myRows: InboxRow[] = (mine.data ?? [])
    .filter((row) => row.projects.status !== "closed" && row.due_date)
    .map(toDeadlineRow);
  const deadlineRows: InboxRow[] = (deadlines.data ?? [])
    .filter((row) => row.projects.status !== "closed" && row.due_date)
    .map(toDeadlineRow);

  const firstName = (profile.full_name ?? "").split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Halo, ${firstName}` : "Ringkasan"}
        description={
          isAdmin || seesAnalytics
            ? "Angka 7 hari terakhir dan hal yang menunggu tindak lanjut."
            : "Pekerjaan di proyek yang ditugaskan kepadamu."
        }
      />

      {(isAdmin || seesAnalytics) && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {seesAnalytics && (
            <>
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
            </>
          )}
          {isAdmin && (
            <StatTile
              label="Invoice belum dibayar"
              value={formatRupiah(unpaidRows.reduce((sum, invoice) => sum + invoice.total, 0))}
              hint={`${unpaidRows.length} invoice · ${overdueRows.length} lewat jatuh tempo`}
            />
          )}
          <StatTile label="Proyek berjalan" value={number.format(activeRows.length)} />
        </div>
      )}

      {actions.length > 0 && (
        <nav aria-label="Jalan pintas" className="mt-6 flex flex-wrap gap-2">
          {actions.map(({ href, label, icon: Icon }) => (
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
      )}

      <h2
        className={
          isAdmin || seesAnalytics || actions.length ? "mt-10 mb-4 text-xl" : "mb-4 text-xl"
        }
      >
        {text.heading}
      </h2>
      <div className="grid gap-8 xl:grid-cols-2">
        {isAdmin && (
          <InboxSection
            heading={text.overdue.heading}
            empty={text.overdue.empty}
            rows={overdueRows}
          />
        )}
        {myRows.length > 0 && (
          <InboxSection heading="Tugas saya minggu ini" empty="" rows={myRows} />
        )}
        <InboxSection
          heading={text.revisions.heading}
          empty={text.revisions.empty}
          rows={revisionRows}
        />
        <InboxSection
          heading={text.deadlines.heading}
          empty={text.deadlines.empty}
          rows={deadlineRows}
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
