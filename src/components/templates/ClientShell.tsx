import type { ReactNode } from "react";
import { PortalFrame } from "@/components/templates/PortalFrame";
import { portal } from "@/content/portal";

type ClientShellProps = {
  /** Nama organisasi klien, tampil di samping logo. */
  clientName: string;
  userLabel: string;
  children: ReactNode;
};

export function ClientShell({ clientName, userLabel, children }: ClientShellProps) {
  return (
    <PortalFrame
      homeHref="/client"
      nav={portal.nav.client}
      badge={clientName}
      userLabel={userLabel}
    >
      {children}
    </PortalFrame>
  );
}
