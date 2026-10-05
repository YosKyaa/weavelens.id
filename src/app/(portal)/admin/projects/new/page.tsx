import Link from "next/link";
import { EmptyState } from "@/components/atoms/EmptyState";
import { FormSection } from "@/components/molecules/FormSection";
import { PageHeader } from "@/components/molecules/PageHeader";
import { ProjectForm } from "@/components/organisms/ProjectForm";
import { Button } from "@/components/ui/button";
import { workspaceText } from "@/content/workspace";
import { requirePermission } from "@/lib/auth";
import { loadTeamOptions } from "@/lib/team-data";

const text = workspaceText.projects;

type PageProps = { searchParams: Promise<{ client?: string }> };

export default async function NewProjectPage({ searchParams }: PageProps) {
  const { client } = await searchParams;
  const { supabase } = await requirePermission("projects.manage");
  const [{ data: clients }, teamOptions] = await Promise.all([
    supabase.from("clients").select("id, name, brands(id, name, sort)").order("name"),
    loadTeamOptions(supabase),
  ]);

  return (
    <>
      <PageHeader title={text.create} back={{ href: "/admin/projects", label: text.back }} />
      {!clients?.length ? (
        <EmptyState
          message={text.noClients}
          action={
            <Button asChild>
              <Link href="/admin/clients">{workspaceText.clients.create}</Link>
            </Button>
          }
          className="bg-paper"
        />
      ) : (
        <FormSection title="Detail proyek" className="max-w-3xl">
          <ProjectForm
            projectId={null}
            clients={clients.map((item) => ({
              id: item.id,
              name: item.name,
              brands: [...item.brands].sort((a, b) => a.sort - b.sort),
            }))}
            teamOptions={teamOptions}
            initial={{
              clientId: clients.some((item) => item.id === client) ? client! : clients[0].id,
              brandId: null,
              title: "",
              type: "design",
              eventDate: "",
              description: "",
              status: "active",
              memberIds: [],
            }}
          />
        </FormSection>
      )}
    </>
  );
}
