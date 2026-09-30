"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { idSchema, isId } from "@/lib/ids";
import { requireAdmin } from "@/lib/auth";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const FAILED = "Gagal menyimpan. Periksa koneksi lalu coba lagi.";
const id = idSchema;
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
  const { supabase } = await requireAdmin();
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
  const { supabase } = await requireAdmin();
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
  const { supabase } = await requireAdmin();
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
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("brands")
    .delete()
    .eq("id", brandId)
    .eq("client_id", clientId);
  if (error) return { ok: false, error: FAILED };
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true };
}
