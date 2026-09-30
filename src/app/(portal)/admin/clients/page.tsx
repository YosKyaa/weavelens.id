import { PageHeader } from "@/components/molecules/PageHeader";
import { ClientTable } from "@/components/organisms/ClientTable";
import { portal } from "@/content/portal";
import { requireAdmin } from "@/lib/auth";

/** Daftar klien. Tambah klien, brand, dan anggota menyusul di tahap berikutnya. */
export default async function AdminClientsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("clients")
    .select("id, name, contact_name, contact_email, projects(count)")
    .order("name");

  const rows = (data ?? []).map((client) => ({
    id: client.id,
    name: client.name,
    contactName: client.contact_name ?? "",
    contactEmail: client.contact_email ?? "",
    projects: client.projects[0]?.count ?? 0,
  }));

  return (
    <>
      <PageHeader title={portal.clients.heading} description={portal.clients.sub} />
      <ClientTable rows={rows} />
    </>
  );
}
