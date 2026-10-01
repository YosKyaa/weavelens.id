import "server-only";
import type { TeamOption } from "@/components/organisms/ProjectMembersForm";
import type { SessionClient } from "@/lib/supabase/server";

/** Anggota tim aktif (bukan admin) beserta jumlah proyek yang sedang ditugaskan. */
export async function loadTeamOptions(supabase: SessionClient): Promise<TeamOption[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, project_members(count)")
    .eq("role", "team")
    .eq("active", true)
    .order("full_name");
  return (data ?? []).map((profile) => ({
    id: profile.id,
    name: profile.full_name || "Tanpa nama",
    projects: profile.project_members[0]?.count ?? 0,
  }));
}
