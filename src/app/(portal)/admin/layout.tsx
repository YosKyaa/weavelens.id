import type { ReactNode } from "react";
import { NotificationBell } from "@/components/organisms/NotificationBell";
import { AdminShell } from "@/components/templates/AdminShell";
import { requireStaff } from "@/lib/auth";
import { loadNotifications } from "@/lib/notifications";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireStaff();
  const feed = await loadNotifications(session);
  return (
    <AdminShell
      isAdmin={session.profile.role === "admin"}
      roleName={session.teamRoleName}
      permissions={session.permissions}
      userLabel={session.profile.full_name ?? session.user.email ?? ""}
      headerAction={
        // Kunci berubah saat ada notifikasi baru, supaya hitungan belum dibaca ikut diperbarui.
        <NotificationBell key={`${feed.unread}-${feed.items[0]?.id ?? ""}`} feed={feed} />
      }
    >
      {children}
    </AdminShell>
  );
}
