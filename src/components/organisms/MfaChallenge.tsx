"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserSupabase } from "@/lib/supabase/browser";

/** Form kode 6 digit; setelah benar, sesi naik ke aal2 dan portal terbuka. */
export function MfaChallenge({ next }: { next: string }) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void createBrowserSupabase()
      .auth.mfa.listFactors()
      .then(({ data }) => {
        const factor = data?.totp[0];
        if (factor) setFactorId(factor.id);
        else setError("Tidak ada aplikasi authenticator terdaftar. Hubungi admin WeaveLens.");
      });
  }, []);

  function verify() {
    if (!factorId) return;
    startTransition(async () => {
      const { error: failed } = await createBrowserSupabase().auth.mfa.challengeAndVerify({
        factorId,
        code: code.replace(/\s/g, ""),
      });
      if (failed) {
        setError("Kode salah atau sudah kedaluwarsa. Coba kode terbaru.");
        setCode("");
        return;
      }
      // Muat penuh supaya cookie sesi baru (aal2) dibaca server.
      window.location.assign(next);
    });
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        verify();
      }}
      className="mt-5 grid gap-4"
    >
      <Field id="mfa-code" label="Kode verifikasi" error={error}>
        <Input
          id="mfa-code"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^\d\s]/g, "").slice(0, 7))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="123456"
          className="text-center font-mono text-lg tracking-[0.4em]"
        />
      </Field>
      <Button type="submit" disabled={pending || !factorId || code.replace(/\s/g, "").length !== 6}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />}
        Verifikasi
      </Button>
      <button
        type="button"
        onClick={() => void signOut()}
        className="text-sm font-medium text-ink/70 underline-offset-4 hover:underline"
      >
        Keluar dan masuk dengan akun lain
      </button>
    </form>
  );
}
