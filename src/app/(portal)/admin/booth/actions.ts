"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { LAYOUT_KEYS, slugify } from "@/lib/booth/frames";
import { writeProfile, type ProfileForm } from "@/lib/booth/profile";
import type { Json } from "@/types/database";

/**
 * Menu Photobooth di portal. Semua tulisan memakai sesi user (RLS `booth_is_admin()` = izin "booth"),
 * jadi aturan akses dijaga database, bukan hanya halaman ini.
 */

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const FAILED = "Gagal menyimpan. Periksa koneksi lalu coba lagi.";
const BASE = "/admin/booth";

async function boothDb() {
  const session = await requirePermission("booth");
  return session.supabase;
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? FAILED;
}

const suffix = () => randomBytes(3).toString("hex");

// ─── Event & profil ──────────────────────────────────────────────────────

const layoutSchema = z.enum(LAYOUT_KEYS as [string, ...string[]]);
const filterSchema = z.enum(["original", "warm", "mono", "soft"]);

const profileSchema = z.object({
  payMode: z.enum(["qris", "cash", "free"]),
  extraCopyPrice: z.number().int().min(0, "Harga salinan tidak boleh negatif.").max(10_000_000),
  extraCopiesMax: z.number().int().min(0).max(10),
  qrExpirySeconds: z.number().int().min(60, "Masa berlaku QR minimal 60 detik.").max(900),
  countdownSeconds: z.number().int().min(1).max(10),
  previewSeconds: z.number().int().min(2).max(15),
  retakesPerSession: z.number().int().min(0).max(10),
  layoutsOffered: z.array(layoutSchema).min(1, "Pilih minimal satu layout."),
  filtersAllowed: z.array(filterSchema).min(1, "Pilih minimal satu filter."),
  defaultFilter: filterSchema,
  activeFrames: z.record(z.string(), z.string().max(80)),
  askEmail: z.boolean(),
  autoPrint: z.boolean(),
  defaultCopies: z.number().int().min(1).max(5),
});

const eventSchema = z.object({
  name: z.string().trim().min(1, "Isi nama event.").max(80),
  active: z.boolean(),
  profile: profileSchema,
});

export type EventInput = { name: string; active: boolean; profile: ProfileForm };

export async function saveBoothEvent(id: string | null, input: EventInput): Promise<Result<{ id: string }>> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { name, active, profile } = parsed.data;
  if (!profile.filtersAllowed.includes(profile.defaultFilter)) {
    return { ok: false, error: "Filter bawaan harus termasuk filter yang ditawarkan." };
  }
  const db = await boothDb();

  let existing: unknown = {};
  if (id) {
    const { data } = await db.from("booth_events").select("profile").eq("id", id).maybeSingle();
    if (!data) return { ok: false, error: "Event tidak ditemukan." };
    existing = data.profile;
  }
  const eventId = id ?? `${slugify(name) || "event"}-${suffix()}`;
  const merged = writeProfile(existing, profile as ProfileForm) as Json;
  const { error } = await db
    .from("booth_events")
    .upsert({ id: eventId, name, active, profile: merged }, { onConflict: "id" });
  if (error) return { ok: false, error: FAILED };
  revalidatePath(`${BASE}/events`);
  return { ok: true, id: eventId };
}

// ─── Paket ───────────────────────────────────────────────────────────────

const packageSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().trim().min(1, "Isi nama paket.").max(40),
  price: z.number().int().min(0, "Harga tidak boleh negatif.").max(100_000_000),
  output: z.enum(["print", "digital", "both"]),
  printCopies: z.number().int().min(0).max(10),
  layouts: z.array(layoutSchema).min(1, "Pilih minimal satu layout."),
  active: z.boolean(),
  sort: z.number().int().min(0).max(99),
});

export type PackageInput = z.input<typeof packageSchema>;

export async function saveBoothPackage(id: string | null, input: PackageInput): Promise<Result<{ id: string }>> {
  const parsed = packageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const value = parsed.data;
  if (value.output === "digital" && value.layouts.length > 0 && value.printCopies > 0) {
    value.printCopies = 0;
  }
  if (value.output !== "digital" && value.layouts.every((layout) => layout === "story")) {
    return { ok: false, error: "Layout story hanya untuk paket digital." };
  }
  const db = await boothDb();
  // Id paket unik di semua event dan tidak bentrok dengan paket bawaan tablet ("digital", "strip", ...).
  const packageId = id ?? `p-${slugify(value.name) || "paket"}-${suffix()}`;
  const { error } = await db.from("booth_packages").upsert(
    {
      id: packageId,
      event_id: value.eventId,
      name: value.name,
      price: value.price,
      output: value.output,
      print_copies: value.printCopies,
      layouts: value.layouts,
      active: value.active,
      sort: value.sort,
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false, error: FAILED };
  revalidatePath(`${BASE}/events`);
  return { ok: true, id: packageId };
}

/** Hapus paket: tablet ikut menghapusnya saat Sinkronkan profil (RLS hanya mengirim paket aktif). */
export async function deleteBoothPackage(id: string): Promise<Result> {
  const db = await boothDb();
  const { error } = await db.from("booth_packages").delete().eq("id", id);
  if (error) return { ok: false, error: FAILED };
  revalidatePath(`${BASE}/events`);
  return { ok: true };
}

// ─── Voucher ─────────────────────────────────────────────────────────────

const voucherSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{4,12}$/, "Kode harus 4–12 huruf besar atau angka."),
    kind: z.enum(["rupiah", "percent", "free"]),
    value: z.number().int().min(0),
    packageIds: z.array(z.string().min(1)).max(50),
    maxUses: z.number().int().min(0, "Batas pemakaian tidak boleh negatif.").max(100_000),
    validUntil: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal berlaku tidak sah.")
      .nullable(),
    active: z.boolean(),
  })
  .superRefine((voucher, context) => {
    if (voucher.kind === "rupiah" && voucher.value < 1) {
      context.addIssue({ code: "custom", message: "Potongan rupiah minimal Rp 1.", path: ["value"] });
    }
    if (voucher.kind === "percent" && (voucher.value < 1 || voucher.value > 100)) {
      context.addIssue({ code: "custom", message: "Potongan persen harus 1–100.", path: ["value"] });
    }
  });

export type VoucherInput = z.input<typeof voucherSchema>;

export async function saveBoothVoucher(input: VoucherInput, isNew: boolean): Promise<Result> {
  const parsed = voucherSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const voucher = parsed.data;
  const db = await boothDb();
  if (isNew) {
    const { data } = await db.from("booth_vouchers").select("code").eq("code", voucher.code).maybeSingle();
    if (data) return { ok: false, error: `Kode ${voucher.code} sudah dipakai voucher lain.` };
  }
  // "used" tidak pernah ditulis dari sini: hanya trigger pembayaran lunas yang menaikkannya.
  const { error } = await db.from("booth_vouchers").upsert(
    {
      code: voucher.code,
      kind: voucher.kind,
      value: voucher.kind === "free" ? 0 : voucher.value,
      package_ids: [...new Set(voucher.packageIds)],
      max_uses: voucher.maxUses,
      valid_until: voucher.validUntil,
      active: voucher.active,
    },
    { onConflict: "code" },
  );
  if (error) return { ok: false, error: FAILED };
  revalidatePath(`${BASE}/vouchers`);
  return { ok: true };
}

export async function setBoothVoucherActive(code: string, active: boolean): Promise<Result> {
  const db = await boothDb();
  const { error } = await db.from("booth_vouchers").update({ active }).eq("code", code);
  if (error) return { ok: false, error: FAILED };
  revalidatePath(`${BASE}/vouchers`);
  return { ok: true };
}

// ─── Perangkat ───────────────────────────────────────────────────────────

const deviceNameSchema = z.string().trim().min(1, "Isi nama tablet.").max(40);

/**
 * Daftarkan tablet: token acak 192 bit, yang disimpan hanya SHA-256-nya (sama dengan booth_register_device).
 * Token dikembalikan SEKALI untuk diketik di tablet (Admin > Sistem > Token perangkat).
 */
export async function registerBoothDevice(name: string): Promise<Result<{ token: string }>> {
  const parsed = deviceNameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const db = await boothDb();
  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error } = await db.from("booth_devices").insert({ name: parsed.data, token_hash: tokenHash });
  if (error) return { ok: false, error: FAILED };
  revalidatePath(`${BASE}/devices`);
  return { ok: true, token };
}

const deviceFlagsSchema = z.object({
  active: z.boolean().optional(),
  manageVouchers: z.boolean().optional(),
  name: deviceNameSchema.optional(),
});

export async function updateBoothDevice(
  id: string,
  flags: z.input<typeof deviceFlagsSchema>,
): Promise<Result> {
  const parsed = deviceFlagsSchema.safeParse(flags);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const db = await boothDb();
  const { active, manageVouchers, name } = parsed.data;
  const { error } = await db
    .from("booth_devices")
    .update({
      ...(active === undefined ? {} : { active, revoked_at: active ? null : new Date().toISOString() }),
      ...(manageVouchers === undefined ? {} : { manage_vouchers: manageVouchers }),
      ...(name === undefined ? {} : { name }),
    })
    .eq("id", id);
  if (error) return { ok: false, error: FAILED };
  revalidatePath(`${BASE}/devices`);
  return { ok: true };
}
