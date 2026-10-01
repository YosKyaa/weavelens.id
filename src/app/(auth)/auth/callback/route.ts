import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { ADMIN_HOME, CLIENT_HOME, LOGIN_PATH } from "@/lib/auth";
import { AUTH_NEXT_COOKIE } from "@/lib/auth-next";
import { safeNext } from "@/lib/auth-redirect";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Tujuan link masuk dari email dan login Google. Mendukung dua format Supabase:
 * `?code=` (PKCE: magic link & OAuth) dan `?token_hash=&type=` (template email kustom).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`${LOGIN_PATH}?error=${reason}`, request.url));
  // OAuth dibatalkan/ditolak, mis. email Google belum didaftarkan admin (pendaftaran dimatikan).
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError) {
    return fail(/signup|not allowed|disabled/i.test(oauthError) ? "account" : "google");
  }
  const failed = fail(tokenHash ? "link" : "session");

  const supabase = await createSessionClient();
  if (!supabase) return failed;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: new Error("missing token") };
  if (error) return failed;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failed;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();
  // Akun tanpa profil atau yang dinonaktifkan admin tidak boleh masuk.
  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    return fail("account");
  }
  const role = profile?.role === "admin" || profile?.role === "team" ? "admin" : "client";
  const home = role === "admin" ? ADMIN_HOME : CLIENT_HOME;
  // Tujuan dari query (link lama) atau cookie yang diset saat tombol login ditekan.
  const requested = searchParams.get("next") ?? request.cookies.get(AUTH_NEXT_COOKIE)?.value;
  const target = safeNext(requested, role) ?? home;

  const response = NextResponse.redirect(new URL(target, request.url));
  response.cookies.delete(AUTH_NEXT_COOKIE);
  return response;
}
