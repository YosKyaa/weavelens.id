import type { ReactNode } from "react";
import type { PortalNavGroup, PortalNavItem } from "@/components/organisms/PortalSidebar";
import { PortalFrame } from "@/components/templates/PortalFrame";
import { portal } from "@/content/portal";
import { CMS_BASE, collections } from "@/lib/cms/collections";
import type { Permission } from "@/lib/permissions";

type AdminShellProps = {
  userLabel: string;
  isAdmin: boolean;
  /** Nama peran untuk badge, mis. "Admin" atau "Editor CMS". */
  roleName: string;
  permissions: Permission[];
  headerAction?: ReactNode;
  children: ReactNode;
};

/** Grup CMS dibentuk dari daftar koleksi, jadi koleksi baru otomatis muncul di menu. */
const cmsGroup: PortalNavGroup = {
  id: portal.nav.cmsGroup.id,
  label: portal.nav.cmsGroup.label,
  icon: portal.nav.cmsGroup.icon,
  collapsible: true,
  items: [
    { href: CMS_BASE, label: portal.nav.cmsGroup.overview },
    ...collections.map((collection) => ({
      href: `${CMS_BASE}/${collection.slug}`,
      label: collection.label,
    })),
  ],
};

/** Menu disusun dari izin: setiap orang hanya melihat yang memang bisa dibukanya. */
function buildNav(isAdmin: boolean, permissions: Permission[]): PortalNavGroup[] {
  const can = (permission: Permission) => permissions.includes(permission);
  const compact = (items: (PortalNavItem | false)[]) =>
    items.filter((item): item is PortalNavItem => Boolean(item));

  const groups: PortalNavGroup[] = [
    {
      id: "main",
      items: compact([
        { href: "/admin", label: "Ringkasan", icon: "home" },
        { href: "/admin/tasks", label: "Tugas saya", icon: "tasks" },
        can("analytics") && { href: "/admin/analytics", label: "Analitik website", icon: "chart" },
      ]),
    },
    {
      id: "work",
      label: "Pekerjaan",
      items: compact([
        {
          href: "/admin/projects",
          label: can("projects.all") ? "Proyek & konten" : "Proyek saya",
          icon: "kanban",
        },
        { href: "/admin/galleries", label: "Seleksi foto & video", icon: "images" },
        isAdmin && { href: "/admin/invoices", label: "Invoice", icon: "invoice" },
      ]),
    },
    {
      id: "data",
      label: "Data",
      items: compact([
        can("clients") && { href: "/admin/clients", label: "Klien & brand", icon: "users" },
        isAdmin && { href: "/admin/team", label: "Tim & akses", icon: "shield" },
      ]),
    },
  ];
  if (can("cms")) groups.push(cmsGroup);
  groups.push({
    id: "system",
    items: compact([
      isAdmin && { href: "/admin/settings", label: "Pengaturan", icon: "settings" },
      { href: "/admin/account", label: "Akun saya", icon: "user" },
    ]),
  });
  return groups.filter((group) => group.items.length > 0);
}

export function AdminShell({
  userLabel,
  isAdmin,
  roleName,
  permissions,
  headerAction,
  children,
}: AdminShellProps) {
  return (
    <PortalFrame
      homeHref="/admin"
      nav={buildNav(isAdmin, permissions)}
      badge={roleName}
      userLabel={userLabel}
      headerAction={headerAction}
    >
      {children}
    </PortalFrame>
  );
}
