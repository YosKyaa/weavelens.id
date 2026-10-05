"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Download, FileUp, Loader2, Sheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  downloadExcelTemplate,
  isExcelFile,
  readExcelTable,
  type ExcelTemplate,
} from "@/lib/excel";
import { mapHeaders, parseTable } from "@/lib/table-import";
import { cn } from "@/lib/utils";

export type ParsedRow<T> = {
  value: T | null;
  errors: string[];
  warnings: string[];
  /** Tercentang secara bawaan (mis. duplikat = tidak). */
  include: boolean;
};

export type TableImportConfig<F extends string, T> = {
  title: string;
  description: string;
  /** Kata kunci judul kolom per field (lihat mapHeaders). */
  synonyms: Record<F, string[]>;
  requiredField: F;
  requiredLabel: string;
  /** Template Excel (.xlsx) yang bisa diunduh. */
  template: ExcelTemplate;
  /** Baris tabel (per field) → nilai siap simpan + pesan. */
  toRow: (record: Partial<Record<F, string>>) => ParsedRow<T>;
  columns: { label: string; className?: string; render: (value: T) => ReactNode }[];
  /** Kotak tambahan di pratinjau (mis. brand baru), menerima baris yang dicentang. */
  extra?: (selected: T[]) => ReactNode;
  onImport: (rows: T[]) => Promise<{ ok: true; message: string } | { ok: false; error: string }>;
  triggerLabel: string;
};

/**
 * Import banyak dari tempelan Google Sheets / Excel, atau file Excel (.xlsx) / CSV:
 * tempel → pratinjau (baris bermasalah ditandai, bisa dicentang/lepas) → simpan.
 */
export function TableImportDialog<F extends string, T>({
  config,
}: {
  config: TableImportConfig<F, T>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<ParsedRow<T>[] | null>(null);
  const [headerError, setHeaderError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function reset() {
    setRaw("");
    setRows(null);
    setHeaderError(undefined);
  }

  function preview(text: string) {
    previewTable(parseTable(text));
  }

  function previewTable(table: string[][]) {
    if (table.length < 2) {
      setHeaderError("Tempel tabel lengkap dengan baris judul kolom dan minimal satu baris isi.");
      return;
    }
    const fields = mapHeaders(table[0], config.synonyms);
    if (!fields.includes(config.requiredField)) {
      setHeaderError(
        `Kolom "${config.requiredLabel}" tidak ditemukan di baris pertama. Pastikan baris pertama berisi judul kolom, atau pakai template.`,
      );
      return;
    }
    setHeaderError(undefined);
    setRows(
      table.slice(1).map((cells) => {
        const record: Partial<Record<F, string>> = {};
        fields.forEach((field, index) => {
          if (field && cells[index] !== undefined) record[field] = cells[index];
        });
        return config.toRow(record);
      }),
    );
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    try {
      if (isExcelFile(file)) {
        // Excel: baca sheet pertama langsung (tanggal Excel ikut terbaca dengan benar).
        previewTable(await readExcelTable(file));
        return;
      }
      const text = await file.text();
      setRaw(text);
      preview(text);
    } catch {
      setHeaderError(
        "File tidak bisa dibaca. Pakai file Excel (.xlsx) dari template, atau tempel tabelnya.",
      );
    }
  }

  async function downloadTemplate() {
    try {
      await downloadExcelTemplate(config.template);
    } catch {
      toast.error("Template gagal dibuat. Coba lagi.");
    }
  }

  // Baris bermasalah tidak pernah ikut, walau tercentang sebelumnya.
  const selected = (rows ?? [])
    .filter((row) => row.include && row.value && row.errors.length === 0)
    .map((row) => row.value!);
  const problems = (rows ?? []).filter((row) => row.errors.length).length;

  function submit() {
    startTransition(async () => {
      const result = await config.onImport(selected);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Sheet aria-hidden />
        {config.triggerLabel}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (pending) return;
          setOpen(value);
          if (!value) reset();
        }}
      >
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription className="text-ink/75">{config.description}</DialogDescription>

          {!rows ? (
            <div className="grid gap-4">
              <ol className="grid gap-1 rounded-xl bg-canvas p-4 text-sm text-ink/80">
                <li>1. Unduh template Excel di bawah, lalu isi (atau pakai tabel sendiri).</li>
                <li>
                  2. Unggah file Excel-nya, atau blok tabel termasuk baris judul kolom lalu salin
                  (Ctrl+C).
                </li>
                <li>3. Jika menyalin, tempel di kotak ini (Ctrl+V), lalu tekan Pratinjau.</li>
              </ol>
              <Textarea
                aria-label="Tempel tabel di sini"
                rows={9}
                value={raw}
                placeholder="Tempel tabel dari Google Sheets / Excel di sini…"
                onChange={(event) => setRaw(event.target.value)}
                className="font-mono text-xs"
              />
              {headerError && (
                <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                  {headerError}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                    <Download aria-hidden />
                    Unduh template Excel
                  </Button>
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium text-ink hover:bg-canvas">
                    <FileUp aria-hidden className="size-4" />
                    Unggah file Excel
                    <input
                      type="file"
                      accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                      className="sr-only"
                      onChange={(event) => readFile(event.target.files?.[0])}
                    />
                  </label>
                </div>
                <Button onClick={() => preview(raw)} disabled={!raw.trim()}>
                  Pratinjau
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <p className="text-sm text-ink/80">
                <span className="font-semibold text-ink">{selected.length}</span> dari {rows.length}{" "}
                baris akan diimport
                {problems > 0 && (
                  <span className="text-danger"> · {problems} baris bermasalah dilewati</span>
                )}
                .
              </p>

              {config.extra?.(selected)}

              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="bg-canvas text-xs text-ink/70">
                    <tr>
                      <th className="w-10 px-3 py-2">
                        <span className="sr-only">Ikut diimport</span>
                      </th>
                      {config.columns.map((column) => (
                        <th
                          key={column.label}
                          className={cn("px-3 py-2 font-semibold", column.className)}
                        >
                          {column.label}
                        </th>
                      ))}
                      <th className="px-3 py-2 font-semibold">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((row, index) => (
                      <tr
                        key={index}
                        className={cn(
                          "align-top",
                          (!row.include || row.errors.length > 0) && "bg-canvas/60 text-ink/55",
                        )}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label={`Import baris ${index + 1}`}
                            checked={row.include && !row.errors.length}
                            disabled={row.errors.length > 0}
                            onChange={() =>
                              setRows((current) =>
                                current!.map((item, i) =>
                                  i === index ? { ...item, include: !item.include } : item,
                                ),
                              )
                            }
                            className="mt-0.5 size-4 accent-primary"
                          />
                        </td>
                        {row.value ? (
                          config.columns.map((column) => (
                            <td key={column.label} className={cn("px-3 py-2", column.className)}>
                              {column.render(row.value!)}
                            </td>
                          ))
                        ) : (
                          <td colSpan={config.columns.length} className="px-3 py-2" />
                        )}
                        <td className="px-3 py-2 text-xs">
                          {row.errors.map((message) => (
                            <span key={message} className="block font-medium text-danger">
                              {message}
                            </span>
                          ))}
                          {row.warnings.map((message) => (
                            <span key={message} className="flex items-start gap-1 text-ink/70">
                              <AlertTriangle aria-hidden className="mt-0.5 size-3 shrink-0" />
                              {message}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button variant="ghost" onClick={() => setRows(null)} disabled={pending}>
                  <ArrowLeft aria-hidden />
                  Ubah tempelan
                </Button>
                <Button onClick={submit} disabled={pending || selected.length === 0}>
                  {pending ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <Upload aria-hidden />
                  )}
                  Import {selected.length} baris
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
