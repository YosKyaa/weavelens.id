import Link from "next/link";
import { ArrowRight, MessageSquareWarning } from "lucide-react";
import { EmptyState } from "@/components/atoms/EmptyState";
import { ProjectAvatar } from "@/components/atoms/ProjectAvatar";
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
      .select(
        "id, title, type, event_date, status, logo_path, plan_items(status), design_assets(stage)",
      )
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
              const waiting = project.design_assets.filter(
                (asset) => asset.stage === "client_review",
              ).length;
              return (
                <li key={project.id}>
                  <Link
                    href={`/client/projects/${project.id}`}
                    className={`group flex h-full flex-col gap-4 rounded-2xl border bg-paper p-6 transition-shadow hover:shadow-lift ${
                      waiting ? "border-primary ring-1 ring-primary" : "border-line"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-3">
                        <ProjectAvatar title={project.title} logoPath={project.logo_path} />
                        <h2 className="text-xl group-hover:text-primary">{project.title}</h2>
                      </span>
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
                      <div>
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
                    <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                      {waiting > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-primary">
                          <MessageSquareWarning aria-hidden className="size-4" />
                          {text.waitingReview(waiting)}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                        {text.openProject}
                        <ArrowRight
                          aria-hidden
                          className="size-4 transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
