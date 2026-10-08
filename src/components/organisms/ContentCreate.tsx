"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { saveContent } from "@/app/(portal)/admin/projects/actions";
import { Field, selectClass } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { statuses } from "@/content/portal";
import {
  FORMATS,
  formatLabels,
  workspaceText,
  type ContentFormat,
  type Stage,
} from "@/content/workspace";

const text = workspaceText.content;

type ContentCreateProps = {
  projectId: string;
  brands: { id: string; name: string }[];
  /** Pilihan penanggung jawab (opsional). */
  people?: { id: string; name: string }[];
  stage: Stage;
  /** Versi ikon kecil di kepala kolom kanban. */
  compact?: boolean;
};

/** Tambah kartu konten cepat: judul, brand, format, tenggat. Detail lain diisi di halaman konten. */
export function ContentCreate({
  projectId,
  brands,
  people = [],
  stage,
  compact,
}: ContentCreateProps) {
  const [assigneeId, setAssigneeId] = useState("");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [brandId, setBrandId] = useState<string>(brands[0]?.id ?? "");
  const [format, setFormat] = useState<ContentFormat>("feed");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await saveContent(projectId, null, {
        title,
        brandId: brandId || null,
        format,
        stage,
        dueDate,
        publishDate: "",
        brief: "",
        caption: "",
        assigneeId: assigneeId || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(text.created);
      setTitle("");
      setDueDate("");
      setError(undefined);
      setOpen(false);
      router.refresh();
    });
  }

  const label = workspaceText.board.addIn(statuses.stage[stage].label);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="icon-sm" aria-label={label}>
            <Plus aria-hidden />
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden />
            {workspaceText.board.add}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{text.newTitle}</DialogTitle>
        <DialogDescription className="text-ink/75">
          Masuk ke kolom “{statuses.stage[stage].label}”. Brief, caption, dan desain bisa
          ditambahkan setelahnya.
        </DialogDescription>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="grid gap-4"
        >
          <Field id={`new-title-${stage}`} label={text.fields.title} required error={error}>
            <Input
              id={`new-title-${stage}`}
              value={title}
              autoFocus
              placeholder={text.fields.titlePlaceholder}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {brands.length > 0 && (
              <Field id={`new-brand-${stage}`} label={text.fields.brand}>
                <select
                  id={`new-brand-${stage}`}
                  value={brandId}
                  onChange={(event) => setBrandId(event.target.value)}
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
            {people.length > 0 && (
              <Field id={`new-assignee-${stage}`} label="Penanggung jawab">
                <select
                  id={`new-assignee-${stage}`}
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
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
            <Field id={`new-format-${stage}`} label={text.fields.format}>
              <select
                id={`new-format-${stage}`}
                value={format}
                onChange={(event) => setFormat(event.target.value as ContentFormat)}
                className={selectClass}
              >
                {FORMATS.map((item) => (
                  <option key={item} value={item}>
                    {formatLabels[item]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field id={`new-due-${stage}`} label={text.fields.dueDate}>
            <Input
              id={`new-due-${stage}`}
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {workspaceText.board.add}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
