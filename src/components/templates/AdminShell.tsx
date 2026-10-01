import type { ReactNode } from "react";
import type { PortalNavGroup } from "@/components/organisms/PortalSidebar";
import { PortalFrame } from "@/components/templates/PortalFrame";
import { portal } from "@/content/portal";
import { CMS_BASE, collections } from "@/lib/cms/collections";

type AdminShellProps = {
  userLabel: string;
  role: "admin" | "team";
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

const adminNav: PortalNavGroup[] = [...portal.nav.admin, cmsGroup, portal.nav.settings];
const teamNav: PortalNavGroup[] = [...portal.nav.team, portal.nav.account];

/** Menu mengikuti peran: tim hanya melihat pekerjaan yang ditugaskan. */
export function AdminShell({ userLabel, role, children }: AdminShellProps) {
  return (
    <PortalFrame
      homeHref="/admin"
      nav={role === "admin" ? adminNav : teamNav}
      badge={role === "admin" ? portal.shell.adminBadge : portal.shell.teamBadge}
      userLabel={userLabel}
    >
      {children}
    </PortalFrame>
  );
}
