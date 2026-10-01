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
