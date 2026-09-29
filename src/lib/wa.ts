import { site } from "@/content/site";
import type { WaAdmin, WaMessageKey } from "@/types";

/** Membuat link wa.me ke admin tertentu dengan pesan yang sudah terisi. */
export function buildWaUrl(admin: WaAdmin, message: WaMessageKey = "general"): string {
  const text = encodeURIComponent(site.wa.messages[message]);
  return `https://wa.me/${admin.number}?text=${text}`;
}
