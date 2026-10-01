import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { EmptyState } from "@/components/atoms/EmptyState";
import { shareText, workspaceText } from "@/content/workspace";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const icons = { done: CheckCircle2, in_progress: CircleDot, planned: Circle };

export type PlanTimelineItem = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  description?: string | null;
};

/** Timeline rencana kerja untuk klien (link klien & portal): tahap selesai, berjalan, berikutnya. */
export function PlanTimeline({ plan }: { plan: PlanTimelineItem[] }) {
  if (!plan.length) return <EmptyState message={shareText.plan.empty} className="bg-paper" />;
  const done = plan.filter((item) => item.status === "done").length;

  return (
    <section className="rounded-2xl border border-line bg-paper p-5 md:p-6">
      <p className="font-heading font-semibold">
        {done} dari {plan.length} tahap selesai
      </p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-sand"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={plan.length}
        aria-valuenow={done}
        aria-label={`${done} dari ${plan.length} tahap selesai`}
      >
        <div
          className="h-full rounded-full bg-success"
          style={{ width: `${(done / plan.length) * 100}%` }}
        />
      </div>
      <ol className="mt-6 grid gap-0">
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
                {item.description && (
                  <p className="mt-1 text-sm whitespace-pre-line text-ink/75">{item.description}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
