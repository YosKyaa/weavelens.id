import { DateText } from "@/components/atoms/DateText";
import { EmptyState } from "@/components/atoms/EmptyState";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { portal, projectTypes } from "@/content/portal";
import { requireAdmin } from "@/lib/auth";

const text = portal.projects;

/** Tahap 1: daftar baca-saja. Tambah/edit proyek menyusul di tahap 2. */
export default async function AdminProjectsPage() {
  const { supabase } = await requireAdmin();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, type, event_date, status, clients(name)")
    .order("created_at", { ascending: false });

  return (
    <>
      <h1 className="text-3xl">{text.heading}</h1>
      <p className="mt-2 text-ink/80">{text.sub}</p>
      <div className="mt-8">
        {!projects?.length ? (
          <EmptyState message={text.empty} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-paper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{text.columns.title}</TableHead>
                  <TableHead className="hidden md:table-cell">{text.columns.type}</TableHead>
                  <TableHead className="hidden sm:table-cell">{text.columns.event}</TableHead>
                  <TableHead className="text-right">{text.columns.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="whitespace-normal">
                      <span className="block font-medium text-ink">{project.title}</span>
                      <span className="block text-sm text-ink/70">{project.clients?.name}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {projectTypes[project.type] ?? project.type}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <DateText value={project.event_date} />
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge kind="project" status={project.status} />
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
