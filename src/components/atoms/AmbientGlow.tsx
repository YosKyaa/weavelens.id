import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type AmbientGlowProps = {
  tone?: "warm" | "rose" | "light";
  /** Detik; supaya beberapa cahaya tidak bergerak serempak. */
  delay?: number;
  className?: string;
};

const COLOR = {
  warm: "rgb(255 200 150 / 0.55)",
  rose: "rgb(214 140 120 / 0.35)",
  light: "rgb(255 230 205 / 0.28)",
} as const;

/** Bola cahaya lembut yang melayang pelan. Letakkan di dalam elemen `relative overflow-hidden`. */
export function AmbientGlow({ tone = "warm", delay = 0, className }: AmbientGlowProps) {
  const style = { "--glow-color": COLOR[tone], "--glow-delay": `${delay}s` } as CSSProperties;
  return <span aria-hidden style={style} className={cn("glow", className)} />;
}
