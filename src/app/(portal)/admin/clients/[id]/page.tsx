import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { FormSection } from "@/components/molecules/FormSection";
import { PageHeader } from "@/components/molecules/PageHeader";
import { BrandManager } from "@/components/organisms/BrandManager";
import { ClientDangerZone } from "@/components/organisms/ClientDangerZone";
import { ClientForm } from "@/components/organisms/ClientForm";
import { projectTypes } from "@/content/portal";
import { workspaceText } from "@/content/workspace";
import { requireAdmin } from "@/lib/auth";

const text = workspaceText.clients;

type PageProps = { params: Promise<{ id: string }> };

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, name, contact_name, contact_email, contact_phone, brands(id, name, color, instagram, sort), projects(id, title, type, status, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!client) notFound();

  const brands = [...client.brands].sort((a, b) => a.sort - b.sort);
  const projects = [...client.projects].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <>
      <PageHeader title={client.name} back={{ href: "/admin/clients", label: text.detailBack }} />
      <div className="grid gap-5 xl:grid-cols-2">
        <FormSection title="Data klien">
          <ClientForm
            clientId={client.id}
            initial={{
              name: client.name,
              contactName: client.contact_name ?? "",
              contactEmail: client.contact_email ?? "",
              contactPhone: client.contact_phone ?? "",
            }}
          />
        </FormSection>
        <FormSection title={text.brands.title} description={text.brands.description}>
          <BrandManager clientId={client.id} brands={brands} />
        </FormSection>
        <FormSection title="Proyek" className="xl:col-span-2">
          {projects.length === 0 ? (
            <p className="text-sm text-ink/70">
              Belum ada proyek.{" "}
              <Link
                href={`/admin/projects/new?client=${client.id}`}
                className="font-medium text-primary underline"
              >
                Buat proyek untuk klien ini
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-primary"
                  >
                    <span>
                      <span className="block font-medium">{project.title}</span>
                      <span className="block text-sm text-ink/65">
                        {projectTypes[project.type]}
                      </span>
                    </span>
                    <StatusBadge kind="project" status={project.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </FormSection>
        <ClientDangerZone clientId={client.id} name={client.name} />
      </div>
    </>
  );
}
