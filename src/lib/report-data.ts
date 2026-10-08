import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FORMATS, STAGES, type ContentFormat, type Stage } from "@/content/workspace";
import { shiftMonth } from "@/lib/calendar";
import type { Database } from "@/types/database";

export type ReportItem = {
  id: string;
  title: string;
  brand: { name: string; color: string } | null;
  format: ContentFormat;
  stage: Stage;
  publishDate: string | null;
  /** Tanggal tayang sebenarnya (YYYY-MM-DD, Jakarta). */
  publishedOn: string | null;
  publishedUrl: string | null;
  versions: number;
  revisions: number;
  approvedOn: string | null;
};

export type MonthlyReport = {
  month: string;
  items: ReportItem[];
  kpi: {
    total: number;
    approved: number;
    published: number;
    onTime: number;
    waitingClient: number;
    revisions: number;
    /** Rata-rata hari dari versi pertama diunggah sampai disetujui; null bila belum ada. */
    avgApprovalDays: number | null;
  };
  plan: { title: string; dueDate: string | null; status: string }[];
};

const jakartaDay = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(iso));

/**
 * Rekap satu bulan untuk klien: konten yang dijadwalkan tayang atau tayang di bulan itu
 * (tanpa tanggal tayang → pakai tenggat), angka persetujuan/revisi, dan tahapan rencana kerja.
 * `brandId` membatasi ke satu brand (link klien per brand).
 */
export async function loadMonthlyReport(
  db: SupabaseClient<Database>,
  projectId: string,
  month: string,
  brandId: string | null = null,
): Promise<MonthlyReport> {
  let query = db
    .from("design_assets")
    .select(
      "id, title, stage, format, publish_date, due_date, published_at, published_url, brands(name, color), design_versions(version_no, status, created_at, decided_at)",
    )
    .eq("project_id", projectId);
  if (brandId) query = query.eq("brand_id", brandId);
  const [{ data }, { data: plan }] = await Promise.all([
    query,
    db
      .from("plan_items")
      .select("title, due_date, status")
      .eq("project_id", projectId)
      .gte("due_date", `${month}-01`)
      .lt("due_date", `${shiftMonth(month, 1)}-01`)
      .order("order"),
  ]);

  const items: ReportItem[] = [];
  const approvalDays: number[] = [];
  for (const row of data ?? []) {
    const publishedOn = row.published_at ? jakartaDay(row.published_at) : null;
    const anchor = row.publish_date ?? row.due_date;
    const inMonth = anchor?.startsWith(month) || publishedOn?.startsWith(month);
    if (!inMonth) continue;
    const versions = [...row.design_versions].sort((a, b) => a.version_no - b.version_no);
    const approved = [...versions].reverse().find((version) => version.status === "approved");
    if (approved?.decided_at && versions[0]) {
      approvalDays.push(
        (Date.parse(approved.decided_at) - Date.parse(versions[0].created_at)) / 86_400_000,
      );
    }
    items.push({
      id: row.id,
      title: row.title,
      brand: row.brands,
      format: (FORMATS as readonly string[]).includes(row.format)
        ? (row.format as ContentFormat)
        : "other",
      stage: (STAGES as readonly string[]).includes(row.stage) ? (row.stage as Stage) : "brief",
      publishDate: row.publish_date,
      publishedOn,
      publishedUrl: row.published_url,
      versions: versions.length,
      revisions: versions.filter((version) => version.status === "changes_requested").length,
      approvedOn: approved?.decided_at ? jakartaDay(approved.decided_at) : null,
    });
  }
  items.sort(
    (a, b) =>
      (a.publishedOn ?? a.publishDate ?? "9").localeCompare(
        b.publishedOn ?? b.publishDate ?? "9",
      ) || a.title.localeCompare(b.title),
  );

  const published = items.filter((item) => item.stage === "published" || item.publishedOn);
  return {
    month,
    items,
    kpi: {
      total: items.length,
      approved: items.filter((item) => item.stage === "approved" || item.stage === "published")
        .length,
      published: published.length,
      onTime: published.filter(
        (item) => !item.publishDate || !item.publishedOn || item.publishedOn <= item.publishDate,
      ).length,
      waitingClient: items.filter((item) => item.stage === "client_review").length,
      revisions: items.reduce((sum, item) => sum + item.revisions, 0),
      avgApprovalDays: approvalDays.length
        ? approvalDays.reduce((sum, value) => sum + value, 0) / approvalDays.length
        : null,
    },
    plan: (plan ?? []).map((item) => ({
      title: item.title,
      dueDate: item.due_date,
      status: item.status,
    })),
  };
}
