/**
 * Data awal portal: admin pertama, data perusahaan untuk invoice, satu klien contoh,
 * dan satu proyek contoh beserta rencana kerjanya. Aman dijalankan berulang.
 *
 *   npm run portal:seed
 *
 * Env (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   wajib
 *   PORTAL_ADMIN_PASSWORD      wajib saat admin belum ada (min. 12 karakter)
 *   PORTAL_DEMO_CLIENT_EMAIL   opsional: email untuk mencoba login klien lewat magic link
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const ADMIN_EMAIL = "weavelens.studio@gmail.com";
const DEMO_CLIENT_NAME = "Klien Contoh — Panitia Wisuda";
const DEMO_PROJECT_TITLE = "Dokumentasi & desain wisuda (contoh)";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!url || !serviceKey) {
  console.error("Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local dulu.");
  process.exit(1);
}

const db = createClient<Database>(url, serviceKey, { auth: { persistSession: false } });

function fail(step: string, message: string): never {
  console.error(`✗ ${step}: ${message}`);
  process.exit(1);
}

/** Cari user berdasarkan email (daftar user dipaginasi per 200). */
async function findUser(email: string) {
  for (let page = 1; page < 50; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail("cari user", error.message);
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(email: string, fullName: string, password?: string) {
  const existing = await findUser(email);
  if (existing) return { user: existing, created: false };

  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) fail(`buat user ${email}`, error?.message ?? "tanpa data");
  return { user: data.user, created: true };
}

/** Profil dibuat trigger saat user dibuat; upsert di sini juga menangani user lama. */
async function setProfile(id: string, values: Database["public"]["Tables"]["profiles"]["Update"]) {
  const { error } = await db.from("profiles").upsert({ id, ...values });
  if (error) fail("profil", error.message);
}

async function main() {
  // 1. Admin pertama.
  const existingAdmin = await findUser(ADMIN_EMAIL);
  const password = process.env.PORTAL_ADMIN_PASSWORD;
  if (!existingAdmin && (!password || password.length < 12)) {
    fail("admin", "isi PORTAL_ADMIN_PASSWORD (min. 12 karakter) di .env.local untuk membuat admin");
  }
  const { user: admin, created } = await ensureUser(ADMIN_EMAIL, "Tim WeaveLens", password);
  await setProfile(admin.id, { role: "admin", full_name: "Tim WeaveLens", client_id: null });
  console.log(`✓ admin ${ADMIN_EMAIL} ${created ? "dibuat" : "sudah ada (password tidak diubah)"}`);

  // 2. Data perusahaan untuk invoice (tidak menimpa yang sudah diubah di Pengaturan).
  const { data: company } = await db
    .from("company_settings")
    .select("id")
    .eq("id", 1)
    .maybeSingle();
  if (!company) {
    const { error } = await db.from("company_settings").insert({
      id: 1,
      company_name: "WeaveLens",
      phone: "+62 821-1218-7810",
      website: "weavelens.id",
      address: "Jakarta",
      payment_methods: "Transfer bank · QRIS",
      signer_name: "Tim WeaveLens",
      signer_role: "Admin",
    });
    if (error) fail("company_settings", error.message);
    console.log("✓ data perusahaan untuk invoice (ubah nama penanda tangan & rekening nanti)");
  } else {
    console.log("– data perusahaan sudah ada, dilewati");
  }

  // 3. Klien contoh.
  let { data: client } = await db
    .from("clients")
    .select("id")
    .eq("name", DEMO_CLIENT_NAME)
    .maybeSingle();
  if (!client) {
    const result = await db
      .from("clients")
      .insert({
        name: DEMO_CLIENT_NAME,
        contact_name: "Ketua Panitia (contoh)",
        contact_email: process.env.PORTAL_DEMO_CLIENT_EMAIL ?? null,
      })
      .select("id")
      .single();
    if (result.error) fail("klien contoh", result.error.message);
    client = result.data;
    console.log(`✓ klien "${DEMO_CLIENT_NAME}"`);
  } else {
    console.log("– klien contoh sudah ada, dilewati");
  }

  // 4. Proyek contoh + rencana kerja.
  const { data: project } = await db
    .from("projects")
    .select("id")
    .eq("title", DEMO_PROJECT_TITLE)
    .maybeSingle();
  if (!project) {
    const eventDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const result = await db
      .from("projects")
      .insert({
        client_id: client.id,
        type: "mixed",
        title: DEMO_PROJECT_TITLE,
        event_date: eventDate,
        status: "active",
      })
      .select("id")
      .single();
    if (result.error) fail("proyek contoh", result.error.message);

    const plan = [
      { title: "Brief & moodboard", status: "done" },
      { title: "Desain backdrop & konten feed", status: "in_progress" },
      { title: "Liputan foto & video di hari acara", status: "planned" },
      { title: "Seleksi foto oleh klien & edit", status: "planned" },
    ];
    const { error } = await db
      .from("plan_items")
      .insert(plan.map((item, order) => ({ ...item, order, project_id: result.data.id })));
    if (error) fail("rencana kerja", error.message);
    console.log(`✓ proyek "${DEMO_PROJECT_TITLE}" + ${plan.length} tahap rencana kerja`);
  } else {
    console.log("– proyek contoh sudah ada, dilewati");
  }

  // 5. Opsional: akun klien untuk mencoba magic link.
  const demoEmail = process.env.PORTAL_DEMO_CLIENT_EMAIL;
  if (demoEmail) {
    const { user } = await ensureUser(demoEmail, "Klien contoh");
    await setProfile(user.id, { role: "client", client_id: client.id });
    console.log(`✓ akun klien ${demoEmail} terhubung ke klien contoh`);
  }
}

main();
