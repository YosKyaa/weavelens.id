import { FormSection } from "@/components/molecules/FormSection";
import { PlanEditor, type PlanRow } from "@/components/organisms/PlanEditor";
import { workspaceText } from "@/content/workspace";
import { requireStaff } from "@/lib/auth";

type PageProps = { params: Promise<{ id: string }> };

export default async function ProjectPlanPage({ params }: PageProps) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data } = await supabase
    .from("plan_items")
    .select("id, title, due_date, status")
    .eq("project_id", id)
    .order("order");

  const rows: PlanRow[] = (data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    dueDate: item.due_date,
    status: item.status as PlanRow["status"],
  }));

  return (
    <FormSection title={workspaceText.plan.title} description={workspaceText.plan.description}>
      <PlanEditor projectId={id} rows={rows} />
    </FormSection>
  );
}
