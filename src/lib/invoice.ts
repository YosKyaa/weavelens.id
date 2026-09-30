/**
 * Model dan hitungan invoice. Satu-satunya tempat rumus total: dipakai editor, pratinjau,
 * dokumen cetak, daftar invoice, dan server action, supaya angkanya selalu sama.
 */

export type InvoiceItem = {
  /** Kunci lokal untuk React; tidak disimpan. */
  key: string;
  description: string;
  qty: number;
  /** Rupiah, bilangan bulat. */
  unitPrice: number;
};

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export type InvoiceDraft = {
  number: string | null;
  status: InvoiceStatus;
  clientId: string | null;
  issueDate: string;
  dueDate: string;
  billTo: { name: string; company: string; contact: string; address: string };
  items: InvoiceItem[];
  discount: number;
  taxRate: 0 | 11;
  notes: string;
  paymentMethods: string;
  paymentDetails: string;
  signerName: string;
  signerRole: string;
  paidAt: string | null;
};

export type CompanyInfo = {
  companyName: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  paymentMethods: string;
  bankDetails: string;
  signerName: string;
  signerRole: string;
};

export type InvoiceTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
};

export function lineTotal(item: Pick<InvoiceItem, "qty" | "unitPrice">): number {
  return Math.max(0, Math.round(item.qty)) * Math.max(0, Math.round(item.unitPrice));
}

/** PPN dihitung dari subtotal setelah diskon, dibulatkan ke rupiah terdekat. */
export function computeTotals(
  items: Pick<InvoiceItem, "qty" | "unitPrice">[],
  discount: number,
  taxRate: number,
): InvoiceTotals {
  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
  const appliedDiscount = Math.min(Math.max(0, Math.round(discount)), subtotal);
  const tax = Math.round(((subtotal - appliedDiscount) * taxRate) / 100);
  return { subtotal, discount: appliedDiscount, tax, total: subtotal - appliedDiscount + tax };
}

const rupiah = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 2344000 → "Rp 2.344.000" (tanpa desimal, sesuai template invoice). */
export function formatRupiah(value: number): string {
  return `Rp ${rupiah.format(Math.round(value))}`;
}

/** 2344000 → "2.344.000" untuk kolom input harga. */
export function formatThousands(value: number): string {
  return value ? rupiah.format(value) : "";
}

/** "2.344.000" / "Rp2,344,000" → 2344000. Karakter selain angka diabaikan. */
export function parseRupiah(input: string): number {
  const digits = input.replace(/\D/g, "");
  return digits ? Math.min(Number.parseInt(digits, 10), 999_999_999_999) : 0;
}

export function newItemKey(): string {
  return Math.random().toString(36).slice(2, 10);
}
