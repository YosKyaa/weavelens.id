"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateAccount } from "@/app/(portal)/admin/account/actions";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { teamText } from "@/content/team";

const text = teamText.account;

export function AccountForm({ fullName, email }: { fullName: string; email: string }) {
  const router = useRouter();
  const [values, setValues] = useState({ fullName, password: "", confirm: "" });
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const dirty = values.fullName !== fullName || values.password !== "";

  function submit() {
    startTransition(async () => {
      const result = await updateAccount(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(undefined);
      setValues((current) => ({ ...current, password: "", confirm: "" }));
      toast.success(text.saved);
      router.refresh();
    });
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="grid gap-4"
    >
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}
      <Field id="account-email" label={teamText.fields.email}>
        <Input id="account-email" value={email} disabled readOnly />
      </Field>
      <Field id="account-name" label={teamText.fields.fullName} required>
        <Input
          id="account-name"
          value={values.fullName}
          autoComplete="name"
          onChange={(event) => setValues({ ...values, fullName: event.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="account-password" label={text.password} hint={text.passwordHint}>
          <Input
            id="account-password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(event) => setValues({ ...values, password: event.target.value })}
            aria-describedby="account-password-hint"
          />
        </Field>
        <Field id="account-confirm" label={text.confirm}>
          <Input
            id="account-confirm"
            type="password"
            autoComplete="new-password"
            value={values.confirm}
            onChange={(event) => setValues({ ...values, confirm: event.target.value })}
          />
        </Field>
      </div>
      <div>
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          {text.save}
        </Button>
      </div>
    </form>
  );
}
