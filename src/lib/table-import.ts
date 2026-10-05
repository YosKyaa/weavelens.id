/**
 * Import tabel dari tempelan Google Sheets / Excel (TSV) atau file CSV (koma / titik koma).
 * Kolom dikenali dari judulnya (bebas: "Tgl tayang", "Tanggal", "Publish date", …).
 * Aman dipakai di browser (tanpa dependensi).
 */

/** Pecah teks tabel menjadi baris & sel. Mendukung sel berkutip berisi baris baru / pemisah. */
export function parseTable(input: string): string[][] {
  const text = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const firstLine = text.split("\n").find((line) => line.trim()) ?? "";
  const delimiter = firstLine.includes("\t")
    ? "\t"
    : (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === "") {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows
    .map((cells) => cells.map((value) => value.trim()))
    .filter((cells) => cells.some((value) => value !== ""));
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Cocokkan judul kolom ke nama field. `synonyms` = kata kunci per field; judul dianggap cocok
 * bila sama persis atau mengandung salah satu kata kunci. Field yang sudah terpakai dilewati.
 */
export function mapHeaders<F extends string>(
  headers: string[],
  synonyms: Record<F, string[]>,
): (F | null)[] {
  const used = new Set<F>();
  const fields = Object.keys(synonyms) as F[];
  const pick = (header: string, exact: boolean) =>
    fields.find(
      (field) =>
        !used.has(field) &&
        synonyms[field].some((word) =>
          exact
            ? header === word
            : // Kata pendek (mis. "tgl") harus utuh supaya "ide" tidak cocok dengan "video".
              header.split(" ").includes(word) || (word.length >= 4 && header.includes(word)),
        ),
    ) ?? null;
  // Dua putaran: cocok persis dulu, baru yang mengandung kata kunci.
  const result: (F | null)[] = headers.map(() => null);
  for (const exact of [true, false]) {
    headers.forEach((raw, index) => {
      if (result[index]) return;
      const field = pick(normalize(raw), exact);
      if (field) {
        result[index] = field;
        used.add(field);
      }
    });
  }
  return result;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  januari: 1,
  january: 1,
  feb: 2,
  februari: 2,
  february: 2,
  peb: 2,
  mar: 3,
  maret: 3,
  march: 3,
  apr: 4,
  april: 4,
  mei: 5,
  may: 5,
  jun: 6,
  juni: 6,
  june: 6,
  jul: 7,
  juli: 7,
  july: 7,
  agu: 8,
  ags: 8,
  agt: 8,
  agustus: 8,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  okt: 10,
  oktober: 10,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  nop: 11,
  nopember: 11,
  des: 12,
  desember: 12,
  dec: 12,
  december: 12,
};

function isoDate(year: number, month: number, day: number): string | null {
  const full = year < 100 ? 2000 + year : year;
  const date = new Date(Date.UTC(full, month - 1, day));
  if (
    date.getUTCFullYear() !== full ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Tanggal ke "YYYY-MM-DD". Mendukung 2026-10-05, 05/10/2026 (hari/bulan), 5-10-26,
 * "5 Okt 2026", "Senin, 5 Oktober 2026", "5 Okt" (tahun = `fallbackYear`).
 * `undefined` = sel kosong; `null` = tidak terbaca.
 */
export function parseDate(value: string, fallbackYear: number): string | null | undefined {
  const text = normalize(value);
  if (!text) return undefined;
  let match = text.match(/^(\d{4}) (\d{1,2}) (\d{1,2})$/);
  if (match) return isoDate(+match[1], +match[2], +match[3]);
  match = text.match(/^(\d{1,2}) (\d{1,2}) (\d{2,4})$/);
  if (match) return isoDate(+match[3], +match[2], +match[1]);
  match = text.match(/(\d{1,2}) ([a-z]+)(?: (\d{2,4}))?$/);
  if (match && MONTHS[match[2]]) {
    return isoDate(match[3] ? +match[3] : fallbackYear, MONTHS[match[2]], +match[1]);
  }
  match = text.match(/^([a-z]+) (\d{1,2})(?: (\d{2,4}))?$/);
  if (match && MONTHS[match[1]]) {
    return isoDate(match[3] ? +match[3] : fallbackYear, MONTHS[match[1]], +match[2]);
  }
  return null;
}

/** Cocokkan teks bebas ke salah satu nilai lewat kata kunci; `null` jika tidak ada yang cocok. */
export function matchKeyword<V extends string>(
  value: string,
  keywords: Record<V, string[]>,
): V | null {
  const text = normalize(value);
  if (!text) return null;
  const words = text.split(" ");
  for (const [key, list] of Object.entries(keywords) as [V, string[]][]) {
    if (list.some((word) => words.includes(word) || text === word)) return key;
  }
  return null;
}

export function sameText(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}
