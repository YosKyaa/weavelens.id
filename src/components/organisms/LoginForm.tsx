"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { sendMagicLink, signInWithPassword, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { portal } from "@/content/portal";

type LoginFormProps = {
  next?: string;
  /** Pesan dari URL, mis. link masuk kedaluwarsa. */
  initialError?: string;
};

const text = portal.login;

function Alert({ state }: { state: AuthState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
      >
        {state.error}
      </p>
    );
  }
  if (state.notice) {
    return (
      <p
        role="status"
        className="rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm font-medium text-success"
      >
        {state.notice}
      </p>
    );
  }
  return null;
}

/** Kirim lewat onSubmit (bukan prop `action`) supaya isian tidak di-reset React setelah submit. */
function submitWith(action: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
}

export function LoginForm({ next, initialError }: LoginFormProps) {
  const [linkState, linkAction, linkPending] = useActionState<AuthState, FormData>(sendMagicLink, {
    error: initialError,
  });
  const [teamState, teamAction, teamPending] = useActionState<AuthState, FormData>(
    signInWithPassword,
    {},
  );

  return (
    <Tabs defaultValue={next?.startsWith("/admin") ? "team" : "client"} className="gap-6">
      <TabsList className="grid h-11 w-full grid-cols-2 rounded-md bg-sand p-1">
        <TabsTrigger
          value="client"
          className="rounded-sm font-heading font-semibold text-ink/80 data-[state=active]:bg-paper data-[state=active]:text-ink"
        >
          {text.clientTab}
        </TabsTrigger>
        <TabsTrigger
          value="team"
          className="rounded-sm font-heading font-semibold text-ink/80 data-[state=active]:bg-paper data-[state=active]:text-ink"
        >
          {text.teamTab}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="client">
        <form onSubmit={submitWith(linkAction)} noValidate className="space-y-5">
          <Alert state={linkState} />
          <input type="hidden" name="next" value={next ?? ""} />
          <div className="space-y-2">
            <Label htmlFor="client-email" className="font-heading font-semibold">
              {text.emailLabel}
            </Label>
            <Input
              id="client-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-describedby="client-email-hint"
            />
            <p id="client-email-hint" className="text-sm text-ink/70">
              {text.clientHint}
            </p>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={linkPending}>
            {linkPending && <Loader2 className="animate-spin" aria-hidden />}
            {linkPending ? text.sending : text.sendLink}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="team">
        <form onSubmit={submitWith(teamAction)} noValidate className="space-y-5">
          <Alert state={teamState} />
          <input type="hidden" name="next" value={next ?? ""} />
          <div className="space-y-2">
            <Label htmlFor="team-email" className="font-heading font-semibold">
              {text.emailLabel}
            </Label>
            <Input id="team-email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-password" className="font-heading font-semibold">
              {text.passwordLabel}
            </Label>
            <Input
              id="team-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={teamPending}>
            {teamPending && <Loader2 className="animate-spin" aria-hidden />}
            {teamPending ? text.checking : text.signIn}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
