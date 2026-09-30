"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { DataTable } from "@/components/organisms/DataTable";
import { Button } from "@/components/ui/button";
import { invoiceText } from "@/content/invoice";
import { statuses } from "@/content/portal";
import { formatDate } from "@/lib/format";
import { formatRupiah } from "@/lib/invoice";

export type InvoiceListRow = {
  id: string;
  number: string;
  billTo: string;
  company: string;
  issueDate: string;
  dueDate: string;
  total: number;
  status: string;
  overdue: boolean;
};

const text = invoiceText.list;

function Status({ row }: { row: InvoiceListRow }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <StatusBadge kind="invoice" status={row.status} />
      {row.overdue && (
        <span className="rounded-full border border-danger/20 bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
          {text.overdueBadge}
        </span>
      )}
    </span>
  );
}

const columns: ColumnDef<InvoiceListRow, unknown>[] = [
  {
    accessorKey: "number",
    header: text.columns.number,
    cell: ({ row }) => (
      <Link
        href={`/admin/invoices/${row.original.id}`}
        className="font-heading font-semibold text-primary hover:underline"
      >
        {row.original.number}
      </Link>
    ),
  },
  {
    accessorKey: "billTo",
    header: text.columns.billTo,
    cell: ({ row }) => (
      <span>
        <span className="block text-ink">{row.original.billTo}</span>
        {row.original.company && (
          <span className="block text-sm text-ink/65">{row.original.company}</span>
        )}
      </span>
    ),
  },
  {
    accessorKey: "issueDate",
    header: text.columns.issueDate,
    cell: ({ row }) => formatDate(row.original.issueDate),
  },
  {
    accessorKey: "dueDate",
    header: text.columns.dueDate,
    cell: ({ row }) => formatDate(row.original.dueDate),
  },
  {
    accessorKey: "total",
    header: text.columns.total,
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">{formatRupiah(row.original.total)}</span>
    ),
  },
  {
    accessorKey: "status",
    header: text.columns.status,
    enableGlobalFilter: false,
    filterFn: "equalsString",
    cell: ({ row }) => <Status row={row.original} />,
  },
];

export function InvoiceTable({ rows }: { rows: InvoiceListRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      searchPlaceholder={text.search}
      filter={{
        columnId: "status",
        label: text.columns.status,
        options: Object.entries(statuses.invoice).map(([value, def]) => ({
          value,
          label: def.label,
        })),
      }}
      emptyMessage={text.empty}
      emptyAction={
        <Button asChild>
          <Link href="/admin/invoices/new">
            <Plus aria-hidden />
            {text.create}
          </Link>
        </Button>
      }
      renderCard={(row) => (
        <Link
          href={`/admin/invoices/${row.id}`}
          className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 active:bg-sand/40"
        >
          <span className="flex items-start justify-between gap-3">
            <span className="font-heading font-semibold text-primary">{row.number}</span>
            <span className="font-heading font-semibold tabular-nums">
              {formatRupiah(row.total)}
            </span>
          </span>
          <span className="text-ink">
            {row.billTo}
            {row.company && <span className="text-ink/65"> · {row.company}</span>}
          </span>
          <span className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink/70">
            <span>
              {text.columns.dueDate} {formatDate(row.dueDate)}
            </span>
            <Status row={row} />
          </span>
        </Link>
      )}
    />
  );
}
