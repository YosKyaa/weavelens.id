import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { site } from "@/content/site";
import { emailConfigured, emailLayout, sendEmail } from "@/lib/email";
import type { Database } from "@/types/database";

/**
 * Email pemberitahuan (opsional, lewat Resend). Dipanggil dengan `after()` supaya tidak
 * memperlambat respons. `db` harus klien service role (butuh email dari auth.users).
 */

type Db = SupabaseClient<Database>;

function origin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, "");
}

async function emailsOf(db: Db, ids: string[]): Promise<string[]> {
  const users = await Promise.all(
    [...new Set(ids)].map((id) => db.auth.admin.getUserById(id).then((result) => result.data.user)),
  );
  return users.flatMap((user) => (user?.email ? [user.email] : []));
}

/** Klien menyetujui / minta revisi → admin aktif + tim yang ditugaskan di proyek itu. */
export async function emailTeamDecision(
  db: Db,
  input: {
    projectId: string;
    contentId: string;
    title: string;
    decision: "approved" | "changes_requested";
    actorName: string;
  },
) {
  if (!emailConfigured()) return;
  const [{ data: admins }, { data: members }, { data: project }] = await Promise.all([
    db.from("profiles").select("id").eq("role", "admin").eq("active", true),
    db
      .from("project_members")
      .select("profile_id, profiles!inner(active)")
      .eq("project_id", input.projectId),
    db.from("projects").select("title").eq("id", input.projectId).maybeSingle(),
  ]);
  const ids = [
    ...(admins ?? []).map((row) => row.id),
    ...(members ?? []).filter((row) => row.profiles.active).map((row) => row.profile_id),
  ];
  const approved = input.decision === "approved";
  await sendEmail({
    to: await emailsOf(db, ids),
    subject: approved ? `Disetujui: ${input.title}` : `Revisi diminta: ${input.title}`,
    html: emailLayout({
      heading: approved
        ? `${input.actorName} menyetujui "${input.title}"`
        : `${input.actorName} minta revisi "${input.title}"`,
      paragraphs: [
        project?.title ? `Proyek: ${project.title}.` : "",
        approved
          ? "Konten ini siap dijadwalkan."
          : "Buka desainnya untuk melihat titik komentar dari klien.",
      ].filter(Boolean),
      action: {
        label: "Buka desain",
        href: `${origin()}/admin/projects/${input.projectId}/content/${input.contentId}`,
      },
    }),
  });
}

/**
 * Desain siap direview → email kontak klien + akun portal klien.
 * Satu desain: tombol langsung ke desain itu. Banyak desain (unggah banyak): satu email ringkasan
 * berisi daftar judul dan tombol ke daftar konten (mode review berurutan ada di sana).
 */
export async function emailClientReviewReady(
  db: Db,
  input: { projectId: string; contentIds: string[]; versionNo: number },
) {
  if (!emailConfigured() || input.contentIds.length === 0) return;
  const [{ data: project }, { data: contents }] = await Promise.all([
    db
      .from("projects")
      .select("title, client_id, status, clients(contact_email)")
      .eq("id", input.projectId)
      .maybeSingle(),
    db
      .from("design_assets")
      .select("id, title, brand_id")
      .eq("project_id", input.projectId)
      .in("id", input.contentIds),
  ]);
  if (!project || project.status === "draft" || !contents?.length) return;

  const [{ data: portalUsers }, { data: links }] = await Promise.all([
    db
      .from("profiles")
      .select("id")
      .eq("role", "client")
      .eq("active", true)
      .eq("client_id", project.client_id),
    db
      .from("share_links")
      .select("token, brand_id, expires_at")
      .eq("project_id", input.projectId)
      .eq("can_review", true)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);
  const now = Date.now();
  const brandIds = new Set(contents.map((item) => item.brand_id));
  // Link paling spesifik dulu: link brand konten (jika semua satu brand), lalu link semua brand.
  const link = (links ?? [])
    .filter((item) => !item.expires_at || new Date(item.expires_at).getTime() > now)
    .filter((item) => !item.brand_id || (brandIds.size === 1 && brandIds.has(item.brand_id)))
    .sort((a, b) => Number(Boolean(b.brand_id)) - Number(Boolean(a.brand_id)))[0];
  const single = contents.length === 1 ? contents[0] : null;
  const base = link
    ? `${origin()}/share/${link.token}`
    : `${origin()}/client/projects/${input.projectId}`;
  const href = single ? `${base}/content/${single.id}` : base;

  const to = [
    ...(project.clients?.contact_email ? [project.clients.contact_email] : []),
    ...(await emailsOf(
      db,
      (portalUsers ?? []).map((row) => row.id),
    )),
  ];
  const howTo =
    'Klik bagian desain untuk memberi komentar, lalu tekan "Setujui desain" kalau sudah oke atau "Minta revisi" kalau perlu diubah.';
  await sendEmail({
    to,
    subject: single
      ? `Desain siap direview: ${single.title}`
      : `${contents.length} desain siap direview: ${project.title}`,
    html: emailLayout(
      single
        ? {
            heading: `Desain "${single.title}" siap direview`,
            paragraphs: [
              `${input.versionNo > 1 ? `Versi ${input.versionNo} (hasil revisi)` : "Versi pertama"} untuk proyek ${project.title} sudah bisa dilihat.`,
              howTo,
            ],
            action: { label: "Review desain", href },
          }
        : {
            heading: `${contents.length} desain siap direview`,
            paragraphs: [
              `Proyek ${project.title}: ${contents.map((item) => item.title).join(", ")}.`,
              `Tekan "Mulai review" untuk membuka semuanya satu per satu. ${howTo}`,
            ],
            action: { label: "Mulai review", href },
          },
    ),
  });
}
