"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type StickyWaProps = {
  /** id elemen yang harus keluar viewport sebelum tombol muncul. */
  targetId: string;
  /** Tombol WaLink, dirender di server oleh template. */
  children: ReactNode;
};

/** Tombol WA mengambang di kanan-bawah, hanya < 768px, setelah hero lewat. */
export function StickyWa({ targetId, children }: StickyWaProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    const observer = new IntersectionObserver(([entry]) => {
      setVisible(!entry.isIntersecting);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  return (
    <div
      inert={!visible}
      className={cn("fixed right-4 bottom-4 z-40 md:hidden", !visible && "invisible")}
    >
      {children}
    </div>
  );
}
