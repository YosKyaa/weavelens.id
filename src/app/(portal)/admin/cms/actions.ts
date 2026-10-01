"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { CMS_BASE, findCollection, type CmsCollection } from "@/lib/cms/collections";
import { CMS_TAG } from "@/lib/cms/data";
import { parseForm, type FieldErrors } from "@/lib/cms/validate";
import { MEDIA_BUCKET } from "@/lib/supabase/env";
import { cmsFrom } from "@/lib/cms/untyped";
import type { SessionClient } from "@/lib/supabase/server";

export type FormState = { error?: string; fieldErrors?: FieldErrors };

const NOT_ALLOWED = "Sesi habis atau akun ini bukan admin. Silakan masuk ulang.";

/** Menyegarkan halaman publik dan daftar admin setelah data berubah. */
function refresh(collection: CmsCollection) {
  revalidateTag(CMS_TAG);
  revalidatePath(`${CMS_BASE}/${collection.slug}`);
  revalidatePath(CMS_BASE);
}

const argsSchema = z.object({
  slug: z.string().min(1).max(40),
  id: z.string().min(1).max(100).nullable(),
});

/** Validasi argumen → cek peran admin → kembalikan koleksi dan akses tabelnya. */
async function prepare(slug: string, id: string | null = null) {
  const args = argsSchema.parse({ slug, id });
  const collection = findCollection(args.slug);
  if (!collection) throw new Error(`Koleksi "${args.slug}" tidak dikenal.`);
  const { supabase } = await requirePermission("cms");
  return { collection, supabase, table: () => cmsFrom(supabase, collection.table) };
}

// ─── CRUD ──────────────────────────────────────────────────────────────────

export async function saveItem(
  slug: string,
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { collection, supabase, table } = await prepare(slug, id);

  const { values, errors } = parseForm(collection, formData);
  if (Object.keys(errors).length > 0) {
    return { error: "Periksa kembali isian yang ditandai.", fieldErrors: errors };
  }

  const row = { ...values, updated_at: new Date().toISOString() };
  let result;

  if (collection.singleton) {
    result = await table().upsert({ id: 1, ...row });
  } else if (id) {
    const { data: before } = await table().select("*").eq("id", id).maybeSingle();
    result = await table().update(row).eq("id", id);
    // Foto yang diganti dihapus dari Storage agar bucket tidak menumpuk file yatim.
    if (!result.error && before) {
      for (const field of collection.fields) {
        if (field.type === "image" && before[field.name] !== values[field.name]) {
          await removeStoredImage(supabase, before[field.name]);
        }
      }
    }
  } else {
    // Item baru masuk di urutan paling akhir.
    const { data: last } = await table()
      .select("sort")
      .order("sort", { ascending: false })
      .limit(1)
      .maybeSingle();
    result = await table().insert({ ...row, sort: (last?.sort ?? -1) + 1 });
  }

  if (result.error) {
    console.error(`[cms] saveItem ${collection.table}:`, result.error.message);
    return { error: result.error.code === "42501" ? NOT_ALLOWED : "Gagal menyimpan. Coba lagi." };
  }

  refresh(collection);
  redirect(
    `${CMS_BASE}/${collection.slug}?status=${id || collection.singleton ? "saved" : "created"}`,
  );
}

/** Hapus foto dari Storage jika berasal dari bucket CMS (foto bawaan di /public dibiarkan). */
async function removeStoredImage(supabase: SessionClient, url: unknown) {
  if (typeof url !== "string") return;
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;
  await supabase.storage.from(MEDIA_BUCKET).remove([url.slice(index + marker.length)]);
}

export async function deleteItem(slug: string, id: string) {
  const { collection, supabase, table } = await prepare(slug, id);

  const imageFields = collection.fields.filter((field) => field.type === "image");
  const { data: existing } = await table().select("*").eq("id", id).maybeSingle();

  const { error } = await table().delete().eq("id", id);
  if (error) {
    console.error(`[cms] deleteItem ${collection.table}:`, error.message);
    redirect(`${CMS_BASE}/${collection.slug}?status=error`);
  }

  for (const field of imageFields) await removeStoredImage(supabase, existing?.[field.name]);

  refresh(collection);
  redirect(`${CMS_BASE}/${collection.slug}?status=deleted`);
}

export async function setVisible(slug: string, id: string, visible: boolean) {
  const { collection, table } = await prepare(slug, id);
  await table()
    .update({ visible: visible === true })
    .eq("id", id);
  refresh(collection);
}

/** Tukar urutan item dengan tetangganya (atas/bawah), lalu rapikan nilai sort. */
export async function moveItem(slug: string, id: string, direction: -1 | 1) {
  const { collection, table } = await prepare(slug, id);
  if (direction !== -1 && direction !== 1) return;

  const { data } = await table().select("id").order("sort").order("id");
  const ids = (data ?? []).map((row) => String(row.id));
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= ids.length) return;

  [ids[from], ids[to]] = [ids[to], ids[from]];
  await Promise.all(ids.map((rowId, sort) => table().update({ sort }).eq("id", rowId)));
  refresh(collection);
}
