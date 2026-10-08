"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteContent,
  saveContent,
  type ContentInput,
} from "@/app/(portal)/admin/projects/actions";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { CaptionAssistant } from "@/components/organisms/CaptionAssistant";
import { Field, selectClass } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { statuses } from "@/content/portal";
import { FORMATS, STAGES, formatLabels, workspaceText } from "@/content/workspace";

const text = workspaceText.content;

type ContentDetailsFormProps = {
  projectId: string;
  contentId: string;
  initial: ContentInput;
  brands: { id: string; name: string }[];
  people?: { id: string; name: string }[];
  /** ANTHROPIC_API_KEY terpasang (asisten caption). */
  aiEnabled?: boolean;
};

export function ContentDetailsForm({
  projectId,
  contentId,
  initial,
  brands,
  people = [],
  aiEnabled = false,
}: ContentDetailsFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(values) !== saved;

  const update = (patch: Partial<ContentInput>) =>
    setValues((current) => ({ ...current, ...patch }));

  function submit() {
    startTransition(async () => {
      const result = await saveContent(projectId, contentId, values);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setError(undefined);
      setSaved(JSON.stringify(values));
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
      <Field id="content-title" label={text.fields.title} required error={error}>
        <Input
          id="content-title"
          value={values.title}
          onChange={(event) => update({ title: event.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {brands.length > 0 && (
          <Field id="content-brand" label={text.fields.brand}>
            <select
              id="content-brand"
              value={values.brandId ?? ""}
              onChange={(event) => update({ brandId: event.target.value || null })}
              className={selectClass}
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
              <option value="">{workspaceText.board.noBrand}</option>
            </select>
          </Field>
        )}
        <Field id="content-format" label={text.fields.format}>
          <select
            id="content-format"
            value={values.format}
            onChange={(event) => update({ format: event.target.value as ContentInput["format"] })}
            className={selectClass}
          >
            {FORMATS.map((format) => (
              <option key={format} value={format}>
                {formatLabels[format]}
              </option>
            ))}
          </select>
        </Field>
        {people.length > 0 && (
          <Field id="content-assignee" label="Penanggung jawab">
            <select
              id="content-assignee"
              value={values.assigneeId ?? ""}
              onChange={(event) => update({ assigneeId: event.target.value || null })}
              className={selectClass}
            >
              <option value="">Belum ditentukan</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field id="content-stage" label={text.fields.stage}>
          <select
            id="content-stage"
            value={values.stage}
            onChange={(event) => update({ stage: event.target.value as ContentInput["stage"] })}
            className={selectClass}
          >
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {statuses.stage[stage].label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="content-due" label={text.fields.dueDate}>
          <Input
            id="content-due"
            type="date"
            value={values.dueDate ?? ""}
            onChange={(event) => update({ dueDate: event.target.value })}
          />
        </Field>
        <Field id="content-publish" label={text.fields.publishDate}>
          <Input
            id="content-publish"
            type="date"
            value={values.publishDate ?? ""}
            onChange={(event) => update({ publishDate: event.target.value })}
          />
        </Field>
      </div>
      <Field id="content-brief" label={text.fields.brief}>
        <Textarea
          id="content-brief"
          rows={3}
          value={values.brief ?? ""}
          onChange={(event) => update({ brief: event.target.value })}
        />
      </Field>
      <Field id="content-caption" label={text.fields.caption}>
        <Textarea
          id="content-caption"
          rows={4}
          value={values.caption ?? ""}
          onChange={(event) => update({ caption: event.target.value })}
        />
      </Field>
      <CaptionAssistant
        projectId={projectId}
        contentId={contentId}
        enabled={aiEnabled}
        input={{
          title: values.title ?? "",
          brief: values.brief ?? "",
          caption: values.caption ?? "",
          format: values.format ?? "",
          brandId: values.brandId ?? initial.brandId ?? null,
        }}
        onPick={(caption) => update({ caption })}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          {text.save}
        </Button>
        <ConfirmDialog
          trigger={
            <Button
              type="button"
              variant="ghost"
              className="text-danger hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 aria-hidden />
              Hapus konten
            </Button>
          }
          title={text.deleteTitle(values.title)}
          description={text.deleteDescription}
          confirmLabel="Hapus permanen"
          onConfirm={async () => {
            const result = await deleteContent(projectId, contentId);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(text.deleted);
            router.replace(`/admin/projects/${projectId}`);
          }}
        />
      </div>
    </form>
  );
}
