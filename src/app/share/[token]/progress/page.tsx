import { notFound } from "next/navigation";
import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { EmptyState } from "@/components/atoms/EmptyState";
import { shareText, workspaceText } from "@/content/workspace";
import { formatDate } from "@/lib/format";
import { resolveShare } from "@/lib/share";
import { cn } from "@/lib/utils";

const icons = { done: CheckCircle2, in_progress: CircleDot, planned: Circle };

type PageProps = { params: Promise<{ token: string }> };

/** Timeline rencana kerja: klien melihat tahap mana yang sudah dan sedang dikerjakan. */
export default async function ShareProgressPage({ params }: PageProps) {
  const { token } = await params;
  const context = await resolveShare(token);
  if (!context) notFound();

  const { data: plan } = await context.db
    .from("plan_items")
    .select("id, title, due_date, status")
    .eq("project_id", context.project.id)
    .order("order");

  if (!plan?.length) return <EmptyState message={shareText.plan.empty} className="bg-paper" />;

  const done = plan.filter((item) => item.status === "done").length;

  return (
    <section className="rounded-2xl border border-line bg-paper p-5 md:p-6">
      <p className="font-heading font-semibold">
        {done} dari {plan.length} tahap selesai
      </p>
      <ol className="mt-5 grid gap-0">
        {plan.map((item, index) => {
          const status = (item.status in icons ? item.status : "planned") as keyof typeof icons;
          const Icon = icons[status];
          return (
            <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
              {index < plan.length - 1 && (
                <span aria-hidden className="absolute top-7 bottom-0 left-[11px] w-0.5 bg-line" />
              )}
              <Icon
                aria-hidden
                className={cn(
                  "relative size-6 shrink-0",
                  status === "done" && "text-success",
                  status === "in_progress" && "text-primary",
                  status === "planned" && "text-ink/40",
                )}
              />
              <div>
                <p className={cn("font-medium", status === "planned" && "text-ink/75")}>
                  {item.title}
                </p>
                <p className="text-sm text-ink/65">
                  {workspaceText.plan.statuses[status]}
                  {item.due_date && ` · target ${formatDate(item.due_date)}`}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
