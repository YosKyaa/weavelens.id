import "server-only";
import { gzipSync } from "node:zlib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { emailConfigured } from "@/lib/email";
import { todayJakarta } from "@/lib/format";
import { emailErrorDigest, emailReviewReminder, emailTaskDigest } from "@/lib/notify";
import type { Database } from "@/types/database";

/** Tugas harian (dipanggil Vercel Cron lewat /api/cron/daily). Semua memakai klien service role. */

type Db = SupabaseClient<Database>;
type TableName = keyof Database["public"]["Tables"];

const DAY = 86_400_000;

/**
 * Pengingat review: versi terbaru yang menunggu klien > 2 hari. Diingatkan sekali, lalu sekali
 * lagi setiap 4 hari selama versi itu belum berumur 2 minggu (tidak mengganggu tanpa henti).
 */
export async function remindPendingReviews(db: Db) {
  if (!emailConfigured()) return { skipped: "email belum aktif" };
  const now = Date.now();
  const { data } = await db
    .from("design_versions")
    .select(
      "id, asset_id, version_no, created_at, reminded_at, design_assets!inner(project_id, stage)",
    )
    .eq("status", "pending_review")
    .eq("design_assets.stage", "client_review")
    .lt("created_at", new Date(now - 2 * DAY).toISOString())
    .gt("created_at", new Date(now - 14 * DAY).toISOString());

  // Hanya versi terbaru per konten.
  const latest = new Map<string, NonNullable<typeof data>[number]>();
  for (const row of data ?? []) {
    const current = latest.get(row.asset_id);
    if (!current || row.version_no > current.version_no) latest.set(row.asset_id, row);
  }
  const due = [...latest.values()].filter(
    (row) => !row.reminded_at || Date.parse(row.reminded_at) < now - 4 * DAY,
  );

  const byProject = new Map<string, typeof due>();
  for (const row of due) {
    const projectId = row.design_assets.project_id;
    byProject.set(projectId, [...(byProject.get(projectId) ?? []), row]);
  }

  let sent = 0;
  for (const [projectId, rows] of byProject) {
    const oldest = Math.min(...rows.map((row) => Date.parse(row.created_at)));
    const ok = await emailReviewReminder(db, {
      projectId,
      contentIds: rows.map((row) => row.asset_id),
      waitingDays: Math.max(2, Math.floor((now - oldest) / DAY)),
    });
    if (!ok) continue;
    sent += 1;
    await db
      .from("design_versions")
      .update({ reminded_at: new Date().toISOString() })
      .in(
        "id",
        rows.map((row) => row.id),
      );
  }
  return { projects: sent, designs: due.length };
}

/** Ringkasan pagi untuk tiap anggota tim: tugas lewat tenggat + jatuh tempo hari ini/besok. */
export async function sendTaskDigests(db: Db) {
  if (!emailConfigured()) return { skipped: "email belum aktif" };
  const today = todayJakarta();
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + DAY).toISOString().slice(0, 10);
  const [{ data: tasks }, { data: staff }] = await Promise.all([
    db
      .from("design_assets")
      .select("id, title, due_date, assignee_id, projects!inner(id, status)")
      .not("assignee_id", "is", null)
      .not("due_date", "is", null)
      .lte("due_date", tomorrow)
      .not("stage", "in", "(approved,published)")
      .not("projects.status", "in", "(closed,draft)"),
    db.from("profiles").select("id, full_name").in("role", ["admin", "team"]).eq("active", true),
  ]);
  const names = new Map((staff ?? []).map((row) => [row.id, row.full_name ?? ""]));
  const byPerson = new Map<string, NonNullable<typeof tasks>>();
  for (const task of tasks ?? []) {
    if (!task.assignee_id || !names.has(task.assignee_id)) continue;
    byPerson.set(task.assignee_id, [...(byPerson.get(task.assignee_id) ?? []), task]);
  }
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.weavelens.id").replace(
    /\/$/,
    "",
  );
  for (const [profileId, list] of byPerson) {
    const toItem = (task: (typeof list)[number]) => ({
      title: task.title,
      due: task.due_date!,
      href: `${origin}/admin/projects/${task.projects.id}/content/${task.id}`,
    });
    await emailTaskDigest(db, {
      profileId,
      name: names.get(profileId) ?? "",
      overdue: list.filter((task) => task.due_date! < today).map(toItem),
      upcoming: list.filter((task) => task.due_date! >= today).map(toItem),
    });
  }
  return { people: byPerson.size };
}

/** Tabel yang dicadangkan (statistik kunjungan & log error tidak ikut: besar dan tidak kritis). */
const BACKUP_TABLES: TableName[] = [
  "profiles",
  "team_roles",
  "profile_team_roles",
  "cms_admins",
  "wa_admins",
  "clients",
  "brands",
  "brand_files",
  "projects",
  "project_members",
  "plan_items",
  "design_assets",
  "design_versions",
  "design_comments",
  "share_links",
  "photo_sets",
  "photos",
  "photo_selections",
  "invoices",
  "invoice_items",
  "invoice_counters",
  "company_settings",
  "activity_log",
  "services",
  "pricing_plans",
  "portfolio_images",
  "testimonials",
  "faqs",
  "partners",
  "site_contact",
];
const KEEP_BACKUPS = 30;

async function dumpTable(db: Db, table: TableName): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

/**
 * Cadangan harian seluruh data portal & website (JSON terkompresi) ke bucket privat `backups`,
 * menyimpan 30 hari terakhir. File desain/foto tidak ikut (sudah ada di Storage/Drive).
 */
export async function backupDatabase(db: Db) {
  const tables: Record<string, unknown[]> = {};
  for (const table of BACKUP_TABLES) tables[table] = await dumpTable(db, table);
  const body = gzipSync(
    JSON.stringify({ version: 1, created_at: new Date().toISOString(), tables }),
  );
  const name = `daily/${todayJakarta()}.json.gz`;
  const { error } = await db.storage
    .from("backups")
    .upload(name, body, { contentType: "application/gzip", upsert: true });
  if (error) throw new Error(`upload: ${error.message}`);

  const { data: files } = await db.storage
    .from("backups")
    .list("daily", { limit: 1000, sortBy: { column: "name", order: "desc" } });
  const old = (files ?? []).slice(KEEP_BACKUPS).map((file) => `daily/${file.name}`);
  if (old.length) await db.storage.from("backups").remove(old);
  return {
    file: name,
    bytes: body.length,
    rows: Object.values(tables).reduce((sum, rows) => sum + rows.length, 0),
    removed: old.length,
  };
}

/** Ringkasan error 24 jam ke admin, lalu buang log yang lebih tua dari 30 hari. */
export async function digestErrors(db: Db) {
  const since = new Date(Date.now() - DAY).toISOString();
  const { data, count } = await db
    .from("error_events")
    .select("message", { count: "exact" })
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);
  const samples = [...new Set((data ?? []).map((row) => row.message.slice(0, 120)))].slice(0, 3);
  await emailErrorDigest(db, { count: count ?? 0, samples });
  await db
    .from("error_events")
    .delete()
    .lt("created_at", new Date(Date.now() - 30 * DAY).toISOString());
  return { errors: count ?? 0 };
}
