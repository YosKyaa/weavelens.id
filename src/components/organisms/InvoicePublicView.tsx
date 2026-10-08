"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";
import { ScaledPage } from "@/components/molecules/ScaledPage";
import { InvoiceDocument } from "@/components/organisms/InvoiceDocument";
import { Button } from "@/components/ui/button";
import type { CompanyInfo, InvoiceDraft } from "@/lib/invoice";

/** Tampilan invoice untuk klien: pratinjau A4 + unduh PDF (cetak browser, identik dengan pratinjau). */
export function InvoicePublicView({
  invoice,
  company,
}: {
  invoice: InvoiceDraft;
  company: CompanyInfo;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const doc = <InvoiceDocument invoice={invoice} company={company} />;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/70">
          Tekan <strong>Unduh PDF</strong>, lalu pilih &ldquo;Simpan sebagai PDF&rdquo; di jendela
          cetak.
        </p>
        <Button onClick={() => window.print()}>
          <Download aria-hidden />
          Unduh PDF
        </Button>
      </div>
      <div className="mx-auto mt-5 w-full max-w-[794px]">
        <ScaledPage label={`Invoice ${invoice.number ?? ""}`}>{doc}</ScaledPage>
      </div>
      {mounted && createPortal(<div className="print-root">{doc}</div>, document.body)}
    </>
  );
}
