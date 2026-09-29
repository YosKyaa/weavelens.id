import type { CSSProperties } from "react";

type RevealProps = {
  "data-reveal": "";
  style: CSSProperties;
};

/**
 * Atribut untuk elemen yang muncul saat di-scroll (lihat [data-reveal] di globals.css).
 * `step` menggeser urutan muncul supaya kartu dalam satu baris tampil bergantian.
 */
export function reveal(step = 0): RevealProps {
  return { "data-reveal": "", style: { "--reveal-step": step } as CSSProperties };
}
