import { PageHeader } from "@/components/molecules/PageHeader";
import { ProjectTable } from "@/components/organisms/ProjectTable";
import { portal } from "@/content/portal";
import { requireAdmin } from "@/lib/auth";

/** Daftar proyek. Buat proyek, kanban, dan link klien menyusul di tahap berikutnya. */
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
      <PageHeader title={portal.projects.heading} description={portal.projects.sub} />
      <ProjectTable rows={rows} />
    </>
  );
}
