/**
 * Mengelompokkan asal kunjungan ke nama yang mudah dibaca di dashboard.
 * UTM menang atas referrer, karena link bio Instagram dibuka lewat in-app browser
 * yang sering tidak mengirim referrer.
 */
const BY_HOST: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "Facebook"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "WhatsApp"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "LinkedIn"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, "X (Twitter)"],
  [/(^|\.)google\.[a-z.]+$/, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)(yahoo\.com|duckduckgo\.com)$/, "Mesin pencari lain"],
];

const BY_UTM: Record<string, string> = {
  instagram: "Instagram",
  ig: "Instagram",
  facebook: "Facebook",
  fb: "Facebook",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  wa: "WhatsApp",
  google: "Google",
  linkedin: "LinkedIn",
};

export function classifySource(input: {
  referrerHost: string | null;
  siteHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
}): string {
  const utm = input.utmSource?.trim().toLowerCase();
  if (utm) {
    const name = BY_UTM[utm] ?? input.utmSource!.trim();
    return input.utmMedium?.toLowerCase() === "bio" ? `${name} (link bio)` : name;
  }

  const host = input.referrerHost?.toLowerCase().replace(/^www\./, "");
  if (!host || host === input.siteHost?.toLowerCase().replace(/^www\./, "")) return "Langsung";
  const match = BY_HOST.find(([pattern]) => pattern.test(host));
  return match ? match[1] : host;
}

export function deviceFromUserAgent(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android/i.test(ua)) return "mobile";
  return "desktop";
}

/** Bot, crawler, dan pratinjau link (WhatsApp, Facebook, dsb.) tidak dihitung sebagai pengunjung. */
export function isBot(ua: string): boolean {
  return (
    !ua ||
    /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|vercel|curl|wget|python|node-fetch/i.test(
      ua,
    )
  );
}
