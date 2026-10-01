"use client";

import { useState } from "react";
import { importContents } from "@/app/(portal)/admin/projects/actions";
import {
  TableImportDialog,
  type ParsedRow,
  type TableImportConfig,
} from "@/components/organisms/TableImportDialog";
import { formatLabels, type ContentFormat } from "@/content/workspace";
import { formatDate, todayJakarta } from "@/lib/format";
import { matchKeyword, parseDate, sameText } from "@/lib/table-import";

type Field = "dueDate" | "publishDate" | "caption" | "brief" | "brand" | "format" | "title";

type ContentRow = {
  title: string;
  brandName: string | null;
  format: ContentFormat;
  publishDate: string | null;
  dueDate: string | null;
  brief: string | null;
  caption: string | null;
};

/** Urutan penting: field yang lebih spesifik dicek lebih dulu (mis. "deadline date" → tenggat). */
const SYNONYMS: Record<Field, string[]> = {
  dueDate: ["tenggat", "deadline", "due", "target", "batas"],
  publishDate: [
    "tayang",
    "publish",
    "posting",
    "upload",
    "rilis",
    "tanggal",
    "tgl",
    "date",
    "jadwal",
  ],
  caption: ["caption", "copywriting", "copy", "teks"],
  brief: [
    "brief",
    "deskripsi",
    "keterangan",
    "catatan",
    "notes",
    "note",
    "konsep",
    "detail",
    "isi",
  ],
  brand: ["brand", "merek", "akun", "perusahaan", "klien", "client", "account"],
  format: ["format", "tipe", "jenis", "type", "platform", "konten type"],
  title: ["judul", "title", "konten", "topik", "topic", "tema", "ide", "nama", "headline"],
};

const FORMAT_KEYWORDS: Record<ContentFormat, string[]> = {
  carousel: ["carousel", "carrousel", "karosel", "slide", "slides", "album", "multiple"],
  story: ["story", "stories", "igs", "stori", "status"],
  reels: ["reels", "reel", "video", "tiktok", "short", "shorts", "vt", "youtube"],
  feed: ["feed", "post", "posting", "single", "foto", "image", "gambar", "photo"],
  other: ["lainnya", "other", "banner", "backdrop", "poster", "desain", "design", "x"],
};

function template(): string {
  const [year, month] = todayJakarta().split("-").map(Number);
  const next = month === 12 ? 1 : month + 1;
  const y = month === 12 ? year + 1 : year;
  const d = (day: number) =>
    `${String(day).padStart(2, "0")}/${String(next).padStart(2, "0")}/${y}`;
  return [
    "Tanggal tayang,Brand,Format,Judul,Brief,Caption,Tenggat",
    `${d(5)},Brand A,Feed,Promo awal bulan,"Foto produk + harga promo, warna brand","Promo spesial bulan ini! Cek link di bio.",${d(3)}`,
    `${d(9)},Brand A,Carousel,Tips memilih paket,"5 slide tips, slide terakhir CTA WhatsApp",,${d(6)}`,
    `${d(12)},Brand B,Reels,Behind the scene,"Video 20-30 detik, hook 3 detik pertama",,${d(10)}`,
  ].join("\n");
}

type ContentImportProps = {
  projectId: string;
  brands: { id: string; name: string }[];
  /** Kartu yang sudah ada, untuk menandai duplikat (judul + tanggal tayang sama). */
  existing: { title: string; publishDate: string | null }[];
};

/** Import rencana konten → kartu di kolom Brief, lengkap dengan brand, format, dan tanggal. */
export function ContentImport({ projectId, brands, existing }: ContentImportProps) {
  const [skipBrands, setSkipBrands] = useState<string[]>([]);
  const year = Number(todayJakarta().slice(0, 4));
  const knownBrand = (name: string) => brands.find((brand) => sameText(brand.name, name));

  function toRow(record: Partial<Record<Field, string>>): ParsedRow<ContentRow> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const title = (record.title ?? "").trim().slice(0, 160);
    if (!title) errors.push("Judul kosong");

    const publish = parseDate(record.publishDate ?? "", year);
    if (publish === null) errors.push(`Tanggal tayang tidak terbaca: "${record.publishDate}"`);
    const due = parseDate(record.dueDate ?? "", year);
    if (due === null) errors.push(`Tenggat tidak terbaca: "${record.dueDate}"`);

    const formatText = record.format ?? "";
    const format = matchKeyword(formatText, FORMAT_KEYWORDS) ?? "feed";
    if (formatText.trim() && !matchKeyword(formatText, FORMAT_KEYWORDS)) {
      warnings.push(`Format "${formatText}" tidak dikenal, dipakai Feed`);
    }

    const brandText = (record.brand ?? "").trim();
    const brand = brandText ? knownBrand(brandText) : undefined;
    if (brandText && !brand) warnings.push(`Brand baru: ${brandText}`);

    const duplicate =
      title &&
      existing.some(
        (item) => sameText(item.title, title) && (item.publishDate ?? null) === (publish ?? null),
      );
    if (duplicate) warnings.push("Sudah ada di papan (judul & tanggal sama)");

    return {
      value: title
        ? {
            title,
            brandName: brand?.name ?? (brandText || null),
            format,
            publishDate: publish ?? null,
            dueDate: due ?? null,
            brief: record.brief?.trim() || null,
            caption: record.caption?.trim() || null,
          }
        : null,
      errors,
      warnings,
      include: !duplicate,
    };
  }

  const config: TableImportConfig<Field, ContentRow> = {
    title: "Import rencana konten",
    description:
      "Setiap baris menjadi kartu di kolom Brief, lengkap dengan brand, format, dan tanggal tayang. Geser ke Dikerjakan saat mulai digarap.",
    triggerLabel: "Import rencana",
    synonyms: SYNONYMS,
    requiredField: "title",
    requiredLabel: "Judul",
    template: { filename: "template-rencana-konten.csv", csv: template() },
    toRow,
    columns: [
      {
        label: "Tayang",
        className: "whitespace-nowrap",
        render: (row) => (row.publishDate ? formatDate(row.publishDate) : "–"),
      },
      { label: "Brand", className: "whitespace-nowrap", render: (row) => row.brandName ?? "–" },
      { label: "Format", render: (row) => formatLabels[row.format] },
      {
        label: "Judul",
        className: "min-w-48",
        render: (row) => (
          <>
            <span className="font-medium text-ink">{row.title}</span>
            {row.brief && (
              <span className="mt-0.5 line-clamp-2 block text-xs text-ink/60">{row.brief}</span>
            )}
          </>
        ),
      },
      {
        label: "Tenggat",
        className: "whitespace-nowrap",
        render: (row) => (row.dueDate ? formatDate(row.dueDate) : "–"),
      },
    ],
    extra: (selected) => {
      const fresh = [
        ...new Set(
          selected
            .map((row) => row.brandName)
            .filter((name): name is string => Boolean(name) && !knownBrand(name!)),
        ),
      ];
      if (!fresh.length) return null;
      return (
        <fieldset className="grid gap-2 rounded-xl border border-line bg-brand-soft/40 p-3">
          <legend className="px-1 text-sm font-semibold text-ink">Brand baru</legend>
          <p className="text-sm text-ink/75">
            Brand ini belum terdaftar untuk klien proyek ini. Yang dicentang akan dibuat; yang
            tidak, kontennya diimport tanpa brand.
          </p>
          <div className="flex flex-wrap gap-3">
            {fresh.map((name) => (
              <label key={name} className="inline-flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={!skipBrands.includes(name)}
                  onChange={() =>
                    setSkipBrands((current) =>
                      current.includes(name)
                        ? current.filter((item) => item !== name)
                        : [...current, name],
                    )
                  }
                  className="size-4 accent-primary"
                />
                {name}
              </label>
            ))}
          </div>
        </fieldset>
      );
    },
    onImport: async (rows) => {
      const newBrands = [
        ...new Set(
          rows
            .map((row) => row.brandName)
            .filter(
              (name): name is string =>
                Boolean(name) && !knownBrand(name!) && !skipBrands.includes(name!),
            ),
        ),
      ];
      const result = await importContents(projectId, {
        rows: rows.map((row) => ({
          ...row,
          publishDate: row.publishDate ?? "",
          dueDate: row.dueDate ?? "",
          brief: row.brief ?? "",
          caption: row.caption ?? "",
        })),
        newBrands,
      });
      if (!result.ok) return result;
      return {
        ok: true,
        message:
          `${result.created} konten masuk ke kolom Brief` +
          (result.brandsCreated ? `, ${result.brandsCreated} brand baru dibuat.` : "."),
      };
    },
  };

  return <TableImportDialog config={config} />;
}
