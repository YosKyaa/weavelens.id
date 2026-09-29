import { statuses, type StatusKind, type StatusTone } from "@/content/portal";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  kind: StatusKind;
  status: string;
  className?: string;
};

/** Warna sesuai SPEC-PORTAL A7. Semua kombinasi teks/latar ≥ 4.5:1. */
const tones: Record<StatusTone, string> = {
  neutral: "border-line bg-paper text-ink",
  brand: "border-brand/20 bg-brand-soft text-primary",
  sand: "border-sand-deep bg-sand-deep/60 text-ink",
  success: "border-success/20 bg-success-soft text-success",
  muted: "border-line bg-placeholder/60 text-ink/75",
};

/** Status selalu tampil sebagai badge berlabel bahasa klien. */
export function StatusBadge({ kind, status, className }: StatusBadgeProps) {
  const defs: Record<string, { label: string; tone: StatusTone }> = statuses[kind];
  const def = defs[status] ?? { label: status, tone: "neutral" as const };

  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center rounded-full border px-2.5 font-heading text-xs font-semibold whitespace-nowrap",
        tones[def.tone],
        className,
      )}
    >
      {def.label}
    </span>
  );
}
