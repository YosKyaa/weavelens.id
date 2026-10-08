import "server-only";
import type { Session } from "@/lib/auth";

/** Aksi yang perlu diketahui tim (dari activity_log): aksi klien + penugasan konten. */
const NOTIFY_ACTIONS = [
  "version.approved",
  "version.changes_requested",
  "comment.added",
  "content.assigned",
] as const;

export type NotificationItem = {
  id: string;
  kind: "approved" | "revision" | "comment" | "assigned";
  actor: string;
  title: string;
  project: string;
  href: string;
  createdAt: string;
  unread: boolean;
};

export type NotificationFeed = { items: NotificationItem[]; unread: number };

/**
 * Lonceng notifikasi tim: persetujuan, permintaan revisi, dan komentar dari klien di proyek
 * yang boleh dibuka anggota ini (RLS activity_log). "Belum dibaca" = setelah notifications_seen_at.
 */
export async function loadNotifications(session: Session): Promise<NotificationFeed> {
  const { supabase, user } = session;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: rows }, { data: me }] = await Promise.all([
    supabase
      .from("activity_log")
      .select("id, action, actor_id, actor_name, meta, created_at, project_id, projects(title)")
      .in("action", [...NOTIFY_ACTIONS])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("profiles").select("notifications_seen_at").eq("id", user.id).maybeSingle(),
  ]);
  const seenAt = me?.notifications_seen_at ?? new Date(0).toISOString();

  const items = (rows ?? [])
    .filter((row) => {
      const meta = (row.meta ?? {}) as Record<string, unknown>;
      // Komentar: hanya dari klien (komentar tim sendiri tidak perlu diberitahukan).
      if (row.action === "comment.added") return meta.by === "client";
      // Penugasan: hanya untuk orang yang ditugaskan, dan bukan oleh dirinya sendiri.
      if (row.action === "content.assigned") {
        return meta.assigneeId === user.id && row.actor_id !== user.id;
      }
      return true;
    })
    .slice(0, 20)
    .map((row): NotificationItem => {
      const meta = (row.meta ?? {}) as Record<string, unknown>;
      const contentId = typeof meta.contentId === "string" ? meta.contentId : null;
      return {
        id: row.id,
        kind:
          row.action === "version.approved"
            ? "approved"
            : row.action === "version.changes_requested"
              ? "revision"
              : row.action === "content.assigned"
                ? "assigned"
                : "comment",
        actor: row.actor_name ?? "Klien",
        title: typeof meta.title === "string" ? meta.title : "Konten",
        project: row.projects?.title ?? "",
        href: row.project_id
          ? contentId
            ? `/admin/projects/${row.project_id}/content/${contentId}`
            : `/admin/projects/${row.project_id}`
          : "/admin",
        createdAt: row.created_at,
        unread: row.created_at > seenAt,
      };
    });

  return { items, unread: items.filter((item) => item.unread).length };
}
