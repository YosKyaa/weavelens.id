/**
 * Pengirim data analitik dari browser ke /api/t. Tanpa cookie pelacak.
 * Asal kunjungan (UTM + referrer) disimpan per sesi tab, supaya klik WhatsApp
 * setelah pindah halaman tetap tercatat berasal dari, mis., link bio Instagram.
 */

/** Halaman internal yang tidak dihitung sebagai kunjungan website. */
const IGNORED = ["/admin", "/client", "/login", "/auth", "/share/", "/api"];
const SESSION_KEY = "wl_visit_source";

type VisitSource = {
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

function isIgnored(path: string): boolean {
  return IGNORED.some(
    (base) => path === base || path.startsWith(base.endsWith("/") ? base : `${base}/`),
  );
}

/** Tim dan klien yang sedang login tidak ikut dihitung. */
function isSignedIn(): boolean {
  return document.cookie.includes("-auth-token");
}

function visitSource(): VisitSource {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) return JSON.parse(saved) as VisitSource;
  } catch {
    // sessionStorage bisa diblokir (mode privat); lanjut tanpa menyimpan.
  }

  const params = new URLSearchParams(window.location.search);
  const external = document.referrer && !document.referrer.startsWith(window.location.origin);
  const source: VisitSource = {
    referrer: external ? document.referrer : undefined,
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
  };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(source));
  } catch {
    // abaikan
  }
  return source;
}

export function sendEvent(
  type: "pageview" | "cta",
  extra: { section?: string; admin?: string } = {},
): void {
  const path = window.location.pathname;
  if (isIgnored(path) || isSignedIn()) return;

  const body = JSON.stringify({ type, path, ...visitSource(), ...extra });
  const sent = navigator.sendBeacon?.("/api/t", new Blob([body], { type: "application/json" }));
  if (!sent) {
    void fetch("/api/t", { method: "POST", body, keepalive: true }).catch(() => undefined);
  }
}
