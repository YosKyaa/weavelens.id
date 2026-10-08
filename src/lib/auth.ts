import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { PERMISSION_KEYS, type Permission } from "@/lib/permissions";
import { createSessionClient } from "@/lib/supabase/server";

export const LOGIN_PATH = "/login";
export const MFA_PATH = "/login/mfa";
export const ADMIN_HOME = "/admin";
export const CLIENT_HOME = "/client";

export type Role = "admin" | "team" | "client";

/**
 * User yang login beserta profilnya. `null` jika belum login, profil belum ada, atau akun dinonaktifkan.
 * Memakai getClaims(): JWT diverifikasi lokal (tanpa bolak-balik ke server Auth) bila project
 * memakai signing key asimetris, jadi setiap halaman admin lebih cepat. Di-dedupe per request.
 */
const loadSession = cache(async () => {
  const supabase = await createSessionClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, client_id, phone, active, mfa_enabled, profile_team_roles(team_roles(name, permissions))",
    )
    .eq("id", claims.sub)
    .maybeSingle();
  if (!profile || !profile.active) return null;

  const role = profile.role as Role;
  // Anggota tim bisa punya beberapa peran: izinnya digabung.
  const teamRoles = profile.profile_team_roles.flatMap((item) =>
    item.team_roles ? [item.team_roles] : [],
  );
  // Admin punya semua izin; tim sesuai gabungan peran timnya; klien tidak punya izin portal.
  const permissions: Permission[] =
    role === "admin"
      ? PERMISSION_KEYS
      : role === "team"
        ? PERMISSION_KEYS.filter((key) => teamRoles.some((item) => item.permissions.includes(key)))
        : [];

  return {
    supabase,
    user: { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null },
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      role,
      client_id: profile.client_id,
      phone: profile.phone,
      active: profile.active,
    },
    permissions,
    teamRoleName:
      role === "admin" ? "Admin" : teamRoles.map((item) => item.name).join(" + ") || "Tim",
    mfaEnabled: profile.mfa_enabled,
    /** 2FA aktif tapi sesi ini belum memasukkan kode (aal1) → belum boleh masuk portal. */
    mfaPending: profile.mfa_enabled && claims.aal !== "aal2",
  };
});

/** Sesi yang sudah lengkap (termasuk 2FA bila aktif); `null` bila belum login / belum verifikasi 2FA. */
export const getSession = cache(async () => {
  const session = await loadSession();
  return session && !session.mfaPending ? session : null;
});

/** Status login mentah, untuk halaman masuk & verifikasi 2FA. */
export const getLoginState = loadSession;

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

/** Wajib login penuh; sesi yang masih menunggu kode 2FA diarahkan ke halaman verifikasi. */
async function sessionOrRedirect(): Promise<Session> {
  const session = await loadSession();
  if (!session) redirect(LOGIN_PATH);
  if (session.mfaPending) redirect(MFA_PATH);
  return session;
}

export function isStaff(role: string): boolean {
  return role === "admin" || role === "team";
}

/** Beranda sesuai peran. */
export function homeFor(role: string): string {
  return isStaff(role) ? ADMIN_HOME : CLIENT_HOME;
}

/** Wajib tim WeaveLens (admin atau team). Data yang terlihat tim dibatasi RLS ke proyek yang ditugaskan. */
export async function requireStaff(): Promise<Session> {
  const session = await sessionOrRedirect();
  if (!isStaff(session.profile.role)) redirect(CLIENT_HOME);
  return session;
}

/** Wajib admin. Anggota tim diarahkan ke Ringkasan (mis. membuka /admin/invoices lewat URL). */
export async function requireAdmin(): Promise<Session> {
  const session = await sessionOrRedirect();
  if (session.profile.role === "team") redirect(`${ADMIN_HOME}?status=forbidden`);
  if (session.profile.role !== "admin") redirect(CLIENT_HOME);
  return session;
}

export function can(session: Session, permission: Permission): boolean {
  return session.permissions.includes(permission);
}

/** Wajib izin tertentu (admin selalu lolos). Tanpa izin: kembali ke Ringkasan dengan pesan. */
export async function requirePermission(permission: Permission): Promise<Session> {
  const session = await requireStaff();
  if (!can(session, permission)) redirect(`${ADMIN_HOME}?status=forbidden`);
  return session;
}

/** Wajib klien. Tim WeaveLens diarahkan ke dashboard admin. */
export async function requireClient(): Promise<Session> {
  const session = await sessionOrRedirect();
  if (isStaff(session.profile.role)) redirect(ADMIN_HOME);
  return session;
}
