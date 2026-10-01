import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";

const LOGIN_PATH = "/login";
const PROTECTED = ["/admin", "/client"];

/**
 * Menyegarkan sesi Supabase dan mengarahkan tamu dari halaman portal ke login.
 * Pemeriksaan peran (admin/tim/klien) dilakukan di layout masing-masing dan di setiap Server Action.
 */
export async function middleware(request: NextRequest) {
  // Jaring pengaman: jika Supabase mengembalikan login ke beranda (`/?code=…`, terjadi bila
  // redirect tidak ada di allowlist), teruskan ke callback supaya login tetap selesai.
  if (request.nextUrl.pathname === "/") {
    const { searchParams } = request.nextUrl;
    if (searchParams.has("code") || searchParams.has("error_description")) {
      const url = new URL("/auth/callback", request.url);
      url.search = request.nextUrl.search;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const env = supabaseEnv();
  if (!env) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // getClaims memverifikasi JWT (lokal bila signing key asimetris) dan menyegarkan sesi bila perlu.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ?? null;

  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
  if (!user && isProtected) {
    const url = new URL(LOGIN_PATH, request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/", "/admin/:path*", "/client/:path*", "/login", "/auth/:path*"],
};
