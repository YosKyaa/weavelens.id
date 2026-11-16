import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/atoms/EmptyState";
import { StatTile } from "@/components/atoms/StatTile";
import { PageHeader } from "@/components/molecules/PageHeader";
import { RangeFilter } from "@/components/molecules/RangeFilter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { formatRupiah } from "@/lib/booth/profile";

const RANGES = [1, 7, 30] as const;
const ROWS = 100;

const METHOD: Record<string, string> = { qris: "QRIS", cash: "Tunai", free: "Gratis" };
const STATUS: Record<string, { label: string; tone: string }> = {
  paid: { label: "Lunas", tone: "border-success/20 bg-success-soft text-success" },
  pending: { label: "Menunggu", tone: "border-line bg-sand text-ink" },
  expired: { label: "Kedaluwarsa", tone: "border-line bg-placeholder/60 text-ink/75" },
  cancelled: { label: "Dibatalkan", tone: "border-line bg-placeholder/60 text-ink/75" },
  failed: { label: "Gagal", tone: "border-danger/20 bg-danger-soft text-danger" },
};

const dateTime = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

const when = (value: string | null) => (value ? dateTime.format(new Date(value)) : "—");

type Props = { searchParams: Promise<{ days?: string }> };

/** Transaksi dan sesi booth dalam rentang waktu: dibaca langsung lewat RLS izin "booth". */
export default async function BoothOverviewPage({ searchParams }: Props) {
  const { supabase } = await requirePermission("booth");
  const requested = Number((await searchParams).days);
  const days = RANGES.find((value) => value === requested) ?? 7;
  const from = new Date(Date.now() - days * 86_400_000).toISOString();

  const [payments, sessions, devices] = await Promise.all([
    supabase
      .from("booth_payments")
      .select("order_id, session_code, method, amount, discount, voucher_code, status, created_at, paid_at, device_id")
      .gte("created_at", from)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("booth_sessions")
      .select("code, event_id, package_name, layout, print_copies, email, email_sent_at, composition_path, drive_composition_id, created_at, finished_at")
      .gte("synced_at", from)
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(ROWS),
    supabase.from("booth_devices").select("id, name"),
  ]);

  const deviceName = new Map((devices.data ?? []).map((device) => [device.id, device.name]));
  const paid = (payments.data ?? []).filter((payment) => payment.status === "paid");
  const revenue = paid.reduce((sum, payment) => sum + payment.amount, 0);
  const vouchers = paid.filter((payment) => payment.voucher_code).length;
  const qris = paid.filter((payment) => payment.method === "qris").reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <PageHeader
        title="Transaksi & sesi"
        description="Data dari semua tablet booth. Pembayaran tunai dan sesi offline muncul setelah tablet tersinkron."
        actions={<RangeFilter basePath="/admin/booth" options={RANGES} value={days} />}
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Pendapatan lunas" value={formatRupiah(revenue)} hint={`QRIS ${formatRupiah(qris)}`} />
        <StatTile label="Transaksi lunas" value={String(paid.length)} />
        <StatTile label="Sesi tersinkron" value={String(sessions.data?.length ?? 0)} hint={`Maks. ${ROWS} terbaru`} />
        <StatTile label="Memakai voucher" value={String(vouchers)} />
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg">Pembayaran</h2>
        {payments.data && payments.data.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Sesi</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead>Voucher</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tablet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.data.slice(0, ROWS).map((payment) => {
                  const status = STATUS[payment.status] ?? STATUS.pending;
                  return (
                    <TableRow key={payment.order_id}>
                      <TableCell className="whitespace-nowrap">{when(payment.paid_at ?? payment.created_at)}</TableCell>
                      <TableCell className="font-mono">{payment.session_code}</TableCell>
                      <TableCell>{METHOD[payment.method] ?? payment.method}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatRupiah(payment.amount)}</TableCell>
                      <TableCell>
                        {payment.voucher_code ? (
                          <span className="font-mono">
                            {payment.voucher_code}
                            {payment.discount > 0 && (
                              <span className="ml-1 font-sans text-ink/70">−{formatRupiah(payment.discount)}</span>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${status.tone}`}>
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell>{(payment.device_id && deviceName.get(payment.device_id)) || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState message={`Belum ada pembayaran dalam ${days} hari terakhir.`} />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg">Sesi</h2>
        {sessions.data && sessions.data.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead>Layout</TableHead>
                  <TableHead>Cetak</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Galeri</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.data.map((session) => {
                  const uploaded = Boolean(session.composition_path || session.drive_composition_id);
                  return (
                    <TableRow key={session.code}>
                      <TableCell className="whitespace-nowrap">{when(session.created_at)}</TableCell>
                      <TableCell className="font-mono">{session.code}</TableCell>
                      <TableCell>{session.package_name ?? "—"}</TableCell>
                      <TableCell>{session.layout ?? "—"}</TableCell>
                      <TableCell>{session.print_copies}</TableCell>
                      <TableCell className="max-w-48 truncate">
                        {session.email ? `${session.email}${session.email_sent_at ? " · terkirim" : ""}` : "—"}
                      </TableCell>
                      <TableCell>
                        {uploaded ? (
                          <Link
                            href={`/g/${session.code}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 font-semibold text-primary"
                          >
                            Buka <ExternalLink aria-hidden className="size-3.5" />
                          </Link>
                        ) : (
                          <span className="text-ink/70">Belum terunggah</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState message="Belum ada sesi tersinkron. Sesi muncul setelah tablet terhubung internet dan antrean unggahnya selesai." />
        )}
      </section>
    </>
  );
}
