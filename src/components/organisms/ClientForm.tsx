"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { saveClient, type ClientInput } from "@/app/(portal)/admin/clients/actions";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { workspaceText } from "@/content/workspace";

const text = workspaceText.clients;

type ClientFormProps = {
  clientId: string | null;
  initial: ClientInput;
  /** Dipanggil setelah klien baru dibuat (mis. menutup dialog). */
  onCreated?: (id: string) => void;
};

export function ClientForm({ clientId, initial, onCreated }: ClientFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(values) !== saved;

  const set = (key: keyof ClientInput) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  function submit() {
    startTransition(async () => {
      const result = await saveClient(clientId, values);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setError(undefined);
      setSaved(JSON.stringify(values));
      if (clientId) {
        toast.success(text.toast.saved);
        router.refresh();
      } else {
        toast.success(text.toast.created);
        onCreated?.(result.id);
        router.push(`/admin/clients/${result.id}`);
      }
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
      <Field id="client-name" label={text.fields.name} required error={error}>
        <Input id="client-name" value={values.name} onChange={set("name")} autoFocus={!clientId} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="client-contact" label={text.fields.contactName}>
          <Input id="client-contact" value={values.contactName} onChange={set("contactName")} />
        </Field>
        <Field id="client-phone" label={text.fields.contactPhone}>
          <Input
            id="client-phone"
            type="tel"
            inputMode="tel"
            value={values.contactPhone}
            onChange={set("contactPhone")}
          />
        </Field>
      </div>
      <Field id="client-email" label={text.fields.contactEmail}>
        <Input
          id="client-email"
          type="email"
          value={values.contactEmail}
          onChange={set("contactEmail")}
        />
      </Field>
      <div>
        <Button type="submit" disabled={pending || (!dirty && Boolean(clientId))}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          {clientId ? "Simpan perubahan" : text.create}
        </Button>
      </div>
    </form>
  );
}
