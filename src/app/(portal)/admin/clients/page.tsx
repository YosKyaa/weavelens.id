import { PageHeader } from "@/components/molecules/PageHeader";
import { ClientCreate } from "@/components/organisms/ClientCreate";
import { ClientTable } from "@/components/organisms/ClientTable";
import { workspaceText } from "@/content/workspace";
import { requireAdmin } from "@/lib/auth";

const text = workspaceText.clients;

export default async function AdminClientsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("clients")
    .select("id, name, contact_name, contact_email, projects(count), brands(name)")
    .order("name");

  const rows = (data ?? []).map((client) => ({
    id: client.id,
    name: client.name,
    contactName: client.contact_name ?? "",
    contactEmail: client.contact_email ?? "",
    projects: client.projects[0]?.count ?? 0,
    brands: client.brands.map((brand) => brand.name),
  }));

  return (
    <>
      <PageHeader title={text.title} description={text.description} actions={<ClientCreate />} />
      <ClientTable rows={rows} />
    </>
  );
}
