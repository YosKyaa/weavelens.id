"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requirePermission } from "@/lib/auth";
import { isId } from "@/lib/ids";
import { PERMISSION_KEYS, type Permission } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Manajemen akun tim. Hanya admin; membuat/menonaktifkan akun memakai service role (server saja).
 * Password sementara ditampilkan SEKALI ke admin, tidak disimpan di mana pun.
 */

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const FAILED = "Gagal menyimpan. Periksa koneksi lalu coba lagi.";
const NO_SERVICE = "SUPABASE_SERVICE_ROLE_KEY belum diisi di server.";

/** 14 karakter tanpa huruf mirip (0/O, 1/l/I) supaya mudah diketik dari WhatsApp. */
function temporaryPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 14 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

function refresh() {
  revalidatePath("/admin/team");
}

/** Akses anggota: "admin" (akses penuh) atau daftar peran tim (boleh lebih dari satu, boleh kosong). */
const accessSchema = z.union([
  z.literal("admin"),
  z
    .array(z.string().refine(isId, "Peran tidak valid."))
    .max(10, "Maksimal 10 peran.")
    .transform((ids) => [...new Set(ids)]),
]);

export type MemberAccess = z.input<typeof accessSchema>;

/** Kolom profil sesuai akses. `team_role_id` (usang) dikosongkan; peran ada di profile_team_roles. */
function accessColumns(access: "admin" | string[]) {
  return { role: access === "admin" ? "admin" : "team", team_role_id: null };
}

/** Ganti seluruh peran tim anggota (admin: semua peran tim dihapus). */
async function replaceTeamRoles(
  db: NonNullable<ReturnType<typeof createServiceClient>>,
  memberId: string,
  access: "admin" | string[],
): Promise<boolean> {
  const { error: clearError } = await db
    .from("profile_team_roles")
    .delete()
    .eq("profile_id", memberId);
  if (clearError) return false;
  if (access === "admin" || access.length === 0) return true;
  const { error } = await db
    .from("profile_team_roles")
    .insert(access.map((roleId) => ({ profile_id: memberId, team_role_id: roleId })));
  return !error;
}

const memberSchema = z.object({
  fullName: z.string().trim().min(1, "Isi nama.").max(80),
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
  access: accessSchema,
});

export type MemberInput = z.input<typeof memberSchema>;

export async function createMember(input: MemberInput): Promise<Result<{ password: string }>> {
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  await requireAdmin();
  const db = createServiceClient();
  if (!db) return { ok: false, error: NO_SERVICE };

  const password = temporaryPassword();
  const { data, error } = await db.auth.admin.createUser({
    email: parsed.data.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });
  if (error || !data.user) {
    return {
      ok: false,
      error: /already|registered|exists/i.test(error?.message ?? "")
        ? "Email ini sudah terdaftar. Ubah perannya dari daftar di bawah."
        : FAILED,
    };
  }

  const { error: profileError } = await db.from("profiles").upsert({
    id: data.user.id,
    full_name: parsed.data.fullName,
    ...accessColumns(parsed.data.access),
    client_id: null,
    active: true,
  });
  if (profileError) return { ok: false, error: FAILED };
  if (!(await replaceTeamRoles(db, data.user.id, parsed.data.access))) {
    return { ok: false, error: FAILED };
  }

  refresh();
  return { ok: true, password };
}

/** Mencegah admin terakhir kehilangan akses (mis. menurunkan atau menonaktifkan diri sendiri). */
async function wouldRemoveLastAdmin(memberId: string): Promise<boolean> {
  const db = createServiceClient();
  if (!db) return true;
  const { data } = await db.from("profiles").select("id").eq("role", "admin").eq("active", true);
  const admins = (data ?? []).map((row) => row.id);
  return admins.length <= 1 && admins.includes(memberId);
}

export async function updateMember(
  memberId: string,
  input: { fullName: string; access: MemberAccess },
): Promise<Result> {
  if (!isId(memberId)) return { ok: false, error: FAILED };
  const parsed = memberSchema.pick({ fullName: true, access: true }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  await requireAdmin();
  const db = createServiceClient();
  if (!db) return { ok: false, error: NO_SERVICE };

  if (parsed.data.access !== "admin" && (await wouldRemoveLastAdmin(memberId))) {
    return { ok: false, error: "Harus ada minimal satu admin aktif." };
  }
  const { error } = await db
    .from("profiles")
    .update({ full_name: parsed.data.fullName, ...accessColumns(parsed.data.access) })
    .eq("id", memberId)
    .in("role", ["admin", "team"]);
  if (error) return { ok: false, error: FAILED };
  if (!(await replaceTeamRoles(db, memberId, parsed.data.access))) {
    return { ok: false, error: FAILED };
  }
  refresh();
  return { ok: true };
}

/** Nonaktif = tidak bisa login dan semua hak di database langsung hilang (RLS memeriksa `active`). */
export async function setMemberActive(memberId: string, active: boolean): Promise<Result> {
  if (!isId(memberId)) return { ok: false, error: FAILED };
  const { user } = await requireAdmin();
  if (memberId === user.id && !active) {
    return { ok: false, error: "Kamu tidak bisa menonaktifkan akunmu sendiri." };
  }
  const db = createServiceClient();
  if (!db) return { ok: false, error: NO_SERVICE };
  if (!active && (await wouldRemoveLastAdmin(memberId))) {
    return { ok: false, error: "Harus ada minimal satu admin aktif." };
  }

  const { error } = await db
    .from("profiles")
    .update({ active: active === true })
    .eq("id", memberId);
  if (error) return { ok: false, error: FAILED };
  // Blokir login juga di sisi Auth (sesi yang ada tetap tidak punya hak karena RLS).
  await db.auth.admin.updateUserById(memberId, { ban_duration: active ? "none" : "876000h" });
  refresh();
  return { ok: true };
}

export async function resetMemberPassword(memberId: string): Promise<Result<{ password: string }>> {
  if (!isId(memberId)) return { ok: false, error: FAILED };
  await requireAdmin();
  const db = createServiceClient();
  if (!db) return { ok: false, error: NO_SERVICE };
  const password = temporaryPassword();
  const { error } = await db.auth.admin.updateUserById(memberId, { password });
  if (error) return { ok: false, error: FAILED };
  return { ok: true, password };
}

/** Atur siapa saja anggota tim yang bisa mengerjakan satu proyek. */
export async function setProjectMembers(projectId: string, memberIds: string[]): Promise<Result> {
  if (!isId(projectId) || !memberIds.every(isId)) return { ok: false, error: FAILED };
  const { supabase } = await requirePermission("projects.manage");

  const { data: current } = await supabase
    .from("project_members")
    .select("profile_id")
    .eq("project_id", projectId);
  const existing = new Set((current ?? []).map((row) => row.profile_id));
  const wanted = new Set(memberIds);
  const toRemove = [...existing].filter((id) => !wanted.has(id));
  const toAdd = [...wanted].filter((id) => !existing.has(id));

  if (toRemove.length) {
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .in("profile_id", toRemove);
    if (error) return { ok: false, error: FAILED };
  }
  if (toAdd.length) {
    const { error } = await supabase
      .from("project_members")
      .insert(toAdd.map((profileId) => ({ project_id: projectId, profile_id: profileId })));
    if (error) return { ok: false, error: FAILED };
  }
  revalidatePath(`/admin/projects/${projectId}`, "layout");
  revalidatePath("/admin/projects");
  refresh();
  return { ok: true };
}

// ─── Peran tim (kumpulan izin) ─────────────────────────────────────────────

const roleSchema = z.object({
  name: z.string().trim().min(1, "Isi nama peran.").max(40),
  description: z
    .string()
    .trim()
    .max(160)
    .transform((value) => value || null),
  permissions: z.array(z.enum(PERMISSION_KEYS as [Permission, ...Permission[]])).max(10),
});

export type TeamRoleInput = z.input<typeof roleSchema>;

export async function saveTeamRole(roleId: string | null, input: TeamRoleInput): Promise<Result> {
  if (roleId !== null && !isId(roleId)) return { ok: false, error: FAILED };
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  const { supabase } = await requireAdmin();
  const row = { ...parsed.data, permissions: [...new Set(parsed.data.permissions)] };

  const { error } = roleId
    ? await supabase.from("team_roles").update(row).eq("id", roleId)
    : await supabase.from("team_roles").insert(row);
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Nama peran sudah dipakai. Pilih nama lain." : FAILED,
    };
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Anggota yang memakai peran ini kembali ke akses dasar (hanya proyek yang ditugaskan). */
export async function deleteTeamRole(roleId: string): Promise<Result> {
  if (!isId(roleId)) return { ok: false, error: FAILED };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("team_roles").delete().eq("id", roleId);
  if (error) return { ok: false, error: FAILED };
  revalidatePath("/admin", "layout");
  return { ok: true };
}
