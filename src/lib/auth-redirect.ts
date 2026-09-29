/**
 * Membatasi parameter `?next=` ke halaman portal milik peran tersebut,
 * supaya link login tidak bisa dipakai untuk mengarahkan ke situs lain (open redirect).
 */
export function safeNext(next: string | null | undefined, role: "admin" | "client"): string | null {
  if (!next) return null;
  const base = role === "admin" ? "/admin" : "/c";
  const valid = next === base || (next.startsWith(`${base}/`) && !next.includes("//"));
  return valid ? next : null;
}
