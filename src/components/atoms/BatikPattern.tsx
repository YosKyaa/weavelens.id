import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type BatikVariant = "kawung" | "parang" | "truntum";

type BatikPatternProps = {
  variant: BatikVariant;
  /** Harus unik per halaman: dipakai sebagai id <pattern>. */
  id: string;
  tone?: "brand" | "light";
  drift?: "diagonal" | "x" | "none";
  /** Durasi satu putaran gerak, dalam detik. Makin besar makin pelan. */
  speed?: number;
  className?: string;
};

const TILE: Record<BatikVariant, number> = { kawung: 64, parang: 48, truntum: 56 };

/** Motif batik modern sebagai line art. Satu tile digambar, lalu diulang oleh <pattern>. */
function Motif({ variant }: { variant: BatikVariant }) {
  if (variant === "kawung") {
    return (
      <>
        <ellipse cx="32" cy="16" rx="8" ry="13" />
        <ellipse cx="32" cy="48" rx="8" ry="13" />
        <ellipse cx="16" cy="32" rx="13" ry="8" />
        <ellipse cx="48" cy="32" rx="13" ry="8" />
        <circle cx="32" cy="32" r="2.5" fill="currentColor" stroke="none" />
        <circle cx="0" cy="0" r="3" />
        <circle cx="64" cy="0" r="3" />
        <circle cx="0" cy="64" r="3" />
        <circle cx="64" cy="64" r="3" />
      </>
    );
  }

  if (variant === "parang") {
    return (
      <>
        <path d="M0 48 C10 40 14 30 24 24 C34 18 38 8 48 0" />
        <path d="M24 48 L48 24 M0 24 L24 0" />
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        <circle cx="36" cy="36" r="2" fill="currentColor" stroke="none" />
      </>
    );
  }

  return (
    <>
      <circle cx="28" cy="28" r="3.5" />
      <path d="M28 16v6M28 34v6M16 28h6M34 28h6M19.5 19.5l4.2 4.2M32.3 32.3l4.2 4.2M36.5 19.5l-4.2 4.2M23.7 32.3l-4.2 4.2" />
      <circle cx="0" cy="0" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="56" cy="0" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="0" cy="56" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="56" cy="56" r="1.6" fill="currentColor" stroke="none" />
    </>
  );
}

/**
 * Lapisan batik dekoratif yang bergerak pelan. Letakkan di dalam elemen `relative`.
 * Atur kepekatan lewat `className` (mis. `opacity-10`).
 */
export function BatikPattern({
  variant,
  id,
  tone = "brand",
  drift = "diagonal",
  speed = 60,
  className,
}: BatikPatternProps) {
  const tile = TILE[variant];
  const style = { "--tile": `${tile}px`, "--batik-speed": `${speed}s` } as CSSProperties;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        tone === "brand" ? "text-primary" : "text-paper",
        className,
      )}
    >
      <svg
        className="batik-layer absolute"
        data-drift={drift}
        style={{
          ...style,
          top: -tile,
          left: -tile,
          width: `calc(100% + ${tile * 2}px)`,
          height: `calc(100% + ${tile * 2}px)`,
        }}
      >
        <defs>
          <pattern id={id} width={tile} height={tile} patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <Motif variant={variant} />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}
