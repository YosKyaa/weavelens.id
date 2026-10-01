"use client";

import { useState, useTransition, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { statuses } from "@/content/portal";
import type { Stage } from "@/content/workspace";
import { WEEKDAYS, dayLabel, monthGrid, monthLabel } from "@/lib/calendar";
import { todayJakarta } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CalendarItem = {
  id: string;
  title: string;
  stage: Stage;
  publishDate: string | null;
  brandName: string | null;
  brandColor: string | null;
};

type ContentCalendarProps = {
  items: CalendarItem[];
  month: string;
  /** Link bulan sebelumnya/berikutnya/ini (dibuat server, sudah berisi filter yang aktif). */
  monthHrefs: { previous: string; next: string; current: string };
  /** href konten = prefix + id. */
  itemHrefPrefix: string;
  /** Tim: geser kartu ke tanggal lain untuk mengubah jadwal tayang. */
  reschedule?: (contentId: string, date: string | null) => Promise<{ ok: boolean; error?: string }>;
};

const STAGE_DOT: Record<Stage, string> = {
  brief: "bg-ink/30",
  in_progress: "bg-ink/50",
  client_review: "bg-primary",
  revision: "bg-sand-deep",
  approved: "bg-success",
  published: "bg-success",
};

/**
 * Kalender konten per tanggal tayang, berwarna per brand.
 * Desktop: kisi bulanan (tim bisa seret untuk menjadwalkan ulang). HP: agenda per hari.
 */
export function ContentCalendar({
  items: initialItems,
  month,
  monthHrefs,
  itemHrefPrefix,
  reschedule,
}: ContentCalendarProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [over, setOver] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const today = todayJakarta();
  const days = monthGrid(month);
  const byDay = new Map<string, CalendarItem[]>();
  for (const item of items) {
    if (!item.publishDate) continue;
    byDay.set(item.publishDate, [...(byDay.get(item.publishDate) ?? []), item]);
  }
  const unscheduled = items.filter((item) => !item.publishDate);
  const agendaDays = [...byDay.keys()].filter((day) => day.startsWith(month)).sort();
  const canDrag = Boolean(reschedule);

  function drop(event: DragEvent, date: string | null) {
    event.preventDefault();
    setOver(null);
    const id = event.dataTransfer.getData("text/plain");
    const item = items.find((entry) => entry.id === id);
    if (!reschedule || !item || item.publishDate === date) return;
    const before = items;
    setItems((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, publishDate: date } : entry)),
    );
    startTransition(async () => {
      const result = await reschedule(id, date);
      if (!result.ok) {
        setItems(before);
        toast.error(result.error ?? "Gagal mengubah jadwal.");
        return;
      }
      toast.success(date ? `Dijadwalkan ${dayLabel(date)}.` : "Jadwal tayang dihapus.");
      router.refresh();
    });
  }

  function Chip({ item, compact = false }: { item: CalendarItem; compact?: boolean }) {
    return (
      <Link
        href={`${itemHrefPrefix}${item.id}`}
        draggable={canDrag}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", item.id);
          event.dataTransfer.effectAllowed = "move";
        }}
        title={`${item.title} · ${statuses.stage[item.stage].label}`}
        className={cn(
          "flex items-center gap-1.5 rounded-md border border-line border-l-4 bg-paper px-1.5 py-1 text-xs text-ink shadow-xs transition-shadow hover:shadow-soft",
          canDrag && "cursor-grab active:cursor-grabbing",
          compact ? "min-w-0" : "px-2.5 py-2 text-sm",
        )}
        style={{ borderLeftColor: item.brandColor ?? "var(--color-line)" }}
      >
        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", STAGE_DOT[item.stage])} />
        <span className="min-w-0 truncate">{item.title}</span>
        {!compact && (
          <span className="ml-auto shrink-0 text-xs text-ink/60">
            {statuses.stage[item.stage].label}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl capitalize">{monthLabel(month)}</h2>
        <div className="flex items-center gap-1">
          <Link
            href={monthHrefs.previous}
            aria-label="Bulan sebelumnya"
            className="flex size-9 items-center justify-center rounded-lg border border-line bg-paper hover:bg-canvas"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Link>
          <Link
            href={monthHrefs.current}
            className="flex h-9 items-center rounded-lg border border-line bg-paper px-3 text-sm font-medium hover:bg-canvas"
          >
            Bulan ini
          </Link>
          <Link
            href={monthHrefs.next}
            aria-label="Bulan berikutnya"
            className="flex size-9 items-center justify-center rounded-lg border border-line bg-paper hover:bg-canvas"
          >
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>

      {/* Desktop: kisi bulanan */}
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-line md:block">
        <div className="grid grid-cols-7 gap-px">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="bg-canvas px-2 py-2 text-center font-heading text-xs font-semibold text-ink/70"
            >
              {day}
            </div>
          ))}
          {days.map((day) => {
            const inMonth = day.startsWith(month);
            const entries = byDay.get(day) ?? [];
            return (
              <div
                key={day}
                onDragOver={(event) => {
                  if (!canDrag) return;
                  event.preventDefault();
                  setOver(day);
                }}
                onDragLeave={() => setOver((current) => (current === day ? null : current))}
                onDrop={(event) => drop(event, day)}
                className={cn(
                  "flex min-h-28 flex-col gap-1 bg-paper p-1.5",
                  !inMonth && "bg-canvas/70",
                  over === day && "bg-brand-soft/60 ring-2 ring-primary ring-inset",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center self-end rounded-full text-xs",
                    inMonth ? "text-ink/75" : "text-ink/35",
                    day === today && "bg-primary font-bold text-primary-foreground",
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                {entries.slice(0, 4).map((item) => (
                  <Chip key={item.id} item={item} compact />
                ))}
                {entries.length > 4 && (
                  <span className="px-1 text-xs text-ink/60">+{entries.length - 4} lagi</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* HP: agenda per hari */}
      <div className="grid gap-4 md:hidden">
        {agendaDays.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-paper px-4 py-8 text-center text-sm text-ink/65">
            Belum ada konten yang dijadwalkan bulan ini.
          </p>
        ) : (
          agendaDays.map((day) => (
            <section key={day} className="grid gap-2">
              <h3
                className={cn(
                  "font-heading text-sm font-semibold capitalize",
                  day === today ? "text-primary" : "text-ink",
                )}
              >
                {dayLabel(day)}
                {day === today && " · hari ini"}
              </h3>
              {(byDay.get(day) ?? []).map((item) => (
                <Chip key={item.id} item={item} />
              ))}
            </section>
          ))
        )}
      </div>

      {unscheduled.length > 0 && (
        <section
          onDragOver={(event) => {
            if (!canDrag) return;
            event.preventDefault();
            setOver("none");
          }}
          onDragLeave={() => setOver((current) => (current === "none" ? null : current))}
          onDrop={(event) => drop(event, null)}
          className={cn(
            "grid gap-2 rounded-2xl border border-dashed border-line bg-paper p-4",
            over === "none" && "bg-brand-soft/60",
          )}
        >
          <h3 className="inline-flex items-center gap-2 font-heading text-sm font-semibold">
            <CalendarClock aria-hidden className="size-4 text-ink/60" />
            Belum dijadwalkan ({unscheduled.length})
          </h3>
          {canDrag && (
            <p className="text-xs text-ink/65">Seret ke tanggal di kalender untuk menjadwalkan.</p>
          )}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unscheduled.map((item) => (
              <Chip key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/65">
        {(["client_review", "revision", "in_progress", "approved"] as const).map((stage) => (
          <span key={stage} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2 rounded-full", STAGE_DOT[stage])} />
            {statuses.stage[stage].label}
          </span>
        ))}
        <span>Warna garis kiri = brand.</span>
      </p>
    </div>
  );
}
