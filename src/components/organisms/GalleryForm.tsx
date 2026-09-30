"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { saveGallery, type GalleryInput } from "@/app/(portal)/admin/galleries/actions";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { workspaceText } from "@/content/workspace";

const text = workspaceText.galleries;

type GalleryFormProps = {
  projectId: string;
  galleryId: string | null;
  initial: GalleryInput;
  serviceAccount: string | null;
  onCreated?: () => void;
};

export function GalleryForm({
  projectId,
  galleryId,
  initial,
  serviceAccount,
  onCreated,
}: GalleryFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(values) !== saved;
  const set = (key: keyof GalleryInput) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  function submit() {
    startTransition(async () => {
      const result = await saveGallery(projectId, galleryId, values);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setError(undefined);
      setSaved(JSON.stringify(values));
      if (galleryId) {
        toast.success(text.toast.saved);
        router.refresh();
      } else {
        toast.success(text.toast.created);
        onCreated?.();
        router.push(`/admin/galleries/${result.id}`);
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
      <Field id="gallery-title" label={text.fields.title} required error={error}>
        <Input
          id="gallery-title"
          value={values.title}
          placeholder={text.fields.titlePlaceholder}
          onChange={set("title")}
        />
      </Field>
      <Field
        id="gallery-folder"
        label={text.fields.driveFolder}
        hint={
          serviceAccount
            ? `${text.fields.driveFolderHint} Email: ${serviceAccount}`
            : text.driveMissing
        }
      >
        <Input
          id="gallery-folder"
          type="url"
          value={values.driveFolder}
          placeholder="https://drive.google.com/drive/folders/…"
          onChange={set("driveFolder")}
          aria-describedby="gallery-folder-hint"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="gallery-max"
          label={text.fields.maxSelection}
          hint={text.fields.maxSelectionHint}
        >
          <Input
            id="gallery-max"
            inputMode="numeric"
            value={values.maxSelection}
            placeholder="50"
            onChange={set("maxSelection")}
            aria-describedby="gallery-max-hint"
          />
        </Field>
        <Field id="gallery-deadline" label={text.fields.deadline}>
          <Input
            id="gallery-deadline"
            type="date"
            value={values.deadline}
            onChange={set("deadline")}
          />
        </Field>
      </div>
      <div>
        <Button type="submit" disabled={pending || (!dirty && Boolean(galleryId))}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          {galleryId ? "Simpan pengaturan" : text.create}
        </Button>
      </div>
    </form>
  );
}
