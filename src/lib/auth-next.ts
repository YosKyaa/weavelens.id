/**
 * Tujuan setelah login disimpan di cookie, BUKAN di query `redirectTo`: Supabase hanya menerima
 * redirect yang cocok persis dengan daftar Redirect URLs, dan `?next=` membuatnya tidak cocok
 * (Supabase lalu melempar ke Site URL / beranda).
 */
export const AUTH_NEXT_COOKIE = "wl_auth_next";

export const authNextCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 15,
};
