import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/molecules/PageHeader";
import { ProjectTable } from "@/components/organisms/ProjectTable";
import { Button } from "@/components/ui/button";
import { workspaceText } from "@/content/workspace";
import { requireStaff } from "@/lib/auth";

const text = workspaceText.projects;

/** Admin melihat semua proyek + timnya; anggota tim hanya proyek yang ditugaskan (dibatasi RLS). */
export default async function AdminProjectsPage() {
  const { supabase, profile } = await requireStaff();
  const isAdmin = profile.role === "admin";
  const { data } = await supabase
    .from("projects")
    .select(
      "id, title, type, event_date, status, clients(name), project_members(profiles(full_name))",
    )
    .order("created_at", { ascending: false });

  const rows = (data ?? []).map((project) => ({
    id: project.id,
    title: project.title,
    client: project.clients?.name ?? "",
    type: project.type,
    eventDate: project.event_date,
    status: project.status,
    team: project.project_members.flatMap((member) =>
      member.profiles?.full_name ? [member.profiles.full_name] : [],
    ),
  }));

  return (
    <>
      <PageHeader
        title={isAdmin ? text.title : text.teamTitle}
        description={isAdmin ? text.description : text.teamDescription}
        actions={
          isAdmin && (
            <Button asChild size="lg">
              <Link href="/admin/projects/new">
                <Plus aria-hidden />
                {text.create}
              </Link>
            </Button>
          )
        }
      />
      <ProjectTable
        rows={rows}
        showTeam={isAdmin}
        emptyMessage={isAdmin ? undefined : text.teamEmpty}
      />
    </>
  );
}
