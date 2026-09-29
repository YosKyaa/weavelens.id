"use client";

import { useEffect } from "react";
import { trackCta } from "@/lib/analytics";
import type { CtaSection } from "@/types";

/** Mencatat klik pada elemen ber-atribut data-cta (dipasang oleh WaLink). */
export function CtaTracker() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[data-cta]");
      const section = link?.dataset.cta;
      if (section) trackCta(section as CtaSection, link.dataset.admin);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
