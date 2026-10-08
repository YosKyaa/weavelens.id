import { FormSection } from "@/components/molecules/FormSection";
import { ProjectDangerZone } from "@/components/organisms/ProjectDangerZone";
import { ProjectDuplicate } from "@/components/organisms/ProjectDuplicate";
import { ProjectForm } from "@/components/organisms/ProjectForm";
import { ProjectLogoField } from "@/components/organisms/ProjectLogoField";
import { requirePermission } from "@/lib/auth";

type PageProps = { params: Promise<{ id: string }> };

export default async function ProjectSettingsPage({ params }: PageProps) {
  const { id } = await params;
  const { supabase } = await requirePermission("projects.manage");
  const count = (table: "plan_items" | "design_assets" | "project_members") =>
    supabase.from(table).select("project_id", { count: "exact", head: true }).eq("project_id", id);
  const [{ data: project }, { data: clients }, plan, content, members] = await Promise.all([
    supabase
      .from("projects")
      .select("id, client_id, brand_id, title, type, event_date, description, status, logo_path")
      .eq("id", id)
      .single(),
    supabase.from("clients").select("id, name, brands(id, name, sort)").order("name"),
    count("plan_items"),
    count("design_assets"),
    count("project_members"),
  ]);
  if (!project) return null;

  return (
    <div className="grid gap-5">
      <FormSection
        title="Logo proyek"
        description="Membantu membedakan proyek di daftar, portal klien, dan link klien."
        className="max-w-3xl"
      >
        <ProjectLogoField projectId={id} title={project.title} logoPath={project.logo_path} />
      </FormSection>
      <FormSection title="Detail proyek" className="max-w-3xl">
        <ProjectForm
          projectId={id}
          clients={(clients ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            brands: [...item.brands].sort((a, b) => a.sort - b.sort),
          }))}
          initial={{
            clientId: project.client_id,
            brandId: project.brand_id,
            title: project.title,
            type: project.type as "design",
            eventDate: project.event_date ?? "",
            description: project.description ?? "",
            status: project.status as "active",
          }}
        />
      </FormSection>
      <FormSection
        title="Duplikat ke bulan berikutnya"
        description="Untuk klien bulanan: buat proyek periode baru dari proyek ini tanpa menyusun ulang dari nol."
        className="max-w-3xl"
      >
        <ProjectDuplicate
          projectId={id}
          title={project.title}
          eventDate={project.event_date}
          counts={{
            plan: plan.count ?? 0,
            content: content.count ?? 0,
            members: members.count ?? 0,
          }}
        />
      </FormSection>
      <ProjectDangerZone projectId={id} title={project.title} />
    </div>
  );
}
