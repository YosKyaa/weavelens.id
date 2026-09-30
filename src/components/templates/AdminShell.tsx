import type { ReactNode } from "react";
import type { PortalNavGroup } from "@/components/organisms/PortalSidebar";
import { PortalFrame } from "@/components/templates/PortalFrame";
import { portal } from "@/content/portal";
import { CMS_BASE, collections } from "@/lib/cms/collections";

type AdminShellProps = {
  userLabel: string;
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

const nav: PortalNavGroup[] = [...portal.nav.admin, cmsGroup, portal.nav.settings];

export function AdminShell({ userLabel, children }: AdminShellProps) {
  return (
    <PortalFrame homeHref="/admin" nav={nav} badge={portal.shell.adminBadge} userLabel={userLabel}>
      {children}
    </PortalFrame>
  );
}
