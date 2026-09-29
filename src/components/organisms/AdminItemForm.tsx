"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { saveItem, type FormState } from "@/app/(portal)/admin/konten/actions";
import { AdminField } from "@/components/molecules/AdminField";
import { Button } from "@/components/ui/button";
import { CMS_BASE, findCollection } from "@/lib/cms/collections";

type AdminItemFormProps = {
  slug: string;
  /** `null` = item baru. */
  id: string | null;
  row: Record<string, unknown>;
};

/** Form tambah/edit generik, dibentuk dari definisi koleksi. */
export function AdminItemForm({ slug, id, row }: AdminItemFormProps) {
  const collection = findCollection(slug);
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveItem.bind(null, slug, id),
    {},
  );
  if (!collection) return null;

  // Dikirim lewat onSubmit (bukan prop `action`) supaya isian tidak di-reset React saat ada error.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-2xl space-y-7">
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {state.error}
        </p>
      )}
      {collection.fields.map((field) => (
        <AdminField
          key={field.name}
          field={field}
          row={row}
          error={state.fieldErrors?.[field.name]}
        />
      ))}
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
        {!collection.singleton && (
          <Button asChild variant="ghost" size="lg">
            <Link href={`${CMS_BASE}/${slug}`}>Batal</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
