/**
 * Template & baca file Excel (.xlsx) di browser untuk import tabel.
 * Library dimuat saat dipakai saja (dynamic import), jadi tidak memperberat halaman.
 */

export type ExcelTemplate = {
  filename: string;
  /** Nama sheet isi, mis. "Rencana kerja". */
  sheet: string;
  columns: { header: string; width: number }[];
  /** Contoh isi. Tanggal pakai `Date` (tampil dd/mm/yyyy di Excel). */
  rows: (string | Date | null)[][];
  /** Baris petunjuk di sheet kedua: [judul, keterangan]. */
  guide: [string, string][];
};

/** Tanggal kalender (tanpa jam) untuk sel Excel. */
export function excelDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

const BRAND = "#74342B";
const HEADER_BG = "#F3E7DD";

export async function downloadExcelTemplate(template: ExcelTemplate): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const header = template.columns.map((column) => ({
    value: column.header,
    fontWeight: "bold" as const,
    textColor: BRAND,
    backgroundColor: HEADER_BG,
  }));
  const body = template.rows.map((row) =>
    row.map((cell) =>
      cell instanceof Date
        ? { value: cell, type: Date, format: "dd/mm/yyyy" }
        : { value: cell ?? "", type: String, wrap: true },
    ),
  );
  await writeXlsxFile([
    {
      sheet: template.sheet,
      data: [header, ...body],
      columns: template.columns.map((column) => ({ width: column.width })),
      stickyRowsCount: 1,
    },
    {
      sheet: "Petunjuk",
      data: [
        [
          { value: "Kolom", fontWeight: "bold" as const, backgroundColor: HEADER_BG },
          { value: "Cara isi", fontWeight: "bold" as const, backgroundColor: HEADER_BG },
        ],
        ...template.guide.map(([column, help]) => [
          { value: column, fontWeight: "bold" as const },
          { value: help, wrap: true },
        ]),
      ],
      columns: [{ width: 22 }, { width: 80 }],
    },
  ]).toFile(template.filename);
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  // Sel tanggal Excel → "YYYY-MM-DD" (dibaca parseDate).
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

/** Sheet pertama file .xlsx → baris & sel teks (siap dipetakan seperti tempelan). */
export async function readExcelTable(file: File): Promise<string[][]> {
  const { readSheet } = await import("read-excel-file/browser");
  const data = await readSheet(file);
  return data
    .map((row) => row.map(cellText))
    .filter((cells) => cells.some((value) => value !== ""));
}

export function isExcelFile(file: File): boolean {
  return /\.xlsx$/i.test(file.name);
}
