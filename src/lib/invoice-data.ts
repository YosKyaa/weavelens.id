import "server-only";
import { todayJakarta } from "@/lib/format";
import { newItemKey, type CompanyInfo, type InvoiceDraft } from "@/lib/invoice";
import { parseAccounts } from "@/lib/payment";
import type { SessionClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

const EMPTY_COMPANY: CompanyInfo = {
  companyName: "WeaveLens",
  phone: "",
  email: "",
  website: "weavelens.id",
  address: "",
  paymentAccounts: [],
  paymentMethods: "",
  bankDetails: "",
  signerName: "",
  signerRole: "",
};

export async function loadCompany(supabase: SessionClient): Promise<CompanyInfo> {
  const { data } = await supabase.from("company_settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return EMPTY_COMPANY;
  return {
    companyName: data.company_name,
    phone: data.phone,
    email: data.email ?? "",
    website: data.website,
    address: data.address,
    paymentAccounts: parseAccounts(data.payment_accounts),
    paymentMethods: data.payment_methods,
    bankDetails: data.bank_details ?? "",
    signerName: data.signer_name,
    signerRole: data.signer_role,
  };
}

function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

/** Draf kosong berisi data bawaan perusahaan (metode bayar, rekening, penanda tangan). */
export function blankInvoice(company: CompanyInfo): InvoiceDraft {
  const today = todayJakarta();
  return {
    number: null,
    status: "draft",
    clientId: null,
    issueDate: today,
    dueDate: addDays(today, 7),
    billTo: { name: "", company: "", contact: "", address: "" },
    items: [{ key: newItemKey(), description: "", qty: 1, unitPrice: 0 }],
    discount: 0,
    taxRate: 0,
    notes: "",
    paymentAccounts: company.paymentAccounts,
    // Bawaan lama hanya dipakai bila belum ada metode terstruktur.
    paymentMethods: company.paymentAccounts.length ? "" : company.paymentMethods,
    paymentDetails: company.paymentAccounts.length ? "" : company.bankDetails,
    signerName: company.signerName,
    signerRole: company.signerRole,
    paidAt: null,
  };
}

type InvoiceRow = Tables<"invoices"> & { invoice_items: Tables<"invoice_items">[] };

export function rowToDraft(row: InvoiceRow): InvoiceDraft {
  return {
    number: row.number,
    status: row.status as InvoiceDraft["status"],
    clientId: row.client_id,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    billTo: {
      name: row.bill_to_name ?? "",
      company: row.bill_to_company ?? "",
      contact: row.bill_to_contact ?? "",
      address: row.bill_to_address ?? "",
    },
    items: [...row.invoice_items]
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        key: item.id,
        description: item.description,
        qty: item.qty,
        unitPrice: item.unit_price,
      })),
    discount: row.discount,
    taxRate: row.tax_rate === 11 ? 11 : 0,
    notes: row.notes ?? "",
    paymentAccounts: parseAccounts(row.payment_accounts),
    paymentMethods: row.payment_methods ?? "",
    paymentDetails: row.payment_details ?? "",
    signerName: row.signer_name ?? "",
    signerRole: row.signer_role ?? "",
    paidAt: row.paid_at,
  };
}

export async function loadInvoice(supabase: SessionClient, id: string) {
  const { data } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .maybeSingle();
  return data ? rowToDraft(data) : null;
}

export async function loadClientOptions(supabase: SessionClient) {
  const { data } = await supabase
    .from("clients")
    .select("id, name, contact_name, contact_email, contact_phone")
    .order("name");
  return (data ?? []).map((client) => ({
    id: client.id,
    name: client.name,
    contactName: client.contact_name,
    contact: client.contact_email ?? client.contact_phone,
  }));
}
