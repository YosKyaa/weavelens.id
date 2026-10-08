import { notFound } from "next/navigation";
import { InvoiceEditor } from "@/components/organisms/InvoiceEditor";
import { requireAdmin } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";
import { loadClientOptions, loadCompany, loadInvoice } from "@/lib/invoice-data";

type PageProps = { params: Promise<{ id: string }> };

export default async function InvoicePage({ params }: PageProps) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();

  const [invoice, company, clients] = await Promise.all([
    loadInvoice(supabase, id),
    loadCompany(supabase),
    loadClientOptions(supabase),
  ]);
  if (!invoice) notFound();

  // key: editor dimuat ulang bersih saat data server berubah (mis. setelah status diganti).
  return (
    <InvoiceEditor
      key={`${id}-${invoice.status}`}
      id={id}
      initial={invoice}
      company={company}
      clients={clients}
      emailEnabled={emailConfigured()}
    />
  );
}
