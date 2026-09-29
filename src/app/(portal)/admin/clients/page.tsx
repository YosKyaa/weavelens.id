import { EmptyState } from "@/components/atoms/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { portal } from "@/content/portal";
import { requireAdmin } from "@/lib/auth";

const text = portal.clients;

/** Tahap 1: daftar baca-saja. Tambah klien & undang anggota menyusul di tahap 2. */
export default async function AdminClientsPage() {
  const { supabase } = await requireAdmin();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, contact_name, contact_email, projects(count)")
    .order("name");

  return (
    <>
      <h1 className="text-3xl">{text.heading}</h1>
      <p className="mt-2 text-ink/80">{text.sub}</p>
      <div className="mt-8">
        {!clients?.length ? (
          <EmptyState message={text.empty} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-paper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{text.columns.name}</TableHead>
                  <TableHead className="hidden sm:table-cell">{text.columns.contact}</TableHead>
                  <TableHead className="text-right">{text.columns.projects}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium whitespace-normal text-ink">
                      {client.name}
                    </TableCell>
                    <TableCell className="hidden whitespace-normal sm:table-cell">
                      <span className="block">{client.contact_name}</span>
                      <span className="block text-sm text-ink/70">{client.contact_email}</span>
                    </TableCell>
                    <TableCell className="text-right font-heading font-semibold">
                      {client.projects[0]?.count ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
