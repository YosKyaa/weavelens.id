import { TeamManager, type MemberRow } from "@/components/organisms/TeamManager";
import type { TeamRoleRow } from "@/components/organisms/TeamRolesManager";
import { requireAdmin } from "@/lib/auth";
import { PERMISSION_KEYS, type Permission } from "@/lib/permissions";
import { googleEnabled } from "@/lib/supabase/providers";
import { createServiceClient } from "@/lib/supabase/service";

/** Email ada di auth.users (bukan tabel profil), jadi dibaca lewat service role. */
async function emailsById(): Promise<Map<string, string>> {
  const db = createServiceClient();
  if (!db) return new Map();
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 500 });
  return new Map((data?.users ?? []).map((user) => [user.id, user.email ?? ""]));
}

export default async function TeamPage() {
  const { supabase, user } = await requireAdmin();
  const [{ data: profiles }, { data: teamRoles }, emails, google] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, role, phone, active, profile_team_roles(team_role_id, team_roles(name, created_at)), project_members(projects(title))",
      )
      .in("role", ["admin", "team"])
      .order("role")
      .order("full_name"),
    supabase.from("team_roles").select("id, name, description, permissions").order("created_at"),
    emailsById(),
    googleEnabled(),
  ]);

  const members: MemberRow[] = (profiles ?? []).map((profile) => ({
    id: profile.id,
    name: profile.full_name || emails.get(profile.id) || "Tanpa nama",
    email: emails.get(profile.id) ?? "",
    access:
      profile.role === "admin"
        ? "admin"
        : profile.profile_team_roles.map((item) => item.team_role_id),
    roleNames:
      profile.role === "admin"
        ? ["Admin"]
        : profile.profile_team_roles
            .flatMap((item) => (item.team_roles ? [item.team_roles] : []))
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map((role) => role.name),
    phone: profile.phone,
    active: profile.active,
    projects: profile.project_members.flatMap((member) =>
      member.projects ? [member.projects.title] : [],
    ),
    isSelf: profile.id === user.id,
  }));

  const roles: TeamRoleRow[] = (teamRoles ?? []).map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions.filter((key): key is Permission =>
      (PERMISSION_KEYS as string[]).includes(key),
    ),
    members: members.filter(
      (member) => member.access !== "admin" && member.access.includes(role.id),
    ).length,
  }));

  return <TeamManager members={members} roles={roles} google={google} />;
}
