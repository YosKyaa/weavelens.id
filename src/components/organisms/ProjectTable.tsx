"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { DataTable } from "@/components/organisms/DataTable";
import { portal, projectTypes, statuses } from "@/content/portal";
import { formatDate } from "@/lib/format";

export type ProjectListRow = {
  id: string;
  title: string;
  client: string;
  type: string;
  eventDate: string | null;
  status: string;
  /** Nama anggota tim yang ditugaskan (hanya ditampilkan untuk admin). */
  team: string[];
};

const text = portal.projects;

const teamColumn: ColumnDef<ProjectListRow, unknown> = {
  id: "team",
  accessorFn: (row) => row.team.join(", "),
  header: "Tim",
  cell: ({ row }) =>
    row.original.team.length ? (
      <span className="line-clamp-2 text-sm">{row.original.team.join(" · ")}</span>
    ) : (
      <span className="text-sm text-ink/60">Belum ditugaskan</span>
    ),
};

const baseColumns: ColumnDef<ProjectListRow, unknown>[] = [
  {
    accessorKey: "title",
    header: text.columns.title,
    cell: ({ row }) => (
      <span>
        <Link
          href={`/admin/projects/${row.original.id}`}
          className="block font-medium text-primary hover:underline"
        >
          {row.original.title}
        </Link>
        <span className="block text-sm text-ink/65">{row.original.client}</span>
      </span>
    ),
  },
  {
    accessorKey: "type",
    header: text.columns.type,
    cell: ({ row }) => projectTypes[row.original.type] ?? row.original.type,
  },
  {
    accessorKey: "eventDate",
    header: text.columns.event,
    cell: ({ row }) => (row.original.eventDate ? formatDate(row.original.eventDate) : "—"),
  },
  {
    accessorKey: "status",
    header: text.columns.status,
    enableGlobalFilter: false,
    filterFn: "equalsString",
    cell: ({ row }) => <StatusBadge kind="project" status={row.original.status} />,
  },
];

export function ProjectTable({
  rows,
  showTeam = false,
  emptyMessage = text.empty,
}: {
  rows: ProjectListRow[];
  showTeam?: boolean;
  emptyMessage?: string;
}) {
  const columns = showTeam
    ? [...baseColumns.slice(0, 1), teamColumn, ...baseColumns.slice(1)]
    : baseColumns;
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      searchPlaceholder="Cari proyek atau klien…"
      filter={{
        columnId: "status",
        label: text.columns.status,
        options: Object.entries(statuses.project).map(([value, def]) => ({
          value,
          label: def.label,
        })),
      }}
      emptyMessage={emptyMessage}
      renderCard={(row) => (
        <Link
          href={`/admin/projects/${row.id}`}
          className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 active:bg-sand/40"
        >
          <span className="flex items-start justify-between gap-3">
            <span className="font-medium text-primary">{row.title}</span>
            <StatusBadge kind="project" status={row.status} />
          </span>
          <span className="text-sm text-ink/70">
            {[row.client, projectTypes[row.type], row.eventDate && formatDate(row.eventDate)]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </Link>
      )}
    />
  );
}
