"use client";

import { startTransition, useActionState, useState, useTransition, type FormEvent } from "react";
import { Eye, EyeOff, Info, Loader2, Mail } from "lucide-react";
import {
  sendMagicLink,
  signInWithGoogle,
  signInWithPassword,
  type AuthState,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { portal } from "@/content/portal";

type LoginFormProps = {
  next?: string;
  /** Pesan dari URL (mis. link kedaluwarsa, akun Google belum terdaftar). */
  initialError?: string;
  /** Tab yang dibuka pertama: tim (bawaan) atau klien. */
  initialTab?: "team" | "client";
  /** Tombol Google hanya tampil jika provider sudah aktif di Supabase. */
  google?: boolean;
};

const text = portal.login;

function Alert({ state }: { state: AuthState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
      >
        {state.error}
      </p>
    );
  }
  if (state.notice) {
    return (
      <p
        role="status"
        className="rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm font-medium text-success"
      >
        {state.notice}
      </p>
    );
  }
  return null;
}

/** Logo "G" resmi Google (warna asli, sesuai pedoman merek tombol Google). */
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

/** Kirim lewat onSubmit (bukan prop `action`) supaya isian tidak di-reset React setelah submit. */
function submitWith(action: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
}

export function LoginForm({
  next,
  initialError,
  initialTab = "team",
  google: googleOn = false,
}: LoginFormProps) {
  const [linkState, linkAction, linkPending] = useActionState<AuthState, FormData>(
    sendMagicLink,
    initialTab === "client" && initialError ? { error: initialError } : {},
  );
  const [teamState, teamAction, teamPending] = useActionState<AuthState, FormData>(
    signInWithPassword,
    initialTab === "team" && initialError ? { error: initialError } : {},
  );
  const [googleState, setGoogleState] = useState<AuthState>({});
  const [googlePending, startGoogle] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  function google() {
    startGoogle(async () => {
      // Berhasil = server mengalihkan ke Google; yang kembali ke sini hanya pesan gagal.
      const result = await signInWithGoogle(next ?? null);
      if (result?.error) setGoogleState(result);
    });
  }

  const triggerClass =
    "h-10 rounded-md font-heading font-semibold text-ink/70 data-[state=active]:bg-paper data-[state=active]:text-ink data-[state=active]:shadow-soft";

  // Tombol Google untuk tim & klien: akun yang terdaftar diarahkan sesuai perannya.
  const googleBlock = googleOn ? (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={google}
        disabled={googlePending}
        className="h-12 w-full gap-3 border-line bg-paper font-heading text-[15px] font-semibold text-ink shadow-xs hover:bg-canvas"
      >
        {googlePending ? <Loader2 className="animate-spin" aria-hidden /> : <GoogleMark />}
        {googlePending ? text.googleRedirecting : text.google}
      </Button>

      <div className="flex items-center gap-3 text-xs text-ink/55">
        <span aria-hidden className="h-px flex-1 bg-line" />
        {text.divider}
        <span aria-hidden className="h-px flex-1 bg-line" />
      </div>
    </>
  ) : null;

  return (
    <Tabs defaultValue={initialTab} className="gap-6">
      <TabsList className="grid h-12 w-full grid-cols-2 rounded-lg bg-sand/70 p-1">
        <TabsTrigger value="team" className={triggerClass}>
          {text.teamTab}
        </TabsTrigger>
        <TabsTrigger value="client" className={triggerClass}>
          {text.clientTab}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="team" className="grid gap-5">
        <Alert state={googleState.error ? googleState : teamState} />

        {googleBlock}

        <form onSubmit={submitWith(teamAction)} noValidate className="grid gap-4">
          <input type="hidden" name="next" value={next ?? ""} />
          <div className="grid gap-1.5">
            <Label htmlFor="team-email" className="font-heading font-semibold">
              {text.emailLabel}
            </Label>
            <Input
              id="team-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={text.emailPlaceholder}
              required
              className="h-11"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="team-password" className="font-heading font-semibold">
              {text.passwordLabel}
            </Label>
            <div className="relative">
              <Input
                id="team-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="h-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? text.hidePassword : text.showPassword}
                aria-pressed={showPassword}
                className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-ink/60 hover:bg-canvas hover:text-ink"
              >
                {showPassword ? (
                  <EyeOff aria-hidden className="size-4" />
                ) : (
                  <Eye aria-hidden className="size-4" />
                )}
              </button>
            </div>
          </div>
          <Button type="submit" size="lg" className="h-12 w-full" disabled={teamPending}>
            {teamPending && <Loader2 className="animate-spin" aria-hidden />}
            {teamPending ? text.checking : text.signIn}
          </Button>
          <p className="text-center text-xs text-ink/60">{text.forgot}</p>
        </form>
      </TabsContent>

      <TabsContent value="client" className="grid gap-5">
        <p className="flex gap-3 rounded-xl bg-canvas px-4 py-3 text-sm text-ink/80">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
          {text.clientShareHint}
        </p>
        {googleState.error && <Alert state={googleState} />}
        {googleBlock}
        <form onSubmit={submitWith(linkAction)} noValidate className="grid gap-4">
          <Alert state={linkState} />
          <input type="hidden" name="next" value={next ?? ""} />
          <div className="grid gap-1.5">
            <Label htmlFor="client-email" className="font-heading font-semibold">
              {text.emailLabel}
            </Label>
            <Input
              id="client-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={text.emailPlaceholder}
              required
              aria-describedby="client-email-hint"
              className="h-11"
            />
            <p id="client-email-hint" className="text-sm text-ink/65">
              {text.clientHint}
            </p>
          </div>
          <Button type="submit" size="lg" className="h-12 w-full" disabled={linkPending}>
            {linkPending ? <Loader2 className="animate-spin" aria-hidden /> : <Mail aria-hidden />}
            {linkPending ? text.sending : text.sendLink}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
