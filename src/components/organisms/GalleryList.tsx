"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { DataTable } from "@/components/organisms/DataTable";
import { statuses } from "@/content/portal";
import { workspaceText } from "@/content/workspace";
import { formatDate } from "@/lib/format";

export type GalleryListRow = {
  id: string;
  title: string;
  project: string;
  client: string;
  status: string;
  total: number;
  selected: number;
  maxSelection: number | null;
  deadline: string | null;
};

const text = workspaceText.galleries;

function Progress({ row }: { row: GalleryListRow }) {
  return (
    <span className="text-sm tabular-nums">
      {text.selectedCount(row.selected, row.maxSelection)}
      <span className="text-ink/60"> · {row.total} file</span>
    </span>
  );
}

const columns: ColumnDef<GalleryListRow, unknown>[] = [
  {
    accessorKey: "title",
    header: "Galeri",
    cell: ({ row }) => (
      <span>
        <Link
          href={`/admin/galleries/${row.original.id}`}
          className="block font-medium text-primary hover:underline"
        >
          {row.original.title}
        </Link>
        <span className="block text-sm text-ink/65">
          {[row.original.client, row.original.project].filter(Boolean).join(" · ")}
        </span>
      </span>
    ),
  },
  {
    accessorKey: "selected",
    header: "Pilihan",
    cell: ({ row }) => <Progress row={row.original} />,
  },
  {
    accessorKey: "deadline",
    header: "Batas memilih",
    cell: ({ row }) => (row.original.deadline ? formatDate(row.original.deadline) : "—"),
  },
  {
    accessorKey: "status",
    header: "Status",
    enableGlobalFilter: false,
    filterFn: "equalsString",
    cell: ({ row }) => <StatusBadge kind="photoSet" status={row.original.status} />,
  },
];

export function GalleryList({ rows }: { rows: GalleryListRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      searchPlaceholder="Cari galeri, proyek, atau klien…"
      filter={{
        columnId: "status",
        label: "Status",
        options: Object.entries(statuses.photoSet).map(([value, def]) => ({
          value,
          label: def.label,
        })),
      }}
      emptyMessage={text.empty}
      renderCard={(row) => (
        <Link
          href={`/admin/galleries/${row.id}`}
          className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 active:bg-sand/40"
        >
          <span className="flex items-start justify-between gap-3">
            <span className="font-medium text-primary">{row.title}</span>
            <StatusBadge kind="photoSet" status={row.status} />
          </span>
          <span className="text-sm text-ink/70">
            {[row.client, row.project].filter(Boolean).join(" · ")}
          </span>
          <Progress row={row} />
        </Link>
      )}
    />
  );
}
