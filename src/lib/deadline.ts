import { formatDate } from "@/lib/format";

export type DeadlineTone = "overdue" | "today" | "soon" | "normal" | "done";

/** Selisih hari kalender antara dua tanggal "YYYY-MM-DD". */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * Status tenggat sebuah konten untuk penanda di kartu & ringkasan.
 * Konten yang sudah disetujui/tayang tidak lagi dianggap mengejar tenggat.
 */
export function deadlineOf(
  dueDate: string,
  today: string,
  finished: boolean,
): { tone: DeadlineTone; label: string } {
  if (finished) return { tone: "done", label: formatDate(dueDate) };
  const diff = daysBetween(today, dueDate);
  if (diff < 0) return { tone: "overdue", label: `Lewat ${-diff} hari` };
  if (diff === 0) return { tone: "today", label: "Hari ini" };
  if (diff === 1) return { tone: "soon", label: "Besok" };
  return { tone: diff <= 3 ? "soon" : "normal", label: formatDate(dueDate) };
}

export const deadlineClass: Record<DeadlineTone, string> = {
  overdue: "bg-danger-soft font-semibold text-danger",
  today: "bg-sand font-semibold text-ink",
  soon: "bg-sand/60 text-ink",
  normal: "text-ink/65",
  done: "text-ink/50",
};
