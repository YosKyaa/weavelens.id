import Link from "next/link";
import { Plus } from "lucide-react";
import { StatTile } from "@/components/atoms/StatTile";
import { PageHeader } from "@/components/molecules/PageHeader";
import { InvoiceTable, type InvoiceListRow } from "@/components/organisms/InvoiceTable";
import { Button } from "@/components/ui/button";
import { invoiceText } from "@/content/invoice";
import { requireAdmin } from "@/lib/auth";
import { todayJakarta } from "@/lib/format";
import { computeTotals, formatRupiah } from "@/lib/invoice";

const text = invoiceText.list;

export default async function InvoiceListPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("invoices")
    .select(
      "id, number, status, issue_date, due_date, paid_at, discount, tax_rate, bill_to_name, bill_to_company, clients(name), invoice_items(qty, unit_price)",
    )
    .order("created_at", { ascending: false });

  const today = todayJakarta();
  const month = today.slice(0, 7);

  const rows: InvoiceListRow[] = (data ?? []).map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    billTo: invoice.bill_to_name || invoice.clients?.name || "—",
    company: invoice.bill_to_company ?? "",
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    status: invoice.status,
    overdue: invoice.status === "sent" && invoice.due_date < today,
    total: computeTotals(
      invoice.invoice_items.map((item) => ({ qty: item.qty, unitPrice: item.unit_price })),
      invoice.discount,
      invoice.tax_rate,
    ).total,
  }));

  const unpaid = rows.filter((row) => row.status === "sent");
  const overdue = unpaid.filter((row) => row.overdue);
  const paidThisMonth = (data ?? [])
    .filter((invoice) => invoice.status === "paid" && invoice.paid_at?.startsWith(month))
    .map((invoice) => rows.find((row) => row.id === invoice.id)?.total ?? 0);
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

  return (
    <>
      <PageHeader
        title={text.title}
        description={text.description}
        actions={
          <Button asChild size="lg">
            <Link href="/admin/invoices/new">
              <Plus aria-hidden />
              {text.create}
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile
          label={text.stats.unpaid}
          value={formatRupiah(sum(unpaid.map((row) => row.total)))}
          hint={text.stats.invoices(unpaid.length)}
        />
        <StatTile
          label={text.stats.overdue}
          value={formatRupiah(sum(overdue.map((row) => row.total)))}
          hint={text.stats.invoices(overdue.length)}
        />
        <StatTile
          label={text.stats.paidThisMonth}
          value={formatRupiah(sum(paidThisMonth))}
          hint={text.stats.invoices(paidThisMonth.length)}
        />
      </div>

      <InvoiceTable rows={rows} />
    </>
  );
}
