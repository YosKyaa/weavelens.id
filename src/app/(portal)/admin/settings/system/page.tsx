import { CheckCircle2, CircleAlert } from "lucide-react";
import { FormSection } from "@/components/molecules/FormSection";
import { formatBytes } from "@/components/organisms/BrandFiles";
import {
  BackupDownload,
  BackupNowButton,
  ClearErrorsButton,
  TestEmailButton,
} from "@/components/organisms/SystemTools";
import { requireAdmin } from "@/lib/auth";
import { driveConfigured } from "@/lib/drive";
import { emailConfigured } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/service";
import { cn } from "@/lib/utils";

const dateTime = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

/** Status layanan, cadangan database, dan log error — untuk admin. */
export default async function SystemPage() {
  const { supabase, mfaEnabled } = await requireAdmin();
  const db = createServiceClient();
  const [backups, { data: errors }] = await Promise.all([
    db
      ? db.storage
          .from("backups")
          .list("daily", { limit: 30, sortBy: { column: "name", order: "desc" } })
      : { data: [] },
    supabase
      .from("error_events")
      .select("id, created_at, source, message, path")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const backupFiles = (backups.data ?? []).filter((file) => file.name.endsWith(".json.gz"));

  const email = emailConfigured();
  const cron = Boolean(process.env.CRON_SECRET);
  const ai = Boolean(process.env.ANTHROPIC_API_KEY);
  const drive = driveConfigured();
  const services = [
    {
      name: "Email (Resend)",
      ok: email,
      detail: email
        ? "Notifikasi review, pengingat otomatis, invoice, dan ringkasan tugas terkirim lewat email."
        : "Isi RESEND_API_KEY dan EMAIL_FROM di Vercel. Tanpa ini, pemberitahuan hanya muncul di lonceng.",
      action: <TestEmailButton disabled={!email} />,
    },
    {
      name: "Tugas harian otomatis",
      ok: cron,
      detail: cron
        ? "Setiap pukul 08.00 WIB: backup, pengingat review klien, ringkasan tugas, ringkasan error."
        : "Isi CRON_SECRET (teks acak panjang) di Vercel supaya backup & pengingat berjalan otomatis.",
    },
    {
      name: "Asisten caption AI",
      ok: ai,
      detail: ai
        ? "Tombol Buat caption dengan AI tersedia di detail konten."
        : "Isi ANTHROPIC_API_KEY (dari platform.claude.com) di Vercel.",
    },
    {
      name: "Google Drive",
      ok: drive,
      detail: drive
        ? "Galeri & desain dari folder Drive aktif."
        : "Opsional: untuk galeri/desain langsung dari Drive.",
    },
    {
      name: "Verifikasi 2 langkah akunmu",
      ok: mfaEnabled,
      detail: mfaEnabled
        ? "Akun admin terlindungi kode dari HP."
        : "Sangat disarankan untuk admin: aktifkan di menu Akun saya.",
    },
  ];

  return (
    <div className="grid max-w-4xl gap-5">
      <FormSection title="Status layanan">
        <ul className="divide-y divide-line">
          {services.map((service) => (
            <li key={service.name} className="flex flex-wrap items-start gap-3 py-3">
              {service.ok ? (
                <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
              ) : (
                <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">
                  {service.name}{" "}
                  <span className="text-sm font-normal text-ink/60">
                    · {service.ok ? "aktif" : "belum aktif"}
                  </span>
                </span>
                <span className="block text-sm text-ink/70">{service.detail}</span>
              </span>
              {service.action}
            </li>
          ))}
        </ul>
      </FormSection>

      <FormSection
        title="Backup database"
        description="Salinan seluruh data portal & isi website (tanpa file desain/foto), disimpan 30 hari terakhir di Storage privat."
      >
        <div className="mb-3">
          <BackupNowButton />
        </div>
        {backupFiles.length === 0 ? (
          <p className="text-sm text-ink/70">Belum ada backup.</p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {backupFiles.slice(0, 10).map((file) => (
              <li key={file.name} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="flex-1 font-medium">{file.name.replace(".json.gz", "")}</span>
                <span className="text-ink/60">
                  {formatBytes(Number((file.metadata as { size?: number } | null)?.size ?? 0))}
                </span>
                <BackupDownload name={file.name} />
              </li>
            ))}
          </ul>
        )}
      </FormSection>

      <FormSection
        title="Log error"
        description="Error yang dialami pengguna (browser) dan server. Ringkasannya dikirim ke email admin setiap pagi."
      >
        {(errors ?? []).length === 0 ? (
          <p className="text-sm text-ink/70">Tidak ada error tercatat.</p>
        ) : (
          <>
            <div className="mb-2 flex justify-end">
              <ClearErrorsButton />
            </div>
            <ul className="grid gap-2">
              {(errors ?? []).map((row) => (
                <li key={row.id} className="rounded-lg border border-line px-3 py-2 text-sm">
                  <p className="flex flex-wrap gap-x-2 text-xs text-ink/60">
                    <span>{dateTime.format(new Date(row.created_at))}</span>
                    <span
                      className={cn(
                        "font-semibold",
                        row.source === "server" ? "text-danger" : "text-primary",
                      )}
                    >
                      {row.source === "server" ? "Server" : "Browser"}
                    </span>
                    {row.path && <span className="break-all">{row.path}</span>}
                  </p>
                  <p className="mt-0.5 font-mono text-xs break-words text-ink">{row.message}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </FormSection>
    </div>
  );
}
