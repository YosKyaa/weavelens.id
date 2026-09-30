"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Lebar A4 dalam piksel CSS (210mm pada 96 dpi). */
const A4_WIDTH = 794;

/**
 * Menampilkan halaman A4 berukuran asli yang diperkecil sesuai lebar wadah.
 * Isinya tidak diubah, hanya diskalakan, jadi pratinjau = hasil cetak.
 */
export function ScaledPage({ children, label }: { children: ReactNode; label: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const update = () => {
      if (!outer.current || !inner.current) return;
      const next = Math.min(1, outer.current.clientWidth / A4_WIDTH);
      setScale(next);
      setHeight(inner.current.offsetHeight * next);
    };
    update();
    const observer = new ResizeObserver(update);
    if (outer.current) observer.observe(outer.current);
    if (inner.current) observer.observe(inner.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={outer}
      role="img"
      aria-label={label}
      className="w-full overflow-hidden rounded-lg shadow-lift"
    >
      <div style={{ height }}>
        <div
          ref={inner}
          style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: A4_WIDTH }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
