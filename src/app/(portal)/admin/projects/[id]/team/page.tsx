import { FormSection } from "@/components/molecules/FormSection";
import { ProjectMembersForm } from "@/components/organisms/ProjectMembersForm";
import { teamText } from "@/content/team";
import { requirePermission } from "@/lib/auth";
import { loadTeamOptions } from "@/lib/team-data";

type PageProps = { params: Promise<{ id: string }> };

/** Admin memilih anggota tim yang boleh mengerjakan proyek ini. */
export default async function ProjectTeamPage({ params }: PageProps) {
  const { id } = await params;
  const { supabase } = await requirePermission("projects.manage");
  const [options, { data: members }] = await Promise.all([
    loadTeamOptions(supabase),
    supabase.from("project_members").select("profile_id").eq("project_id", id),
  ]);

  return (
    <FormSection
      title={teamText.assign.title}
      description={teamText.assign.description}
      className="max-w-3xl"
    >
      <ProjectMembersForm
        projectId={id}
        options={options}
        initial={(members ?? []).map((member) => member.profile_id)}
      />
    </FormSection>
  );
}
