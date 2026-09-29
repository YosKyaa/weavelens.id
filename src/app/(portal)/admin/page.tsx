import { DateText } from "@/components/atoms/DateText";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { InboxSection, type InboxRow } from "@/components/molecules/InboxSection";
import { portal, projectTypes } from "@/content/portal";
import { requireAdmin } from "@/lib/auth";
import { formatDate, todayJakarta } from "@/lib/format";

const text = portal.adminHome;
const ACTIVE_STATUSES = ["active", "in_review", "revision", "approved"];

/** Dashboard admin = daftar "yang menunggu saya", bukan grafik (SPEC-PORTAL A7). */
export default async function AdminHomePage() {
  const { supabase } = await requireAdmin();
  const today = todayJakarta();

  const [revisions, selections, overdue, active] = await Promise.all([
    supabase
      .from("design_versions")
      .select(
        "id, asset_id, version_no, design_assets!inner(title, projects!inner(title, clients(name)))",
      )
      .eq("status", "changes_requested")
      .order("created_at", { ascending: false }),
    supabase
      .from("photo_sets")
      .select("id, title, projects!inner(title, clients(name))")
      .eq("status", "selection_closed")
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, number, due_date, clients(name)")
      .eq("status", "sent")
      .lt("due_date", today)
      .order("due_date"),
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

  const overdueRows: InboxRow[] = (overdue.data ?? []).map((row) => ({
    id: row.id,
    title: row.number,
    meta: [row.clients?.name, text.overdue.due(formatDate(row.due_date))]
      .filter(Boolean)
      .join(" · "),
    aside: <StatusBadge kind="invoice" status="sent" />,
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

  return (
    <>
      <h1 className="text-3xl">{text.heading}</h1>
      <p className="mt-2 max-w-[60ch] text-ink/80">{text.sub}</p>
      <div className="mt-8 grid gap-10">
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
        <InboxSection
          heading={text.overdue.heading}
          empty={text.overdue.empty}
          rows={overdueRows}
        />
        <InboxSection heading={text.active.heading} empty={text.active.empty} rows={activeRows} />
      </div>
    </>
  );
}
