import { redirect } from "next/navigation";
import { ContentBoard } from "@/components/organisms/ContentBoard";
import { requireAdmin } from "@/lib/auth";
import { loadBoard } from "@/lib/board-data";

type PageProps = { params: Promise<{ id: string }> };

/** Papan konten (kanban). Proyek dokumentasi foto/video langsung dibuka di tab galeri. */
export default async function ProjectBoardPage({ params }: PageProps) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: project } = await supabase
    .from("projects")
    .select("type, client_id")
    .eq("id", id)
    .single();
  if (project && (project.type === "photo" || project.type === "video")) {
    redirect(`/admin/projects/${id}/galleries`);
  }

  const [items, { data: brands }] = await Promise.all([
    loadBoard(supabase, id),
    supabase
      .from("brands")
      .select("id, name, color")
      .eq("client_id", project?.client_id ?? "")
      .order("sort"),
  ]);

  return <ContentBoard projectId={id} items={items} brands={brands ?? []} />;
}
