import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { FormSection } from "@/components/molecules/FormSection";
import { PageHeader } from "@/components/molecules/PageHeader";
import { BrandManager } from "@/components/organisms/BrandManager";
import { ClientDangerZone } from "@/components/organisms/ClientDangerZone";
import { ClientPortalAccess, type PortalUserRow } from "@/components/organisms/ClientPortalAccess";
import { ClientForm } from "@/components/organisms/ClientForm";
import { projectTypes } from "@/content/portal";
import { workspaceText } from "@/content/workspace";
import { requirePermission } from "@/lib/auth";
import { googleEnabled } from "@/lib/supabase/providers";
import { createServiceClient } from "@/lib/supabase/service";

const text = workspaceText.clients;

type PageProps = { params: Promise<{ id: string }> };

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requirePermission("clients");

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, name, contact_name, contact_email, contact_phone, brands(id, name, color, instagram, sort), projects(id, title, type, status, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!client) notFound();

  // Akun portal PIC klien (email & waktu masuk ada di auth.users → service role).
  const db = createServiceClient();
  const [{ data: portalProfiles }, google] = await Promise.all([
    // RLS profil tim hanya membuka profil admin/tim; akses halaman ini sudah dicek requirePermission.
    (db ?? supabase)
      .from("profiles")
      .select("id, full_name, active")
      .eq("role", "client")
      .eq("client_id", client.id)
      .order("full_name"),
    googleEnabled(),
  ]);
  const portalUsers: PortalUserRow[] = await Promise.all(
    (portalProfiles ?? []).map(async (profile) => {
      const user = db ? (await db.auth.admin.getUserById(profile.id)).data.user : null;
      return {
        id: profile.id,
        name: profile.full_name || user?.email || "Tanpa nama",
        email: user?.email ?? "",
        active: profile.active,
        lastSignIn: user?.last_sign_in_at ?? null,
      };
    }),
  );

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
        <FormSection
          title="Akses portal klien"
          description="Akun untuk PIC klien melihat semua proyeknya. Tanpa password: masuk lewat Google atau link email."
          className="xl:col-span-2"
        >
          <ClientPortalAccess
            clientId={client.id}
            users={portalUsers}
            contact={{
              name: client.contact_name ?? "",
              email: client.contact_email ?? "",
              phone: client.contact_phone,
            }}
            google={google}
          />
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
