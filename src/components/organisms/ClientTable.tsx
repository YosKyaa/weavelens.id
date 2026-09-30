"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/organisms/DataTable";
import { portal } from "@/content/portal";

export type ClientListRow = {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  projects: number;
};

const text = portal.clients;

const columns: ColumnDef<ClientListRow, unknown>[] = [
  {
    accessorKey: "name",
    header: text.columns.name,
    cell: ({ row }) => <span className="font-medium text-ink">{row.original.name}</span>,
  },
  {
    accessorKey: "contactName",
    header: text.columns.contact,
    cell: ({ row }) => (
      <span>
        <span className="block">{row.original.contactName || "—"}</span>
        {row.original.contactEmail && (
          <span className="block text-sm text-ink/65">{row.original.contactEmail}</span>
        )}
      </span>
    ),
  },
  {
    accessorKey: "projects",
    header: text.columns.projects,
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-heading font-semibold tabular-nums">{row.original.projects}</span>
    ),
  },
];

export function ClientTable({ rows }: { rows: ClientListRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      searchPlaceholder="Cari klien atau kontak…"
      emptyMessage={text.empty}
      renderCard={(row) => (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-paper p-4">
          <span className="min-w-0">
            <span className="block font-medium text-ink">{row.name}</span>
            <span className="block truncate text-sm text-ink/70">
              {[row.contactName, row.contactEmail].filter(Boolean).join(" · ") || "—"}
            </span>
          </span>
          <span className="shrink-0 text-sm text-ink/70">
            <span className="font-heading font-semibold text-ink">{row.projects}</span> proyek
          </span>
        </div>
      )}
    />
  );
}
