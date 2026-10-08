import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/atoms/Logo";
import { InvoicePublicView } from "@/components/organisms/InvoicePublicView";
import { loadCompany, rowToDraft } from "@/lib/invoice-data";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invoice — WeaveLens",
  robots: { index: false, follow: false },
  other: { google: "notranslate" },
};

type PageProps = { params: Promise<{ token: string }> };

/** Invoice untuk klien lewat link rahasia (dikirim via WhatsApp/email). Tanpa login. */
export default async function PublicInvoicePage({ params }: PageProps) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) notFound();
  const db = createServiceClient();
  if (!db) notFound();

  const { data } = await db
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("share_token", token)
    .maybeSingle();
  if (!data) notFound();
  const [company, invoice] = [await loadCompany(db), rowToDraft(data)];

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4">
          <Logo priority className="h-7" />
          <span className="text-sm font-semibold text-ink/75">Invoice {invoice.number}</span>
        </div>
      </header>
      <main id="content" className="mx-auto max-w-4xl px-4 py-6 md:py-10">
        <InvoicePublicView invoice={invoice} company={company} />
      </main>
    </div>
  );
}
