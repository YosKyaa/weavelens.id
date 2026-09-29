import { EmptyState } from "@/components/atoms/EmptyState";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { portal, projectTypes } from "@/content/portal";
import { requireClient } from "@/lib/auth";
import { formatDate } from "@/lib/format";

const text = portal.clientHome;

/** Beranda klien: daftar proyek organisasinya. RLS memastikan hanya proyek miliknya yang terbaca. */
export default async function ClientHomePage() {
  const { supabase, profile } = await requireClient();

  if (!profile.client_id) {
    return (
      <>
        <h1 className="text-3xl">{text.heading}</h1>
        <EmptyState message={text.noClient} className="mt-8" />
      </>
    );
  }

  const [{ data: client }, { data: projects }] = await Promise.all([
    supabase.from("clients").select("name").eq("id", profile.client_id).maybeSingle(),
    supabase
      .from("projects")
      .select("id, title, type, event_date, status, plan_items(status)")
      .neq("status", "draft")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <h1 className="text-3xl">{text.heading}</h1>
      {client && <p className="mt-2 text-ink/80">{text.sub(client.name)}</p>}
      <div className="mt-8">
        {!projects?.length ? (
          <EmptyState message={text.empty} />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => {
              const total = project.plan_items.length;
              const done = project.plan_items.filter((item) => item.status === "done").length;
              return (
                <li key={project.id}>
                  <article className="flex h-full flex-col gap-4 rounded-2xl border border-line bg-paper p-6">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-xl">{project.title}</h2>
                      <StatusBadge kind="project" status={project.status} />
                    </div>
                    <p className="text-sm text-ink/70">
                      {[
                        projectTypes[project.type],
                        project.event_date && text.eventDate(formatDate(project.event_date)),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {total > 0 && (
                      <div className="mt-auto">
                        <div
                          className="h-2 overflow-hidden rounded-full bg-sand"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={total}
                          aria-valuenow={done}
                          aria-label={text.planProgress(done, total)}
                        >
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(done / total) * 100}%` }}
                          />
                        </div>
                        <p className="mt-2 text-sm text-ink/70">{text.planProgress(done, total)}</p>
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
