import type { ReactNode } from "react";
import { PortalFrame } from "@/components/templates/PortalFrame";
import { portal } from "@/content/portal";

type AdminShellProps = {
  userLabel: string;
  children: ReactNode;
};

export function AdminShell({ userLabel, children }: AdminShellProps) {
  return (
    <PortalFrame
      homeHref="/admin"
      nav={portal.nav.admin}
      badge={portal.shell.adminBadge}
      userLabel={userLabel}
    >
      {children}
    </PortalFrame>
  );
}
