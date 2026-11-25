import { requirePermission } from "@/lib/auth";

export const runtime = "nodejs";

const RANGES = [1, 7, 30, 90] as const;
const METHOD: Record<string, string> = { qris: "QRIS", cash: "Tunai", free: "Gratis" };
const STATUS: Record<string, string> = {
  paid: "Lunas",
  pending: "Menunggu",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  failed: "Gagal",
};

const wib = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Pemisah titik koma: Excel berbahasa Indonesia memakainya untuk CSV, sehingga kolom langsung terpisah. */
function cell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Unduh transaksi booth (CSV) untuk rekap keuangan: /admin/booth/export?days=30. */
export async function GET(request: Request) {
  const { supabase } = await requirePermission("booth");
  const requested = Number(new URL(request.url).searchParams.get("days"));
  const days = RANGES.find((value) => value === requested) ?? 30;
  const from = new Date(Date.now() - days * 86_400_000).toISOString();

  const [payments, devices] = await Promise.all([
    supabase
      .from("booth_payments")
      .select("order_id, session_code, method, status, amount, base_amount, discount, voucher_code, created_at, paid_at, device_id")
      .gte("created_at", from)
      .order("created_at", { ascending: true })
      .limit(10_000),
    supabase.from("booth_devices").select("id, name"),
  ]);
  if (payments.error) return new Response("Gagal membaca transaksi", { status: 500 });
  const deviceName = new Map((devices.data ?? []).map((device) => [device.id, device.name]));

  const header = ["Waktu (WIB)", "Order ID", "Kode sesi", "Metode", "Status", "Nominal", "Harga paket", "Potongan", "Voucher", "Tablet"];
  const lines = (payments.data ?? []).map((payment) =>
    [
      wib.format(new Date(payment.paid_at ?? payment.created_at)),
      payment.order_id,
      payment.session_code,
      METHOD[payment.method] ?? payment.method,
      STATUS[payment.status] ?? payment.status,
      payment.amount,
      payment.base_amount ?? payment.amount + payment.discount,
      payment.discount,
      payment.voucher_code,
      payment.device_id ? deviceName.get(payment.device_id) : "",
    ]
      .map(cell)
      .join(";"),
  );
  const today = wib.format(new Date()).slice(0, 10);
  // BOM agar Excel membaca UTF-8 (nama tablet/voucher) dengan benar.
  const body = `﻿${[header.join(";"), ...lines].join("\r\n")}\r\n`;
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="transaksi-booth-${days}hari-${today}.csv"`,
      "cache-control": "no-store",
    },
  });
}
