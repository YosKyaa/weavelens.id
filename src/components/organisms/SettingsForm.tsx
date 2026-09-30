"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { saveSettings, type SettingsInput } from "@/app/(portal)/admin/settings/actions";
import { FormSection } from "@/components/molecules/FormSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { invoiceText } from "@/content/invoice";
import type { CompanyInfo } from "@/lib/invoice";

const text = invoiceText.settings;

type Key = keyof SettingsInput;

export function SettingsForm({ initial }: { initial: CompanyInfo }) {
  const [values, setValues] = useState<SettingsInput>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(values) !== saved;

  function input(key: Key, options: { type?: string; multiline?: boolean; hint?: string } = {}) {
    const id = `settings-${key}`;
    const common = {
      id,
      value: values[key],
      onChange: (event: { target: { value: string } }) =>
        setValues((current) => ({ ...current, [key]: event.target.value })),
    };
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={id} className="font-heading font-semibold text-ink">
          {text.fields[key]}
        </Label>
        {options.multiline ? (
          <Textarea {...common} rows={2} />
        ) : (
          <Input {...common} type={options.type ?? "text"} />
        )}
        {options.hint && <p className="text-sm text-ink/70">{options.hint}</p>}
      </div>
    );
  }

  function save() {
    startTransition(async () => {
      const result = await saveSettings(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(JSON.stringify(values));
      toast.success(text.saved);
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="grid max-w-3xl gap-5"
    >
      <FormSection title="Perusahaan">
        {input("companyName")}
        <div className="grid gap-4 sm:grid-cols-2">
          {input("phone", { type: "tel" })}
          {input("email", { type: "email" })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {input("website")}
          {input("address")}
        </div>
      </FormSection>
      <FormSection
        title="Pembayaran"
        description="Terisi otomatis di setiap invoice baru; bisa diubah per invoice."
      >
        {input("paymentMethods")}
        {input("bankDetails", { multiline: true, hint: text.fields.bankDetailsHint })}
      </FormSection>
      <FormSection title="Penanda tangan invoice">
        <div className="grid gap-4 sm:grid-cols-2">
          {input("signerName")}
          {input("signerRole")}
        </div>
      </FormSection>
      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending || !dirty}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          {text.save}
        </Button>
        {dirty && <p className="text-sm text-ink/70">Ada perubahan yang belum disimpan.</p>}
      </div>
    </form>
  );
}
