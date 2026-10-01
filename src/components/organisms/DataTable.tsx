"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { EmptyState } from "@/components/atoms/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type TableFilter = {
  columnId: string;
  label: string;
  options: { value: string; label: string }[];
};

type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  /** Placeholder kolom cari; kosongkan untuk menyembunyikan pencarian. */
  searchPlaceholder?: string;
  filter?: TableFilter;
  /** Pesan saat belum ada data sama sekali (beda dari "tidak ada hasil pencarian"). */
  emptyMessage: string;
  emptyAction?: ReactNode;
  /** Tampilan kartu untuk layar di bawah md, supaya tabel tidak digeser menyamping. */
  renderCard: (row: T) => ReactNode;
  getRowId: (row: T) => string;
  pageSize?: number;
};

const selectClass =
  "h-10 rounded-md border border-input bg-paper px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Tabel data: cari, filter, urutkan, dan halaman. Di HP berubah menjadi daftar kartu. */
export function DataTable<T>({
  columns,
  data,
  searchPlaceholder,
  filter,
  emptyMessage,
  emptyAction,
  renderCard,
  getRowId,
  pageSize = 20,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [status, setStatus] = useState("");

  // Referensi harus stabil: array baru di setiap render membuat TanStack mereset halaman terus-menerus (loop).
  const filterColumn = filter?.columnId;
  const columnFilters = useMemo(
    () => (filterColumn && status ? [{ id: filterColumn, value: status }] : []),
    [filterColumn, status],
  );

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: {
      sorting,
      globalFilter,
      columnFilters,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  if (data.length === 0) {
    return <EmptyState message={emptyMessage} action={emptyAction} className="bg-paper" />;
  }

  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;
  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();

  return (
    <div className="flex flex-col gap-4">
      {(searchPlaceholder || filter) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {searchPlaceholder && (
            <div className="relative sm:max-w-xs sm:flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink/50"
              />
              <Input
                type="search"
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="bg-paper pl-9"
              />
            </div>
          )}
          {filter && (
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label={filter.label}
              className={selectClass}
            >
              <option value="">{filter.label}: semua</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          <p className="text-sm text-ink/70 sm:ml-auto" aria-live="polite">
            {total} data
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState message="Tidak ada data yang cocok. Coba kata kunci atau filter lain." />
      ) : (
        <>
          {/* Desktop/tablet */}
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-paper md:block">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((group) => (
                  <TableRow key={group.id} className="bg-sand/40 hover:bg-sand/40">
                    {group.headers.map((header) => {
                      const sortable = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      const align = (header.column.columnDef.meta as { align?: string } | undefined)
                        ?.align;
                      return (
                        <TableHead
                          key={header.id}
                          aria-sort={
                            sorted === "asc"
                              ? "ascending"
                              : sorted === "desc"
                                ? "descending"
                                : undefined
                          }
                          className={cn(
                            "h-11 font-heading text-ink",
                            align === "right" && "text-right",
                          )}
                        >
                          {header.isPlaceholder ? null : sortable ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-sm hover:text-primary",
                                align === "right" && "flex-row-reverse",
                              )}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {sorted === "asc" ? (
                                <ArrowUp aria-hidden className="size-3.5" />
                              ) : sorted === "desc" ? (
                                <ArrowDown aria-hidden className="size-3.5" />
                              ) : (
                                <ArrowUpDown aria-hidden className="size-3.5 opacity-40" />
                              )}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      const align = (cell.column.columnDef.meta as { align?: string } | undefined)
                        ?.align;
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "py-3 whitespace-normal",
                            align === "right" && "text-right",
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* HP */}
          <ul className="grid gap-3 md:hidden">
            {rows.map((row) => (
              <li key={row.id}>{renderCard(row.original)}</li>
            ))}
          </ul>
        </>
      )}

      {pageCount > 1 && (
        <nav aria-label="Halaman tabel" className="flex items-center justify-end gap-2">
          <span className="text-sm text-ink/70">
            Halaman {pageIndex + 1} dari {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight aria-hidden />
          </Button>
        </nav>
      )}
    </div>
  );
}
