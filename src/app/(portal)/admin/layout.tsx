import type { ReactNode } from "react";
import { AdminShell } from "@/components/templates/AdminShell";
import { requireStaff } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireStaff();
  return (
    <AdminShell
      isAdmin={session.profile.role === "admin"}
      roleName={session.teamRoleName}
      permissions={session.permissions}
      userLabel={session.profile.full_name ?? session.user.email ?? ""}
    >
      {children}
    </AdminShell>
  );
}
