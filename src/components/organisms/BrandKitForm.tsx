"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { saveBrandKit, type BrandKitInput } from "@/app/(portal)/admin/clients/actions";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type BrandKitFormProps = {
  clientId: string;
  brandId: string;
  initial: { guideline: string; voice: string; palette: string[]; fonts: string; assetUrl: string };
};

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Panduan brand: warna, font, gaya bahasa (dipakai asisten caption AI), dan link folder aset. */
export function BrandKitForm({ clientId, brandId, initial }: BrandKitFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<BrandKitInput>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const palette = values.palette ?? [];
  const dirty = JSON.stringify(values) !== saved;

  const update = (patch: Partial<BrandKitInput>) =>
    setValues((current) => ({ ...current, ...patch }));
  const setColor = (index: number, color: string) =>
    update({ palette: palette.map((item, i) => (i === index ? color : item)) });

  function submit() {
    startTransition(async () => {
      const result = await saveBrandKit(clientId, brandId, values);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setError(undefined);
      setSaved(JSON.stringify(values));
      toast.success("Brand kit tersimpan.");
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
      className="grid gap-5"
    >
      <fieldset className="grid gap-2">
        <legend className="mb-1 font-heading font-semibold text-ink">Palet warna</legend>
        <ul className="flex flex-wrap gap-2">
          {palette.map((color, index) => (
            <li
              key={index}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-paper p-1.5"
            >
              <input
                type="color"
                value={HEX.test(color) ? color : "#000000"}
                onChange={(event) => setColor(index, event.target.value.toUpperCase())}
                aria-label={`Warna ${index + 1}`}
                className="size-8 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <Input
                value={color}
                onChange={(event) => setColor(index, event.target.value.trim())}
                aria-label={`Kode warna ${index + 1}`}
                aria-invalid={!HEX.test(color) || undefined}
                className="h-8 w-24 font-mono text-xs uppercase"
                maxLength={7}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Hapus warna ${color}`}
                onClick={() => update({ palette: palette.filter((_, i) => i !== index) })}
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
          {palette.length < 12 && (
            <li>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => update({ palette: [...palette, "#000000"] })}
              >
                <Plus aria-hidden />
                Tambah warna
              </Button>
            </li>
          )}
        </ul>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="kit-fonts" label="Font" hint="Mis. Judul: Playfair Display · Isi: Inter">
          <Input
            id="kit-fonts"
            value={values.fonts ?? ""}
            onChange={(event) => update({ fonts: event.target.value })}
          />
        </Field>
        <Field
          id="kit-url"
          label="Link folder aset"
          hint="Google Drive / Dropbox berisi logo, foto, dsb."
        >
          <Input
            id="kit-url"
            type="url"
            inputMode="url"
            value={values.assetUrl ?? ""}
            placeholder="https://drive.google.com/…"
            onChange={(event) => update({ assetUrl: event.target.value })}
          />
        </Field>
      </div>

      <Field
        id="kit-voice"
        label="Gaya bahasa (tone of voice)"
        hint="Dipakai asisten caption AI. Mis. santai & hangat, pakai “kamu”, emoji secukupnya, hindari kata ‘murah’."
      >
        <Textarea
          id="kit-voice"
          rows={4}
          value={values.voice ?? ""}
          onChange={(event) => update({ voice: event.target.value })}
        />
      </Field>

      <Field
        id="kit-guideline"
        label="Panduan brand"
        hint="Aturan penting untuk desainer: penggunaan logo, larangan, hashtag wajib, CTA, dsb."
      >
        <Textarea
          id="kit-guideline"
          rows={7}
          value={values.guideline ?? ""}
          onChange={(event) => update({ guideline: event.target.value })}
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          Simpan brand kit
        </Button>
      </div>
    </form>
  );
}
