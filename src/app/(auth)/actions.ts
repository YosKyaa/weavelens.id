"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { portal } from "@/content/portal";
import { ADMIN_HOME, CLIENT_HOME, LOGIN_PATH } from "@/lib/auth";
import { AUTH_NEXT_COOKIE, authNextCookieOptions } from "@/lib/auth-next";
import { safeNext } from "@/lib/auth-redirect";
import { googleEnabled } from "@/lib/supabase/providers";
import { createSessionClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string };

const text = portal.login.errors;

const passwordSchema = z.object({
  email: z.string().trim().toLowerCase().email(text.emailInvalid),
  password: z.string().min(1, text.passwordMissing),
  next: z.string().optional(),
});

const magicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email(text.emailInvalid),
  next: z.string().optional(),
});

function formValues(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [key, typeof value === "string" ? value : ""]),
  );
}

/** Asal URL untuk link di email: NEXT_PUBLIC_SITE_URL jika ada, selain itu dari header request. */
async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Tim WeaveLens: email + password. Akun klien ditolak di sini agar peran tidak tertukar. */
export async function signInWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = passwordSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createSessionClient();
  if (!supabase) return { error: text.notConfigured };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    // Hanya kredensial yang benar-benar salah yang disebut "email atau password salah".
    // Masalah konfigurasi (mis. API key tidak valid) dicatat di log server.
    if (error?.code === "invalid_credentials" || error?.status === 400) {
      return { error: text.wrongCredentials };
    }
    console.error("[auth] login gagal:", error?.status, error?.message);
    return { error: text.serviceDown };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", data.user.id)
    .maybeSingle();
  if ((profile?.role !== "admin" && profile?.role !== "team") || !profile.active) {
    await supabase.auth.signOut();
    return { error: text.notAdmin };
  }

  redirect(safeNext(parsed.data.next, "admin") ?? ADMIN_HOME);
}

/**
 * Klien: link masuk lewat email. Hanya untuk akun yang sudah dibuat admin (shouldCreateUser: false).
 * Pesan sukses sama untuk email terdaftar maupun tidak, supaya daftar klien tidak bisa ditebak.
 */
export async function sendMagicLink(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = magicLinkSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createSessionClient();
  if (!supabase) return { error: text.notConfigured };

  const next = safeNext(parsed.data.next, "client") ?? CLIENT_HOME;
  // Tanpa query: alamat harus persis sama dengan Redirect URLs di Supabase.
  const callback = new URL("/auth/callback", await siteOrigin());
  (await cookies()).set(AUTH_NEXT_COOKIE, next, authNextCookieOptions);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: callback.toString() },
  });
  if (error?.status === 429) return { error: text.linkFailed };
  if (error) console.info("[auth] magic link tidak dikirim:", error.message);

  return { notice: portal.login.linkSent(parsed.data.email) };
}

/**
 * Tim WeaveLens: masuk dengan akun Google. Hanya email yang sudah didaftarkan admin
 * (pendaftaran baru dimatikan di Supabase); akun Google otomatis tertaut ke email yang sama.
 */
export async function signInWithGoogle(next: string | null): Promise<AuthState> {
  const supabase = await createSessionClient();
  if (!supabase) return { error: text.notConfigured };
  if (!(await googleEnabled())) return { error: text.googleFailed };

  const callback = new URL("/auth/callback", await siteOrigin());
  const target = safeNext(next, "admin") ?? safeNext(next, "client");
  const jar = await cookies();
  if (target) jar.set(AUTH_NEXT_COOKIE, target, authNextCookieOptions);
  else jar.delete(AUTH_NEXT_COOKIE);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString(), queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) return { error: text.googleFailed };
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase?.auth.signOut();
  redirect(LOGIN_PATH);
}
