import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type GlassChipProps = {
  label: string;
  tone?: "light" | "dark";
  /** Jeda animasi mengambang (detik), supaya chip tidak bergerak serempak. */
  floatDelay?: number;
  className?: string;
};

/** Label kecil semi-transparan yang mengambang di atas foto atau panel. */
export function GlassChip({ label, tone = "light", floatDelay, className }: GlassChipProps) {
  const style =
    floatDelay === undefined ? undefined : ({ "--float-delay": `${floatDelay}s` } as CSSProperties);

  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center rounded-full px-4 py-2 font-heading text-sm font-semibold",
        tone === "light" ? "glass-lite text-ink" : "glass-dark text-primary-foreground",
        floatDelay !== undefined && "float",
        className,
      )}
    >
      {label}
    </span>
  );
}
