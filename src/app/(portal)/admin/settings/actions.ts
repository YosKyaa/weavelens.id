"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { completeAccounts, summarizeAccounts } from "@/lib/payment";
import { paymentAccountsSchema } from "@/lib/payment-schema";

const field = (max: number) => z.string().trim().max(max);

const settingsSchema = z.object({
  companyName: field(120).min(1, "Isi nama perusahaan."),
  phone: field(40),
  email: z.union([z.literal(""), z.string().trim().email("Format email tidak valid.")]),
  website: field(120),
  address: field(200),
  paymentAccounts: paymentAccountsSchema,
  signerName: field(120),
  signerRole: field(120),
});

export type SettingsInput = z.input<typeof settingsSchema>;
export type SettingsResult = { ok: true } | { ok: false; error: string };

export async function saveSettings(input: SettingsInput): Promise<SettingsResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Periksa isian." };
  const { supabase } = await requireAdmin();
  const value = parsed.data;
  const accounts = completeAccounts(value.paymentAccounts);
  const summary = summarizeAccounts(accounts);

  const { error } = await supabase.from("company_settings").upsert({
    id: 1,
    company_name: value.companyName,
    phone: value.phone,
    email: value.email || null,
    website: value.website,
    address: value.address,
    payment_accounts: accounts,
    // Ringkasan teks untuk kolom lama.
    payment_methods: summary.methods,
    bank_details: summary.details || null,
    signer_name: value.signerName,
    signer_role: value.signerRole,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "Gagal menyimpan. Coba lagi." };

  revalidatePath("/admin/settings");
  return { ok: true };
}

// ─── Sistem: email uji, backup, log error ──────────────────────────────────

export async function sendTestEmail(): Promise<SettingsResult> {
  const { user } = await requireAdmin();
  const { emailConfigured, emailLayout, sendEmail } = await import("@/lib/email");
  if (!emailConfigured()) {
    return { ok: false, error: "Email belum aktif: isi RESEND_API_KEY dan EMAIL_FROM di Vercel." };
  }
  if (!user.email) return { ok: false, error: "Akunmu tidak punya email." };
  const sent = await sendEmail({
    to: [user.email],
    subject: "Email uji dari portal WeaveLens",
    html: emailLayout({
      heading: "Email portal sudah berfungsi",
      paragraphs: [
        "Pemberitahuan review, pengingat otomatis, invoice, dan ringkasan tugas akan terkirim dari alamat ini.",
      ],
    }),
  });
  return sent
    ? { ok: true }
    : { ok: false, error: "Resend menolak pengiriman. Periksa domain pengirim & API key." };
}

export async function runBackupNow(): Promise<SettingsResult> {
  await requireAdmin();
  const { createServiceClient } = await import("@/lib/supabase/service");
  const { backupDatabase } = await import("@/lib/cron-jobs");
  const db = createServiceClient();
  if (!db) return { ok: false, error: "Service role key belum diatur." };
  try {
    await backupDatabase(db);
  } catch {
    return { ok: false, error: "Backup gagal. Pastikan migrasi 0011 sudah dijalankan." };
  }
  revalidatePath("/admin/settings/system");
  return { ok: true };
}

export async function backupDownloadUrl(
  name: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}\.json\.gz$/.test(name)) return { ok: false, error: "File tidak valid." };
  const { createServiceClient } = await import("@/lib/supabase/service");
  const db = createServiceClient();
  if (!db) return { ok: false, error: "Service role key belum diatur." };
  const { data } = await db.storage
    .from("backups")
    .createSignedUrl(`daily/${name}`, 300, { download: true });
  return data?.signedUrl
    ? { ok: true, url: data.signedUrl }
    : { ok: false, error: "Gagal membuat link." };
}

export async function clearErrorLog(): Promise<SettingsResult> {
  await requireAdmin();
  const { createServiceClient } = await import("@/lib/supabase/service");
  const db = createServiceClient();
  if (!db) return { ok: false, error: "Service role key belum diatur." };
  await db
    .from("error_events")
    .delete()
    .lt("created_at", new Date(Date.now() + 60_000).toISOString());
  revalidatePath("/admin/settings/system");
  return { ok: true };
}
