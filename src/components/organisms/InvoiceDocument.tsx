import { Globe, MapPin, Phone } from "lucide-react";
import { invoiceText } from "@/content/invoice";
import { formatDate } from "@/lib/format";
import {
  computeTotals,
  formatRupiah,
  lineTotal,
  type CompanyInfo,
  type InvoiceDraft,
} from "@/lib/invoice";
import { cn } from "@/lib/utils";

const t = invoiceText.document;

type InvoiceDocumentProps = {
  invoice: InvoiceDraft;
  company: CompanyInfo;
  className?: string;
};

/** Gambar dari /public diwarnai sekunder lewat CSS mask (logo & ornamen tetap tajam saat dicetak). */
function Tinted({ src, className }: { src: string; className: string }) {
  return (
    <span
      aria-hidden
      className={cn("block bg-sand", className)}
      style={{
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
    />
  );
}

/**
 * Dokumen invoice A4 sesuai template brand (SPEC-PORTAL A6).
 * Komponen yang sama dipakai untuk pratinjau di layar dan untuk cetak/PDF.
 */
export function InvoiceDocument({ invoice, company, className }: InvoiceDocumentProps) {
  const totals = computeTotals(invoice.items, invoice.discount, invoice.taxRate);
  const items = invoice.items.filter((item) => item.description.trim() || item.unitPrice > 0);
  const stamp =
    invoice.status === "paid" ? t.paidStamp : invoice.status === "void" ? t.voidStamp : null;

  return (
    <article
      className={cn(
        "invoice-doc relative flex min-h-[297mm] w-[210mm] flex-col overflow-hidden bg-brand px-[14mm] py-[14mm] font-sans text-[10.5pt] leading-snug text-sand",
        className,
      )}
    >
      <Tinted
        src="/brand/ornament.svg"
        className="pointer-events-none absolute -right-[18mm] -bottom-[18mm] size-[95mm] opacity-[0.08]"
      />

      <header className="relative flex items-start justify-between gap-8">
        <Tinted src="/brand/logo.svg" className="h-[12mm] w-[48mm] [mask-position:left]" />
        {stamp && (
          <span className="rotate-[-8deg] rounded-md border-2 border-sand px-3 py-1 font-heading text-[14pt] font-bold tracking-widest">
            {stamp}
          </span>
        )}
      </header>

      <section className="relative mt-[12mm] grid grid-cols-[1fr_auto] gap-8">
        <div>
          <h1 className="font-heading text-[34pt] leading-none font-bold text-sand">{t.title}</h1>
          <p className="mt-2 font-heading text-[12pt] font-semibold">
            {t.numberPrefix} {invoice.number ?? t.draftNumber}
          </p>
        </div>
        <dl className="grid min-w-[62mm] gap-3 text-right">
          <div>
            <dt className="text-[8.5pt] opacity-80">{t.date}</dt>
            <dd className="font-heading font-semibold">{formatDate(invoice.issueDate)}</dd>
          </div>
          <div>
            <dt className="text-[8.5pt] opacity-80">{t.billTo}</dt>
            <dd className="font-heading font-semibold">{invoice.billTo.name || "—"}</dd>
            {invoice.billTo.company && <dd>{invoice.billTo.company}</dd>}
            {invoice.billTo.contact && <dd className="opacity-90">{invoice.billTo.contact}</dd>}
            {invoice.billTo.address && (
              <dd className="max-w-[62mm] whitespace-pre-line opacity-90">
                {invoice.billTo.address}
              </dd>
            )}
          </div>
          <div>
            <dt className="text-[8.5pt] opacity-80">{t.totalDue}</dt>
            <dd className="font-heading text-[16pt] font-bold">{formatRupiah(totals.total)}</dd>
            <dd className="text-[8.5pt] opacity-80">
              {t.due} {formatDate(invoice.dueDate)}
            </dd>
          </div>
        </dl>
      </section>

      <table className="relative mt-[9mm] w-full border-collapse overflow-hidden rounded-md bg-sand text-ink">
        <thead>
          <tr className="bg-sand-deep text-left font-heading text-[9pt]">
            <th className="w-[12mm] border-b-2 border-brand px-3 py-2.5">{t.columns.no}</th>
            <th className="border-b-2 border-brand px-3 py-2.5">{t.columns.description}</th>
            <th className="w-[32mm] border-b-2 border-brand px-3 py-2.5 text-right">
              {t.columns.price}
            </th>
            <th className="w-[13mm] border-b-2 border-brand px-3 py-2.5 text-center">
              {t.columns.qty}
            </th>
            <th className="w-[34mm] border-b-2 border-brand px-3 py-2.5 text-right">
              {t.columns.total}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.key} className="invoice-row border-b border-brand/25 last:border-b-0">
              <td className="px-3 py-2.5 align-top font-heading font-semibold">
                {String(index + 1).padStart(2, "0")}
              </td>
              <td className="px-3 py-2.5 align-top whitespace-pre-line">{item.description}</td>
              <td className="px-3 py-2.5 text-right align-top tabular-nums">
                {formatRupiah(item.unitPrice)}
              </td>
              <td className="px-3 py-2.5 text-center align-top tabular-nums">{item.qty}</td>
              <td className="px-3 py-2.5 text-right align-top font-semibold tabular-nums">
                {formatRupiah(lineTotal(item))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="invoice-keep relative mt-[8mm] grid grid-cols-[1fr_78mm] gap-8">
        <div className="grid content-start gap-2 text-[9.5pt]">
          {company.phone && (
            <p className="flex items-center gap-2">
              <Phone aria-hidden className="size-[3.5mm]" />
              {company.phone}
            </p>
          )}
          {company.website && (
            <p className="flex items-center gap-2">
              <Globe aria-hidden className="size-[3.5mm]" />
              {company.website}
            </p>
          )}
          {company.address && (
            <p className="flex items-center gap-2">
              <MapPin aria-hidden className="size-[3.5mm]" />
              {company.address}
            </p>
          )}
          {(invoice.paymentMethods || invoice.paymentDetails) && (
            <div className="mt-3">
              <p className="font-heading font-semibold">{t.paymentMethod}</p>
              {invoice.paymentMethods && <p>{invoice.paymentMethods}</p>}
              {invoice.paymentDetails && (
                <p className="whitespace-pre-line opacity-90">{invoice.paymentDetails}</p>
              )}
            </div>
          )}
        </div>

        <div>
          <dl className="grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-1.5 tabular-nums">
            <dt>{t.subtotal}</dt>
            <dd>:</dd>
            <dd className="text-right">{formatRupiah(totals.subtotal)}</dd>
            {totals.discount > 0 && (
              <>
                <dt>{t.discount}</dt>
                <dd>:</dd>
                <dd className="text-right">− {formatRupiah(totals.discount)}</dd>
              </>
            )}
            {invoice.taxRate > 0 && (
              <>
                <dt>{t.tax(invoice.taxRate)}</dt>
                <dd>:</dd>
                <dd className="text-right">{formatRupiah(totals.tax)}</dd>
              </>
            )}
          </dl>
          <div className="mt-3 flex items-center justify-between rounded-md bg-sand px-4 py-3 text-ink">
            <span className="font-heading font-bold tracking-wide">{t.grandTotal}</span>
            <span className="font-heading text-[13pt] font-bold tabular-nums">
              {formatRupiah(totals.total)}
            </span>
          </div>
        </div>
      </section>

      {invoice.notes && (
        <section className="invoice-keep relative mt-[7mm] text-[9.5pt]">
          <p className="font-heading font-semibold">{t.notes}</p>
          <p className="whitespace-pre-line opacity-90">{invoice.notes}</p>
        </section>
      )}

      <footer className="invoice-keep relative mt-auto grid grid-cols-[1fr_70mm] items-end gap-8 pt-[10mm]">
        <div>
          <p className="font-heading text-[16pt] leading-tight font-bold">{t.thanks}</p>
          {company.website && <p className="mt-1 opacity-90">{company.website}</p>}
        </div>
        <div className="rounded-md bg-sand px-4 pt-[14mm] pb-3 text-center text-ink">
          <p className="border-t border-brand/40 pt-2 font-heading font-semibold">
            {invoice.signerName || "—"}
          </p>
          <p className="text-[9pt]">{invoice.signerRole}</p>
        </div>
      </footer>
    </article>
  );
}
