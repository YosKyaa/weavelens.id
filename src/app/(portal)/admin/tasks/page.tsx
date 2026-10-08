import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/atoms/EmptyState";
import { PersonBadge } from "@/components/atoms/PersonBadge";
import { ProjectAvatar } from "@/components/atoms/ProjectAvatar";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { PageHeader } from "@/components/molecules/PageHeader";
import { formatLabels, FORMATS, type ContentFormat } from "@/content/workspace";
import { can, requireStaff } from "@/lib/auth";
import { deadlineClass, deadlineOf } from "@/lib/deadline";
import { formatDate, todayJakarta } from "@/lib/format";
import { loadStaffOptions } from "@/lib/team-data";
import { cn } from "@/lib/utils";

type PageProps = { searchParams: Promise<{ person?: string }> };

type Task = {
  id: string;
  title: string;
  stage: string;
  format: ContentFormat;
  dueDate: string | null;
  publishDate: string | null;
  assigneeId: string | null;
  project: { id: string; title: string; logoPath: string | null; client: string };
};

const BUCKETS = [
  { id: "overdue", title: "Lewat tenggat" },
  { id: "soon", title: "Hari ini & besok" },
  { id: "week", title: "Minggu ini" },
  { id: "later", title: "Nanti" },
  { id: "none", title: "Tanpa tenggat" },
] as const;

function daysUntil(day: string, today: string): number {
  return Math.round(
    (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
}

function bucketOf(task: Task, today: string): (typeof BUCKETS)[number]["id"] {
  const due = task.dueDate ?? task.publishDate;
  if (!due) return "none";
  const diff = daysUntil(due, today);
  if (diff < 0) return "overdue";
  if (diff <= 1) return "soon";
  if (diff <= 7) return "week";
  return "later";
}

/**
 * Tugas saya: konten yang ditugaskan, lintas proyek, urut tenggat.
 * Admin & pengelola proyek juga bisa melihat tugas anggota lain dan beban kerja tim.
 */
export default async function TasksPage({ searchParams }: PageProps) {
  const session = await requireStaff();
  const { supabase, user } = session;
  const seesTeam = session.profile.role === "admin" || can(session, "projects.manage");
  const { person } = await searchParams;
  const people = seesTeam ? await loadStaffOptions(supabase) : [];
  const target =
    seesTeam && person && (person === "all" || people.some((item) => item.id === person))
      ? person
      : user.id;
  const today = todayJakarta();

  let query = supabase
    .from("design_assets")
    .select(
      "id, title, stage, format, due_date, publish_date, assignee_id, projects!inner(id, title, logo_path, status, clients(name))",
    )
    .not("stage", "in", "(approved,published)")
    .not("assignee_id", "is", null)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(1000);
  if (!seesTeam) query = query.eq("assignee_id", user.id);
  const { data } = await query;

  const all: Task[] = (data ?? [])
    .filter((row) => row.projects.status !== "closed")
    .map((row) => ({
      id: row.id,
      title: row.title,
      stage: row.stage,
      format: (FORMATS as readonly string[]).includes(row.format)
        ? (row.format as ContentFormat)
        : "other",
      dueDate: row.due_date,
      publishDate: row.publish_date,
      assigneeId: row.assignee_id,
      project: {
        id: row.projects.id,
        title: row.projects.title,
        logoPath: row.projects.logo_path,
        client: row.projects.clients?.name ?? "",
      },
    }));
  const tasks = target === "all" ? all : all.filter((task) => task.assigneeId === target);
  const nameOf = new Map(people.map((item) => [item.id, item.name]));

  // Beban kerja per orang (hanya untuk admin/pengelola proyek).
  const workload = people
    .map((item) => {
      const own = all.filter((task) => task.assigneeId === item.id);
      return {
        ...item,
        open: own.length,
        overdue: own.filter((task) => bucketOf(task, today) === "overdue").length,
        week: own.filter((task) => ["soon", "week"].includes(bucketOf(task, today))).length,
      };
    })
    .filter((item) => item.open > 0 || item.id === user.id)
    .sort((a, b) => b.overdue - a.overdue || b.open - a.open);

  const viewingSelf = target === user.id;
  const title = viewingSelf
    ? "Tugas saya"
    : target === "all"
      ? "Semua tugas tim"
      : `Tugas ${nameOf.get(target) ?? ""}`;

  return (
    <>
      <PageHeader
        title={title}
        description="Konten yang ditugaskan, lintas semua proyek, urut dari tenggat terdekat. Konten yang sudah disetujui atau tayang tidak ditampilkan."
      />

      {seesTeam && (
        <nav aria-label="Lihat tugas" className="mb-6 flex flex-wrap gap-2">
          {[
            { id: user.id, label: "Saya" },
            { id: "all", label: "Semua tim" },
            ...people
              .filter((item) => item.id !== user.id)
              .map((item) => ({ id: item.id, label: item.name })),
          ].map((option) => (
            <Link
              key={option.id}
              href={option.id === user.id ? "/admin/tasks" : `/admin/tasks?person=${option.id}`}
              aria-current={target === option.id ? "page" : undefined}
              className={cn(
                "rounded-full border border-line bg-paper px-3 py-1.5 text-sm font-medium",
                target === option.id && "border-ink bg-ink text-paper",
              )}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      )}

      {seesTeam && workload.length > 0 && target === "all" && (
        <section className="mb-8 overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <caption className="px-4 pt-4 text-left font-heading font-semibold text-ink">
              Beban kerja tim
            </caption>
            <thead className="text-xs text-ink/65">
              <tr>
                <th className="px-4 py-2 font-semibold">Anggota</th>
                <th className="px-4 py-2 font-semibold">Tugas aktif</th>
                <th className="px-4 py-2 font-semibold">Lewat tenggat</th>
                <th className="px-4 py-2 font-semibold">7 hari ke depan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {workload.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/tasks?person=${item.id}`}
                      className="inline-flex items-center gap-2 font-medium text-ink hover:text-primary"
                    >
                      <PersonBadge name={item.name} />
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{item.open}</td>
                  <td
                    className={cn(
                      "px-4 py-2.5 tabular-nums",
                      item.overdue > 0 && "font-semibold text-danger",
                    )}
                  >
                    {item.overdue}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{item.week}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          message={
            viewingSelf
              ? "Belum ada konten yang ditugaskan kepadamu. Tugas muncul di sini begitu kamu dipilih sebagai penanggung jawab."
              : "Tidak ada tugas aktif."
          }
        />
      ) : (
        <div className="grid gap-8">
          {BUCKETS.map((bucket) => {
            const rows = tasks.filter((task) => bucketOf(task, today) === bucket.id);
            if (rows.length === 0) return null;
            return (
              <section key={bucket.id} aria-labelledby={`bucket-${bucket.id}`}>
                <h2
                  id={`bucket-${bucket.id}`}
                  className={cn("mb-3 text-lg", bucket.id === "overdue" && "text-danger")}
                >
                  {bucket.title}{" "}
                  <span className="font-sans text-sm font-normal text-ink/60">{rows.length}</span>
                </h2>
                <ul className="grid gap-2">
                  {rows.map((task) => {
                    const due = task.dueDate ?? task.publishDate;
                    const deadline = due ? deadlineOf(due, today, false) : null;
                    return (
                      <li key={task.id}>
                        <Link
                          href={`/admin/projects/${task.project.id}/content/${task.id}`}
                          className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper p-3 transition-shadow hover:shadow-soft sm:flex-nowrap"
                        >
                          <ProjectAvatar
                            title={task.project.title}
                            logoPath={task.project.logoPath}
                            size="sm"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-ink">
                              {task.title}
                            </span>
                            <span className="block truncate text-xs text-ink/65">
                              {[task.project.client, task.project.title, formatLabels[task.format]]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <StatusBadge kind="stage" status={task.stage} />
                          {deadline && due && (
                            <span
                              title={`${task.dueDate ? "Tenggat" : "Tayang"} ${formatDate(due)}`}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs whitespace-nowrap",
                                deadlineClass[deadline.tone],
                              )}
                            >
                              <CalendarDays aria-hidden className="size-3.5" />
                              {deadline.label}
                            </span>
                          )}
                          {target === "all" && task.assigneeId && (
                            <PersonBadge name={nameOf.get(task.assigneeId) ?? "?"} />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
