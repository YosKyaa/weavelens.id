"use client";

import { importPlanItems } from "@/app/(portal)/admin/projects/actions";
import {
  TableImportDialog,
  type ParsedRow,
  type TableImportConfig,
} from "@/components/organisms/TableImportDialog";
import { workspaceText } from "@/content/workspace";
import { formatDate, todayJakarta } from "@/lib/format";
import { matchKeyword, parseDate, sameText } from "@/lib/table-import";

type Field = "status" | "dueDate" | "description" | "title";
type Status = "planned" | "in_progress" | "done";
type PlanRow = {
  title: string;
  dueDate: string | null;
  status: Status;
  description: string | null;
};

const SYNONYMS: Record<Field, string[]> = {
  status: ["status", "progres", "progress", "kondisi", "state"],
  dueDate: [
    "target",
    "tenggat",
    "deadline",
    "due",
    "tanggal",
    "tgl",
    "date",
    "jadwal",
    "selesai pada",
  ],
  description: ["keterangan", "deskripsi", "catatan", "detail", "notes", "note"],
  title: [
    "tahap",
    "tahapan",
    "judul",
    "nama",
    "kegiatan",
    "pekerjaan",
    "task",
    "milestone",
    "title",
    "aktivitas",
  ],
};

const STATUS_KEYWORDS: Record<Status, string[]> = {
  done: ["selesai", "done", "beres", "complete", "completed", "finish", "finished", "sudah", "ok"],
  in_progress: [
    "dikerjakan",
    "proses",
    "progress",
    "berjalan",
    "ongoing",
    "sedang",
    "wip",
    "jalan",
  ],
  planned: ["direncanakan", "rencana", "planned", "belum", "todo", "pending", "nanti", "plan"],
};

function template(): string {
  const year = todayJakarta().slice(0, 4);
  return [
    "Tahap,Target,Status,Keterangan",
    `Brief & konsep,03/10/${year},Selesai,Kumpulkan kebutuhan dan referensi`,
    `Produksi konten minggu 1,10/10/${year},Dikerjakan,Feed + Reels`,
    `Review klien,14/10/${year},Direncanakan,`,
    `Jadwal tayang,17/10/${year},Direncanakan,`,
  ].join("\n");
}

/** Import tahapan rencana kerja (timeline yang dilihat klien) dari tabel. */
export function PlanImport({
  projectId,
  existing,
}: {
  projectId: string;
  existing: { title: string }[];
}) {
  const year = Number(todayJakarta().slice(0, 4));
  const text = workspaceText.plan;

  function toRow(record: Partial<Record<Field, string>>): ParsedRow<PlanRow> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const title = (record.title ?? "").trim().slice(0, 160);
    if (!title) errors.push("Nama tahap kosong");
    const due = parseDate(record.dueDate ?? "", year);
    if (due === null) errors.push(`Tanggal tidak terbaca: "${record.dueDate}"`);
    const statusText = record.status ?? "";
    const status = matchKeyword(statusText, STATUS_KEYWORDS) ?? "planned";
    if (statusText.trim() && !matchKeyword(statusText, STATUS_KEYWORDS)) {
      warnings.push(`Status "${statusText}" tidak dikenal, dipakai Direncanakan`);
    }
    const duplicate = Boolean(title) && existing.some((item) => sameText(item.title, title));
    if (duplicate) warnings.push("Tahap dengan nama sama sudah ada");
    return {
      value: title
        ? { title, dueDate: due ?? null, status, description: record.description?.trim() || null }
        : null,
      errors,
      warnings,
      include: !duplicate,
    };
  }

  const config: TableImportConfig<Field, PlanRow> = {
    title: "Import rencana kerja",
    description:
      "Tahapan ditambahkan di akhir timeline sesuai urutan tabel. Klien melihatnya sebagai progres proyek.",
    triggerLabel: "Import tahapan",
    synonyms: SYNONYMS,
    requiredField: "title",
    requiredLabel: "Tahap",
    template: { filename: "template-rencana-kerja.csv", csv: template() },
    toRow,
    columns: [
      {
        label: "Tahap",
        className: "min-w-48",
        render: (row) => <span className="font-medium text-ink">{row.title}</span>,
      },
      {
        label: "Target",
        className: "whitespace-nowrap",
        render: (row) => (row.dueDate ? formatDate(row.dueDate) : "–"),
      },
      { label: "Status", render: (row) => text.statuses[row.status] },
    ],
    onImport: async (rows) => {
      const result = await importPlanItems(projectId, {
        rows: rows.map((row) => ({
          ...row,
          dueDate: row.dueDate ?? "",
          description: row.description ?? "",
        })),
      });
      if (!result.ok) return result;
      return { ok: true, message: `${result.created} tahap ditambahkan ke rencana kerja.` };
    },
  };

  return <TableImportDialog config={config} />;
}
