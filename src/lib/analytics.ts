import { track } from "@vercel/analytics";
import type { CtaSection } from "@/types";

/** Mencatat klik CTA WhatsApp per section dan admin. Hanya berjalan di browser. */
export function trackCta(section: CtaSection, admin?: string): void {
  track("cta_whatsapp", admin ? { section, admin } : { section });
}
