"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { invoiceText } from "@/content/invoice";
import { requireAdmin } from "@/lib/auth";
import { todayJakarta } from "@/lib/format";
import { completeAccounts, summarizeAccounts } from "@/lib/payment";
import { paymentAccountsSchema } from "@/lib/payment-schema";

const text = invoiceText.editor;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const trimmed = (max: number) => z.string().trim().max(max);

const invoiceSchema = z
  .object({
    clientId: z.string().uuid().nullable(),
    issueDate: date,
    dueDate: date,
    billTo: z.object({
      name: trimmed(120).min(1, text.errors.name),
      company: trimmed(160),
      contact: trimmed(160),
      address: trimmed(400),
    }),
    items: z
      .array(
        z.object({
          description: trimmed(500),
          qty: z.number().int().min(1).max(100_000),
          unitPrice: z.number().int().min(0).max(999_999_999_999),
        }),
      )
      .transform((items) => items.filter((item) => item.description.length > 0))
      .refine((items) => items.length > 0, text.errors.items),
    discount: z.number().int().min(0).max(999_999_999_999),
    taxRate: z.union([z.literal(0), z.literal(11)]),
    notes: trimmed(1000),
    paymentAccounts: paymentAccountsSchema,
    paymentMethods: trimmed(200),
    paymentDetails: trimmed(400),
    signerName: trimmed(120),
    signerRole: trimmed(120),
  })
  .refine((value) => value.dueDate >= value.issueDate, {
    message: text.errors.dueDate,
    path: ["dueDate"],
  });

export type InvoiceInput = z.input<typeof invoiceSchema>;
export type SaveResult = { ok: true; id: string; number: string } | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

function refresh(id?: string) {
  revalidatePath("/admin/invoices");
  if (id) revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin");
}

const idSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const isId = (value: string) => idSchema.safeParse(value).success;

/** Simpan baru (nomor dibuat Postgres, tidak pernah duplikat) atau perbarui draf/terkirim. */
export async function saveInvoice(id: string | null, input: InvoiceInput): Promise<SaveResult> {
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? text.toast.failed };
  const { supabase } = await requireAdmin();
  const value = parsed.data;
  const accounts = completeAccounts(value.paymentAccounts);
  const summary = summarizeAccounts(accounts);

  const row = {
    client_id: value.clientId,
    issue_date: value.issueDate,
    due_date: value.dueDate,
    bill_to_name: value.billTo.name,
    bill_to_company: value.billTo.company || null,
    bill_to_contact: value.billTo.contact || null,
    bill_to_address: value.billTo.address || null,
    discount: value.discount,
    tax_rate: value.taxRate,
    notes: value.notes || null,
    payment_accounts: accounts,
    // Ringkasan teks tetap diisi; invoice lama tanpa metode terstruktur memakai teks aslinya.
    payment_methods: (accounts.length ? summary.methods : value.paymentMethods) || null,
    payment_details: (accounts.length ? summary.details : value.paymentDetails) || null,
    signer_name: value.signerName || null,
    signer_role: value.signerRole || null,
    updated_at: new Date().toISOString(),
  };

  let invoiceId = id;
  let number: string;

  if (id) {
    if (!isId(id)) return { ok: false, error: text.toast.failed };
    const { data: current } = await supabase
      .from("invoices")
      .select("status, number")
      .eq("id", id)
      .maybeSingle();
    if (!current) return { ok: false, error: text.toast.failed };
    // Invoice lunas/dibatalkan dikunci.
    if (current.status === "paid" || current.status === "void") {
      return { ok: false, error: text.readOnly.void };
    }
    const { error } = await supabase.from("invoices").update(row).eq("id", id);
    if (error) return { ok: false, error: text.toast.failed };
    number = current.number;
  } else {
    const { data: generated, error: numberError } = await supabase.rpc("next_invoice_number", {
      issue: value.issueDate,
    });
    if (numberError || !generated) return { ok: false, error: text.toast.failed };
    const { data, error } = await supabase
      .from("invoices")
      .insert({ ...row, number: generated, status: "draft" })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: text.toast.failed };
    invoiceId = data.id;
    number = generated;
  }

  // Item diganti seluruhnya: sederhana dan urutannya selalu sesuai editor.
  const { error: deleteError } = await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", invoiceId!);
  if (deleteError) return { ok: false, error: text.toast.failed };
  const { error: itemsError } = await supabase.from("invoice_items").insert(
    value.items.map((item, order) => ({
      invoice_id: invoiceId!,
      order,
      description: item.description,
      qty: item.qty,
      unit_price: item.unitPrice,
    })),
  );
  if (itemsError) return { ok: false, error: text.toast.failed };

  refresh(invoiceId!);
  return { ok: true, id: invoiceId!, number };
}

async function setStatus(
  id: string,
  from: string[],
  values: { status: string; paid_at?: string | null },
): Promise<ActionResult> {
  if (!isId(id)) return { ok: false, error: text.toast.failed };
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("invoices")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", from)
    .select("id");
  if (error || !data?.length) return { ok: false, error: text.toast.failed };
  refresh(id);
  return { ok: true };
}

export async function markSent(id: string) {
  return setStatus(id, ["draft"], { status: "sent" });
}

/** Mengembalikan ke draf (dipakai tombol "Urungkan" di toast). */
export async function markDraft(id: string) {
  return setStatus(id, ["sent"], { status: "draft" });
}

export async function markPaid(id: string, paidAt: string) {
  const day = date.catch(todayJakarta()).parse(paidAt);
  return setStatus(id, ["draft", "sent"], { status: "paid", paid_at: day });
}

export async function voidInvoice(id: string) {
  return setStatus(id, ["draft", "sent", "paid"], { status: "void" });
}

export async function deleteDraft(id: string): Promise<ActionResult> {
  if (!isId(id)) return { ok: false, error: text.toast.failed };
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (error || !data?.length) return { ok: false, error: text.toast.failed };
  refresh();
  return { ok: true };
}
