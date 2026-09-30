"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/organisms/DataTable";
import { workspaceText } from "@/content/workspace";

export type ClientListRow = {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  projects: number;
  brands: string[];
};

const text = workspaceText.clients;

const columns: ColumnDef<ClientListRow, unknown>[] = [
  {
    accessorKey: "name",
    header: "Klien",
    cell: ({ row }) => (
      <Link
        href={`/admin/clients/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    id: "brands",
    accessorFn: (row) => row.brands.join(", "),
    header: "Brand",
    cell: ({ row }) =>
      row.original.brands.length ? (
        <span className="text-sm">{row.original.brands.join(" · ")}</span>
      ) : (
        <span className="text-sm text-ink/60">—</span>
      ),
  },
  {
    accessorKey: "contactName",
    header: "PIC",
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
    header: "Proyek",
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
      searchPlaceholder={text.search}
      emptyMessage={text.empty}
      renderCard={(row) => (
        <Link
          href={`/admin/clients/${row.id}`}
          className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-paper p-4 active:bg-sand/40"
        >
          <span className="min-w-0">
            <span className="block font-medium text-primary">{row.name}</span>
            <span className="block truncate text-sm text-ink/70">
              {row.brands.length ? row.brands.join(" · ") : row.contactName || "—"}
            </span>
          </span>
          <span className="shrink-0 text-sm text-ink/70">
            <span className="font-heading font-semibold text-ink">{row.projects}</span> proyek
          </span>
        </Link>
      )}
    />
  );
}
