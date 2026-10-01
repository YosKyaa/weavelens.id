import type { ReactNode } from "react";
import { AdminShell } from "@/components/templates/AdminShell";
import { requireStaff } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, user } = await requireStaff();
  return (
    <AdminShell
      role={profile.role === "admin" ? "admin" : "team"}
      userLabel={profile.full_name ?? user.email ?? ""}
    >
      {children}
    </AdminShell>
  );
}
