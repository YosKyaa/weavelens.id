import { TeamManager, type MemberRow } from "@/components/organisms/TeamManager";
import { teamText } from "@/content/team";
import { requireAdmin } from "@/lib/auth";
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
  const [{ data: profiles }, emails] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, active, project_members(projects(title))")
      .in("role", ["admin", "team"])
      .order("role")
      .order("full_name"),
    emailsById(),
  ]);

  const members: MemberRow[] = (profiles ?? []).map((profile) => ({
    id: profile.id,
    name: profile.full_name || emails.get(profile.id) || "Tanpa nama",
    email: emails.get(profile.id) ?? "",
    role: profile.role === "admin" ? "admin" : "team",
    active: profile.active,
    projects: profile.project_members.flatMap((member) =>
      member.projects ? [member.projects.title] : [],
    ),
    isSelf: profile.id === user.id,
  }));

  return (
    <>
      <div className="grid gap-8">
        <TeamManager members={members} />

        <section
          aria-labelledby="access-heading"
          className="overflow-hidden rounded-2xl border border-line bg-paper"
        >
          <h2 id="access-heading" className="border-b border-line px-5 py-4 text-base">
            {teamText.access.title}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="bg-sand/40 text-left font-heading">
                  <th className="px-5 py-3 font-semibold">Fitur</th>
                  <th className="px-5 py-3 font-semibold">Admin</th>
                  <th className="px-5 py-3 font-semibold">Tim</th>
                </tr>
              </thead>
              <tbody>
                {teamText.access.rows.map(([feature, admin, team]) => (
                  <tr key={feature} className="border-t border-line">
                    <td className="px-5 py-3 font-medium text-ink">{feature}</td>
                    <td className="px-5 py-3 text-ink/80">{admin}</td>
                    <td className="px-5 py-3 text-ink/80">{team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
