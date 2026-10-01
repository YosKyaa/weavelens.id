"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isId } from "@/lib/ids";
import { requirePermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const FAILED = "Gagal menyimpan. Periksa koneksi lalu coba lagi.";
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const clientSchema = z.object({
  name: z.string().trim().min(1, "Isi nama klien.").max(120),
  contactName: optional(120),
  contactEmail: z
    .string()
    .trim()
    .max(160)
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      "Format email tidak valid.",
    )
    .transform((value) => value || null),
  contactPhone: optional(40),
});

export type ClientInput = z.input<typeof clientSchema>;

export async function saveClient(
  clientId: string | null,
  input: ClientInput,
): Promise<Result<{ id: string }>> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  const { supabase } = await requirePermission("clients");
  const row = {
    name: parsed.data.name,
    contact_name: parsed.data.contactName,
    contact_email: parsed.data.contactEmail,
    contact_phone: parsed.data.contactPhone,
  };

  if (clientId) {
    if (!isId(clientId)) return { ok: false, error: FAILED };
    const { error } = await supabase.from("clients").update(row).eq("id", clientId);
    if (error) return { ok: false, error: FAILED };
    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath("/admin/clients");
    return { ok: true, id: clientId };
  }

  const { data, error } = await supabase.from("clients").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: FAILED };
  revalidatePath("/admin/clients");
  return { ok: true, id: data.id };
}

export async function deleteClient(clientId: string): Promise<Result> {
  if (!isId(clientId)) return { ok: false, error: FAILED };
  const { supabase } = await requirePermission("clients");
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  // Invoice memakai ON DELETE RESTRICT: klien yang punya invoice tidak bisa dihapus.
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23503"
          ? "Klien ini masih punya invoice. Batalkan atau pindahkan invoice-nya dulu."
          : FAILED,
    };
  }
  revalidatePath("/admin/clients");
  return { ok: true };
}

const brandSchema = z.object({
  name: z.string().trim().min(1, "Isi nama brand.").max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  instagram: optional(60),
});

export type BrandInput = z.input<typeof brandSchema>;

export async function saveBrand(
  clientId: string,
  brandId: string | null,
  input: BrandInput,
): Promise<Result<{ id: string }>> {
  if (!isId(clientId)) return { ok: false, error: FAILED };
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  const { supabase } = await requirePermission("clients");
  const row = { ...parsed.data, client_id: clientId };

  let savedId = brandId;
  if (brandId) {
    if (!isId(brandId)) return { ok: false, error: FAILED };
    const { error } = await supabase.from("brands").update(row).eq("id", brandId);
    if (error) return { ok: false, error: FAILED };
  } else {
    const { count } = await supabase
      .from("brands")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId);
    const { data, error } = await supabase
      .from("brands")
      .insert({ ...row, sort: count ?? 0 })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: FAILED };
    savedId = data.id;
  }
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true, id: savedId! };
}

export async function deleteBrand(clientId: string, brandId: string): Promise<Result> {
  if (!isId(clientId)) return { ok: false, error: FAILED };
  if (!isId(brandId)) return { ok: false, error: FAILED };
  const { supabase } = await requirePermission("clients");
  const { error } = await supabase
    .from("brands")
    .delete()
    .eq("id", brandId)
    .eq("client_id", clientId);
  if (error) return { ok: false, error: FAILED };
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true };
}

// ─── Akses portal klien ────────────────────────────────────────────────────

const inviteSchema = z.object({
  fullName: z.string().trim().min(1, "Isi nama PIC.").max(80),
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
});

export type InviteInput = z.input<typeof inviteSchema>;

/**
 * Buat (atau hubungkan) akun portal untuk PIC klien. Tanpa password: klien masuk dengan
 * link email atau Google memakai email ini. Email tim WeaveLens tidak bisa dijadikan akun klien.
 */
export async function inviteClientUser(clientId: string, input: InviteInput): Promise<Result> {
  if (!isId(clientId)) return { ok: false, error: FAILED };
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  const { supabase } = await requirePermission("clients");
  const db = createServiceClient();
  if (!db) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY belum diisi di server." };

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return { ok: false, error: FAILED };

  const { email, fullName } = parsed.data;
  let userId: string | null = null;
  const created = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (created.data.user) {
    userId = created.data.user.id;
  } else if (/already|registered|exists/i.test(created.error?.message ?? "")) {
    // Akun sudah ada: cari, lalu pastikan bukan akun tim / klien lain.
    for (let page = 1; page <= 10 && !userId; page++) {
      const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
      userId = data?.users.find((user) => user.email?.toLowerCase() === email)?.id ?? null;
      if (!data || data.users.length < 200) break;
    }
  }
  if (!userId) return { ok: false, error: FAILED };

  const { data: existing } = await db
    .from("profiles")
    .select("role, client_id")
    .eq("id", userId)
    .maybeSingle();
  if (existing && existing.role !== "client") {
    return {
      ok: false,
      error: "Email ini dipakai akun tim WeaveLens. Pakai email lain untuk klien.",
    };
  }
  if (existing?.client_id && existing.client_id !== clientId) {
    return { ok: false, error: "Email ini sudah terhubung ke klien lain." };
  }

  const { error } = await db.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    role: "client",
    client_id: clientId,
    active: true,
  });
  if (error) return { ok: false, error: FAILED };
  await db.auth.admin.updateUserById(userId, { ban_duration: "none" });

  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true };
}

/** Nonaktifkan / aktifkan lagi akun portal klien (data tetap tersimpan). */
export async function setClientUserActive(
  clientId: string,
  userId: string,
  active: boolean,
): Promise<Result> {
  if (!isId(clientId) || !isId(userId)) return { ok: false, error: FAILED };
  await requirePermission("clients");
  const db = createServiceClient();
  if (!db) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY belum diisi di server." };
  const { data, error } = await db
    .from("profiles")
    .update({ active: active === true })
    .eq("id", userId)
    .eq("role", "client")
    .eq("client_id", clientId)
    .select("id");
  if (error || !data?.length) return { ok: false, error: FAILED };
  await db.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true };
}
