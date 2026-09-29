import type { ReactNode } from "react";
import { AdminShell } from "@/components/templates/AdminShell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, user } = await requireAdmin();
  return <AdminShell userLabel={profile.full_name ?? user.email ?? ""}>{children}</AdminShell>;
}
