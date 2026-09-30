import { InvoiceEditor } from "@/components/organisms/InvoiceEditor";
import { requireAdmin } from "@/lib/auth";
import { todayJakarta } from "@/lib/format";
import { newItemKey } from "@/lib/invoice";
import { blankInvoice, loadClientOptions, loadCompany, loadInvoice } from "@/lib/invoice-data";

type PageProps = { searchParams: Promise<{ dari?: string }> };

/** Invoice baru. `?dari=<id>` menyalin item & penerima dari invoice lain (Duplikat). */
export default async function NewInvoicePage({ searchParams }: PageProps) {
  const { supabase } = await requireAdmin();
  const { dari } = await searchParams;
  const [company, clients] = await Promise.all([
    loadCompany(supabase),
    loadClientOptions(supabase),
  ]);

  let initial = blankInvoice(company);
  if (dari && /^[0-9a-f-]{36}$/i.test(dari)) {
    const source = await loadInvoice(supabase, dari);
    if (source) {
      initial = {
        ...source,
        number: null,
        status: "draft",
        paidAt: null,
        issueDate: todayJakarta(),
        dueDate: initial.dueDate,
        items: source.items.map((item) => ({ ...item, key: newItemKey() })),
      };
    }
  }

  return <InvoiceEditor id={null} initial={initial} company={company} clients={clients} />;
}
