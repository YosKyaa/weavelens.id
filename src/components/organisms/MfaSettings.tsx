"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Enrollment = { factorId: string; qr: string; secret: string };

/**
 * Verifikasi 2 langkah (TOTP): daftarkan aplikasi authenticator dengan memindai QR, lalu setiap
 * login meminta kode 6 digit. Disarankan untuk admin (akses invoice & seluruh data klien).
 */
export function MfaSettings({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function start() {
    startTransition(async () => {
      const supabase = createBrowserSupabase();
      // Bersihkan pendaftaran lama yang tidak pernah diselesaikan.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const factor of list?.all ?? []) {
        if (factor.status === "unverified")
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      const { data, error: failed } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `WeaveLens ${new Date().toISOString().slice(0, 10)}`,
      });
      if (failed || !data) {
        toast.error("Gagal memulai. Pastikan MFA (TOTP) aktif di Supabase, lalu coba lagi.");
        return;
      }
      setError(undefined);
      setEnrollment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    });
  }

  function confirm() {
    if (!enrollment) return;
    startTransition(async () => {
      const { error: failed } = await createBrowserSupabase().auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code: code.replace(/\s/g, ""),
      });
      if (failed) {
        setError("Kode salah. Pastikan jam HP tepat, lalu masukkan kode terbaru.");
        return;
      }
      setEnrollment(null);
      setCode("");
      toast.success("Verifikasi 2 langkah aktif.");
      router.refresh();
    });
  }

  async function disable() {
    const supabase = createBrowserSupabase();
    const { data } = await supabase.auth.mfa.listFactors();
    for (const factor of data?.totp ?? []) {
      const { error: failed } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (failed) {
        toast.error("Gagal menonaktifkan. Keluar lalu masuk lagi dengan kode, kemudian coba lagi.");
        return;
      }
    }
    toast.success("Verifikasi 2 langkah dinonaktifkan.");
    router.refresh();
  }

  if (enabled) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-ink/80">
          <ShieldCheck aria-hidden className="size-5 text-success" />
          Aktif. Setiap login meminta kode dari aplikasi authenticator.
        </p>
        <ConfirmDialog
          trigger={
            <Button variant="outline" size="sm">
              <ShieldOff aria-hidden />
              Nonaktifkan
            </Button>
          }
          title="Nonaktifkan verifikasi 2 langkah?"
          description="Akun hanya dilindungi password / link email lagi."
          confirmLabel="Nonaktifkan"
          onConfirm={disable}
        />
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-ink/75">
          Lindungi akun dengan kode dari HP (Google Authenticator, Authy, 1Password) — walau
          password bocor, akun tetap aman.
        </p>
        <div>
          <Button onClick={start} disabled={pending}>
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Smartphone aria-hidden />
            )}
            Aktifkan verifikasi 2 langkah
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        confirm();
      }}
      className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- QR berupa data URI SVG */}
      <img
        src={enrollment.qr}
        alt="QR code untuk aplikasi authenticator"
        className="size-44 rounded-lg border border-line bg-white p-2"
      />
      <div className="grid gap-3">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink/80">
          <li>Buka aplikasi authenticator di HP, pilih tambah akun, lalu pindai QR ini.</li>
          <li>
            Tidak bisa memindai? Masukkan kode ini:{" "}
            <code className="rounded bg-canvas px-1.5 py-0.5 text-xs break-all">
              {enrollment.secret}
            </code>
          </li>
          <li>Ketik kode 6 digit yang muncul di aplikasi.</li>
        </ol>
        <Field id="mfa-enroll-code" label="Kode 6 digit" error={error}>
          <Input
            id="mfa-enroll-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/[^\d\s]/g, "").slice(0, 7))}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="max-w-40 font-mono tracking-[0.3em]"
          />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending || code.replace(/\s/g, "").length !== 6}>
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <ShieldCheck aria-hidden />
            )}
            Aktifkan
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEnrollment(null)}>
            Batal
          </Button>
        </div>
      </div>
    </form>
  );
}
