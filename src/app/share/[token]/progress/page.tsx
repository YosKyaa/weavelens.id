import { notFound } from "next/navigation";
import { PlanTimeline } from "@/components/organisms/PlanTimeline";
import { resolveShare } from "@/lib/share";

type PageProps = { params: Promise<{ token: string }> };

/** Timeline rencana kerja: klien melihat tahap mana yang sudah dan sedang dikerjakan. */
export default async function ShareProgressPage({ params }: PageProps) {
  const { token } = await params;
  const context = await resolveShare(token);
  if (!context) notFound();

  const { data: plan } = await context.db
    .from("plan_items")
    .select("id, title, due_date, status, description")
    .eq("project_id", context.project.id)
    .order("order");

  return <PlanTimeline plan={plan ?? []} />;
}
