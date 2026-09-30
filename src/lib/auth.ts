import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

export const LOGIN_PATH = "/login";
export const ADMIN_HOME = "/admin";
export const CLIENT_HOME = "/client";

/** User yang login beserta profilnya. `null` jika belum login atau profil belum ada. Di-dedupe per request. */
export const getSession = cache(async () => {
  const supabase = await createSessionClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  return { supabase, user, profile };
});

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

/** Beranda sesuai peran. */
export function homeFor(role: string): string {
  return role === "admin" ? ADMIN_HOME : CLIENT_HOME;
}

/** Wajib admin. Tamu diarahkan ke login, klien ke berandanya sendiri. */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(LOGIN_PATH);
  if (session.profile.role !== "admin") redirect(CLIENT_HOME);
  return session;
}

/** Wajib klien. Admin diarahkan ke dashboard admin. */
export async function requireClient(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(LOGIN_PATH);
  if (session.profile.role === "admin") redirect(ADMIN_HOME);
  return session;
}
