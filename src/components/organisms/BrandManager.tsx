"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteBrand, saveBrand } from "@/app/(portal)/admin/clients/actions";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAND_COLORS, workspaceText } from "@/content/workspace";
import { cn } from "@/lib/utils";

const text = workspaceText.clients.brands;

export type BrandRow = { id: string; name: string; color: string; instagram: string | null };

type Draft = { id: string | null; name: string; color: string; instagram: string };

function BrandEditor({
  clientId,
  draft,
  onDone,
}: {
  clientId: string;
  draft: Draft;
  onDone: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState(draft);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const prefix = `brand-${draft.id ?? "new"}`;

  function submit() {
    startTransition(async () => {
      const result = await saveBrand(clientId, values.id, values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(workspaceText.clients.toast.brandSaved);
      router.refresh();
      onDone();
    });
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="grid gap-4 rounded-xl border border-line bg-canvas/60 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${prefix}-name`} label={text.name} required error={error}>
          <Input
            id={`${prefix}-name`}
            value={values.name}
            autoFocus
            onChange={(event) => setValues({ ...values, name: event.target.value })}
            className="bg-paper"
          />
        </Field>
        <Field id={`${prefix}-ig`} label={text.instagram}>
          <Input
            id={`${prefix}-ig`}
            value={values.instagram}
            placeholder="@namabrand"
            onChange={(event) => setValues({ ...values, instagram: event.target.value })}
            className="bg-paper"
          />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 font-heading text-sm font-semibold text-ink">{text.color}</legend>
        <div className="flex flex-wrap gap-2">
          {BRAND_COLORS.map((color) => (
            <label key={color} className="cursor-pointer">
              <input
                type="radio"
                name={`${prefix}-color`}
                value={color}
                checked={values.color === color}
                onChange={() => setValues({ ...values, color })}
                className="peer sr-only"
              />
              <span
                aria-hidden
                style={{ backgroundColor: color }}
                className="block size-8 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-paper peer-checked:ring-ink peer-focus-visible:ring-ring"
              />
              <span className="sr-only">{color}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Simpan brand
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={pending}>
          Batal
        </Button>
      </div>
    </form>
  );
}

/** Daftar brand milik klien: tambah, ubah, dan hapus (dengan konfirmasi). */
export function BrandManager({ clientId, brands }: { clientId: string; brands: BrandRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="grid gap-3">
      {brands.length === 0 && editing !== "new" && (
        <p className="text-sm text-ink/70">{text.empty}</p>
      )}
      <ul className="grid gap-2">
        {brands.map((brand) =>
          editing === brand.id ? (
            <li key={brand.id}>
              <BrandEditor
                clientId={clientId}
                draft={{ ...brand, instagram: brand.instagram ?? "" }}
                onDone={() => setEditing(null)}
              />
            </li>
          ) : (
            <li
              key={brand.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3"
            >
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: brand.color }}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">{brand.name}</span>
                {brand.instagram && (
                  <span className="block text-sm text-ink/65">{brand.instagram}</span>
                )}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(brand.id)}
                aria-label={`Ubah brand ${brand.name}`}
              >
                <Pencil aria-hidden />
              </Button>
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-danger hover:bg-danger-soft hover:text-danger"
                    aria-label={`Hapus brand ${brand.name}`}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                }
                title={text.removeTitle(brand.name)}
                description={text.removeDescription}
                confirmLabel="Hapus brand"
                onConfirm={async () => {
                  const result = await deleteBrand(clientId, brand.id);
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(workspaceText.clients.toast.brandDeleted);
                  router.refresh();
                }}
              />
            </li>
          ),
        )}
      </ul>
      {editing === "new" ? (
        <BrandEditor
          clientId={clientId}
          draft={{
            id: null,
            name: "",
            color: BRAND_COLORS[brands.length % BRAND_COLORS.length],
            instagram: "",
          }}
          onDone={() => setEditing(null)}
        />
      ) : (
        <Button
          variant="outline"
          onClick={() => setEditing("new")}
          className={cn("w-fit")}
          disabled={editing !== null}
        >
          <Plus aria-hidden />
          {text.add}
        </Button>
      )}
    </div>
  );
}
