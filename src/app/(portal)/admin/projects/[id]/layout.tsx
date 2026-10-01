import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { PageHeader } from "@/components/molecules/PageHeader";
import { TabNav } from "@/components/molecules/TabNav";
import { projectTypes } from "@/content/portal";
import { workspaceText } from "@/content/workspace";
import { requireStaff } from "@/lib/auth";

const text = workspaceText.projects;

type LayoutProps = { children: ReactNode; params: Promise<{ id: string }> };

export default async function ProjectLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, profile } = await requireStaff();
  const isAdmin = profile.role === "admin";

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, type, status, clients(name), photo_sets(count), share_links(count), project_members(count)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const base = `/admin/projects/${id}`;
  const showBoard = project.type === "design" || project.type === "mixed";
  const showGalleries = project.type !== "design" || project.photo_sets[0]?.count > 0;

  const tabs = [
    ...(showBoard ? [{ href: base, label: text.tabs.board }] : []),
    ...(showGalleries
      ? [
          {
            href: `${base}/galleries`,
            label: text.tabs.galleries,
            count: project.photo_sets[0]?.count,
          },
        ]
      : []),
    { href: `${base}/plan`, label: text.tabs.plan },
    { href: `${base}/share`, label: text.tabs.share, count: project.share_links[0]?.count },
    { href: `${base}/activity`, label: text.tabs.activity },
    // Penugasan tim & pengaturan proyek hanya untuk admin.
    ...(isAdmin
      ? [
          { href: `${base}/team`, label: text.tabs.team, count: project.project_members[0]?.count },
          { href: `${base}/settings`, label: text.tabs.settings },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title={project.title}
        description={[project.clients?.name, projectTypes[project.type]]
          .filter(Boolean)
          .join(" · ")}
        back={{ href: "/admin/projects", label: text.back }}
        actions={<StatusBadge kind="project" status={project.status} />}
      />
      <TabNav label="Bagian proyek" tabs={tabs} />
      {children}
    </>
  );
}
