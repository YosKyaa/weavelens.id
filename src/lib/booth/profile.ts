/**
 * Bentuk `booth_events.profile`: sama dengan EventProfile di tablet
 * (repo photoboothWL: app/src/main/java/id/weavelens/booth/core/BoothConfig.kt). Nama kunci snake_case
 * mengikuti @SerialName di Kotlin. Bila salah satu diubah, ubah keduanya.
 *
 * Portal hanya mengubah kunci yang ada di formulir; kunci lain dari profil lama dipertahankan apa adanya,
 * sehingga pengaturan yang dibuat dari tablet tidak hilang saat profil disimpan dari portal.
 */
import type { Layout } from "@/lib/booth/frames";

export type PayMode = "qris" | "cash" | "free";
export type FilterKind = "original" | "warm" | "mono" | "soft";
export type OutputKind = "print" | "digital" | "both";

export const PAY_MODES: { value: PayMode; label: string; hint: string }[] = [
  { value: "qris", label: "QRIS + tunai", hint: "Tamu memindai QRIS; tunai tetap bisa lewat PIN petugas." },
  { value: "cash", label: "Tunai saja", hint: "Petugas menerima uang lalu memasukkan PIN." },
  { value: "free", label: "Gratis", hint: "Tanpa langkah bayar (mis. acara yang sudah dibayar klien)." },
];

export const FILTERS: { value: FilterKind; label: string }[] = [
  { value: "original", label: "Asli" },
  { value: "warm", label: "Hangat" },
  { value: "mono", label: "Hitam putih" },
  { value: "soft", label: "Lembut" },
];

export const OUTPUTS: { value: OutputKind; label: string }[] = [
  { value: "print", label: "Cetak" },
  { value: "digital", label: "Digital saja" },
  { value: "both", label: "Cetak + digital" },
];

/** Bagian profil yang bisa diatur dari portal. Nilai bawaan = bawaan di tablet. */
export type ProfileForm = {
  payMode: PayMode;
  extraCopyPrice: number;
  extraCopiesMax: number;
  qrExpirySeconds: number;
  countdownSeconds: number;
  previewSeconds: number;
  retakesPerSession: number;
  layoutsOffered: Layout[];
  filtersAllowed: FilterKind[];
  defaultFilter: FilterKind;
  activeFrames: Partial<Record<Layout, string>>;
  askEmail: boolean;
  autoPrint: boolean;
  defaultCopies: number;
};

export const DEFAULT_PROFILE: ProfileForm = {
  payMode: "free",
  extraCopyPrice: 0,
  extraCopiesMax: 3,
  qrExpirySeconds: 180,
  countdownSeconds: 3,
  previewSeconds: 5,
  retakesPerSession: 2,
  layoutsOffered: ["strip", "4r", "grid", "story"],
  filtersAllowed: ["original", "warm", "mono", "soft"],
  defaultFilter: "original",
  activeFrames: {},
  askEmail: true,
  autoPrint: true,
  defaultCopies: 1,
};

type Obj = Record<string, unknown>;

const obj = (value: unknown): Obj =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Obj) : {};

const num = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function listOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T[]): T[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is T => typeof item === "string" && (allowed as readonly string[]).includes(item));
}

const LAYOUTS: Layout[] = ["strip", "4r", "grid", "story"];
const FILTER_KEYS = FILTERS.map((item) => item.value);

/** Profil JSON (dari database) → nilai formulir. Kunci yang hilang memakai bawaan tablet. */
export function readProfile(raw: unknown): ProfileForm {
  const profile = obj(raw);
  const payment = obj(profile.payment);
  const flow = obj(profile.flow);
  const display = obj(profile.display);
  const output = obj(profile.output);
  const frames = obj(display.active_frames);
  const d = DEFAULT_PROFILE;
  return {
    payMode: oneOf(payment.mode, ["qris", "cash", "free"] as const, d.payMode),
    extraCopyPrice: num(payment.extra_copy_price, d.extraCopyPrice),
    extraCopiesMax: num(payment.extra_copies_max, d.extraCopiesMax),
    qrExpirySeconds: num(payment.qr_expiry_seconds, d.qrExpirySeconds),
    countdownSeconds: num(flow.countdown_seconds, d.countdownSeconds),
    previewSeconds: num(flow.preview_seconds, d.previewSeconds),
    retakesPerSession: num(flow.retakes_per_session, d.retakesPerSession),
    layoutsOffered: listOf(display.layouts_offered, LAYOUTS, d.layoutsOffered),
    filtersAllowed: listOf(display.filters_allowed, FILTER_KEYS, d.filtersAllowed),
    defaultFilter: oneOf(display.default_filter, FILTER_KEYS, d.defaultFilter),
    activeFrames: Object.fromEntries(
      Object.entries(frames).filter(
        ([key, value]) => (LAYOUTS as string[]).includes(key) && typeof value === "string",
      ),
    ) as Partial<Record<Layout, string>>,
    askEmail: bool(output.ask_email, d.askEmail),
    autoPrint: bool(output.auto_print, d.autoPrint),
    defaultCopies: num(output.default_copies, d.defaultCopies),
  };
}

/** Nilai formulir digabung ke profil lama: kunci lain (mis. timeout, printer) tidak tersentuh. */
export function writeProfile(raw: unknown, form: ProfileForm): Obj {
  const profile = obj(raw);
  const payment = obj(profile.payment);
  const flow = obj(profile.flow);
  const display = obj(profile.display);
  const output = obj(profile.output);
  return {
    ...profile,
    payment: {
      ...payment,
      mode: form.payMode,
      extra_copy_price: form.extraCopyPrice,
      extra_copies_max: form.extraCopiesMax,
      qr_expiry_seconds: form.qrExpirySeconds,
    },
    flow: {
      ...flow,
      countdown_seconds: form.countdownSeconds,
      preview_seconds: form.previewSeconds,
      retakes_per_session: form.retakesPerSession,
    },
    display: {
      ...display,
      layouts_offered: form.layoutsOffered,
      filters_allowed: form.filtersAllowed,
      default_filter: form.defaultFilter,
      active_frames: form.activeFrames,
    },
    // Printer (printer_id/printer_name/printer_mode) milik tablet; tablet juga tidak menimpanya saat memilih profil.
    output: {
      ...output,
      ask_email: form.askEmail,
      auto_print: form.autoPrint,
      default_copies: form.defaultCopies,
    },
  };
}

export function formatRupiah(value: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;
}
