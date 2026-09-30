"use client";

import { useEffect } from "react";
import { trackCta } from "@/lib/analytics";
import { sendEvent } from "@/lib/beacon";
import type { CtaSection } from "@/types";

/** Mencatat klik pada elemen ber-atribut data-cta (dipasang oleh WaLink) ke Vercel Analytics dan analitik sendiri. */
export function CtaTracker() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[data-cta]");
      const section = link?.dataset.cta;
      if (!section) return;
      trackCta(section as CtaSection, link.dataset.admin);
      sendEvent("cta", { section, admin: link.dataset.admin });
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
