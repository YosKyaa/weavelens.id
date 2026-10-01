import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

export const LOGIN_PATH = "/login";
export const ADMIN_HOME = "/admin";
export const CLIENT_HOME = "/client";

export type Role = "admin" | "team" | "client";

/**
 * User yang login beserta profilnya. `null` jika belum login, profil belum ada, atau akun dinonaktifkan.
 * Memakai getClaims(): JWT diverifikasi lokal (tanpa bolak-balik ke server Auth) bila project
 * memakai signing key asimetris, jadi setiap halaman admin lebih cepat. Di-dedupe per request.
 */
export const getSession = cache(async () => {
  const supabase = await createSessionClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, client_id, phone, active")
    .eq("id", claims.sub)
    .maybeSingle();
  if (!profile || !profile.active) return null;

  return {
    supabase,
    user: { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null },
    profile: { ...profile, role: profile.role as Role },
  };
});

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export function isStaff(role: string): boolean {
  return role === "admin" || role === "team";
}

/** Beranda sesuai peran. */
export function homeFor(role: string): string {
  return isStaff(role) ? ADMIN_HOME : CLIENT_HOME;
}

/** Wajib tim WeaveLens (admin atau team). Data yang terlihat tim dibatasi RLS ke proyek yang ditugaskan. */
export async function requireStaff(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(LOGIN_PATH);
  if (!isStaff(session.profile.role)) redirect(CLIENT_HOME);
  return session;
}

/** Wajib admin. Anggota tim diarahkan ke Ringkasan (mis. membuka /admin/invoices lewat URL). */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(LOGIN_PATH);
  if (session.profile.role === "team") redirect(`${ADMIN_HOME}?status=forbidden`);
  if (session.profile.role !== "admin") redirect(CLIENT_HOME);
  return session;
}

/** Wajib klien. Tim WeaveLens diarahkan ke dashboard admin. */
export async function requireClient(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(LOGIN_PATH);
  if (isStaff(session.profile.role)) redirect(ADMIN_HOME);
  return session;
}
