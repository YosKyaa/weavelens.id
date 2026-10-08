"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Tombol "Unduh PDF" untuk laporan: salinan isi dirender ke <body> (.print-root) sehingga
 * saat mencetak hanya laporan yang tampil, tanpa menu/sidebar portal.
 */
export function ReportPrint({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <>
      <Button variant="outline" onClick={() => window.print()}>
        <Download aria-hidden />
        Unduh PDF
      </Button>
      {mounted &&
        createPortal(<div className="print-root print-report">{children}</div>, document.body)}
    </>
  );
}
