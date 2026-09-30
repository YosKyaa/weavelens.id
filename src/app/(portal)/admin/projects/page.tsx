import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/molecules/PageHeader";
import { ProjectTable } from "@/components/organisms/ProjectTable";
import { Button } from "@/components/ui/button";
import { workspaceText } from "@/content/workspace";
import { requireAdmin } from "@/lib/auth";

const text = workspaceText.projects;

export default async function AdminProjectsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("projects")
    .select("id, title, type, event_date, status, clients(name)")
    .order("created_at", { ascending: false });

  const rows = (data ?? []).map((project) => ({
    id: project.id,
    title: project.title,
    client: project.clients?.name ?? "",
    type: project.type,
    eventDate: project.event_date,
    status: project.status,
  }));

  return (
    <>
      <PageHeader
        title={text.title}
        description={text.description}
        actions={
          <Button asChild size="lg">
            <Link href="/admin/projects/new">
              <Plus aria-hidden />
              {text.create}
            </Link>
          </Button>
        }
      />
      <ProjectTable rows={rows} />
    </>
  );
}
