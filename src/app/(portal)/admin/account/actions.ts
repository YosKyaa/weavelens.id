"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

export type Result = { ok: true } | { ok: false; error: string };

/** Setiap anggota tim mengganti nama tampilan & password sendiri (mis. setelah menerima password sementara). */
export async function updateAccount(input: {
  fullName: string;
  password: string;
  confirm: string;
}): Promise<Result> {
  const parsed = z
    .object({
      fullName: z.string().trim().min(1, "Isi nama.").max(80),
      password: z
        .string()
        .max(72)
        .refine((value) => !value || value.length >= 10, "Password minimal 10 karakter."),
      confirm: z.string(),
    })
    .refine((value) => value.password === value.confirm, "Konfirmasi password tidak sama.")
    .safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Periksa isian." };

  const { supabase, user } = await requireStaff();
  // Profil hanya bisa diubah server (peran tidak boleh diubah sendiri); id diambil dari sesi.
  const db = createServiceClient();
  if (!db) return { ok: false, error: "Server belum dikonfigurasi." };
  const { error } = await db
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Gagal menyimpan nama. Coba lagi." };

  if (parsed.data.password) {
    const { error: passwordError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (passwordError) {
      return {
        ok: false,
        error: /different|same/i.test(passwordError.message)
          ? "Password baru harus berbeda dari yang lama."
          : "Gagal mengganti password. Coba lagi.",
      };
    }
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}
