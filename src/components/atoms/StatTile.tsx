import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTileProps = {
  label: string;
  value: string;
  /** Perubahan dalam persen dibanding periode sebelumnya; `null` = tidak ada pembanding. */
  delta?: number | null;
  deltaLabel?: string;
  /** Satuan perubahan: "%" (default) atau " poin" untuk metrik yang sudah berupa persen. */
  deltaUnit?: string;
  hint?: string;
  /** Naik = baik (default). Untuk metrik yang lebih baik saat turun, isi false. */
  upIsGood?: boolean;
};

/** Kartu angka: label, nilai, dan arah perubahan (ikon + teks, bukan warna saja). */
export function StatTile({
  label,
  value,
  delta = null,
  deltaLabel = "vs periode sebelumnya",
  deltaUnit = "%",
  hint,
  upIsGood = true,
}: StatTileProps) {
  const direction = delta === null || delta === 0 ? "flat" : delta > 0 ? "up" : "down";
  const good = direction === "flat" ? null : (direction === "up") === upIsGood;
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-5">
      <p className="text-sm text-ink/75">{label}</p>
      <p className="font-heading text-3xl font-bold text-ink">{value}</p>
      {delta !== null && (
        <p
          className={cn(
            "flex flex-wrap items-center gap-x-1 text-sm",
            good === true && "text-success",
            good === false && "text-danger",
            good === null && "text-ink/70",
          )}
        >
          <Icon aria-hidden className="size-4" />
          <span className="font-semibold whitespace-nowrap">
            {delta > 0 ? "+" : ""}
            {delta}
            {deltaUnit}
          </span>
          <span className="text-ink/70">{deltaLabel}</span>
        </p>
      )}
      {hint && <p className="text-xs text-ink/65">{hint}</p>}
    </div>
  );
}
