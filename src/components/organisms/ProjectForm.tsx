"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Clapperboard, Images, Loader2, Palette, Save } from "lucide-react";
import { toast } from "sonner";
import { saveProject, type ProjectInput } from "@/app/(portal)/admin/projects/actions";
import { Field, selectClass } from "@/components/molecules/Field";
import { MemberPicker, type TeamOption } from "@/components/organisms/ProjectMembersForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { projectTypes, statuses } from "@/content/portal";
import { PROJECT_TYPES, workspaceText } from "@/content/workspace";
import { cn } from "@/lib/utils";

const text = workspaceText.projects;

const typeIcons = { design: Palette, photo: Camera, video: Clapperboard, mixed: Images };
const typeHints: Record<string, string> = {
  design: "Feed, carousel, story, Reels, desain. Ada papan konten & review klien.",
  photo: "Wisuda, acara kantor. Klien memilih foto mentah untuk diedit.",
  video: "Liputan video. Klien memilih klip atau menerima hasil edit.",
  mixed: "Dokumentasi foto & video sekaligus.",
};

type ProjectFormProps = {
  projectId: string | null;
  initial: ProjectInput;
  clients: { id: string; name: string }[];
  /** Diisi saat membuat proyek: pilih tim yang langsung ditugaskan. */
  teamOptions?: TeamOption[];
};

export function ProjectForm({ projectId, initial, clients, teamOptions }: ProjectFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(values) !== saved;

  function update(patch: Partial<ProjectInput>) {
    setValues((current) => ({ ...current, ...patch }));
  }

  function submit() {
    startTransition(async () => {
      const result = await saveProject(projectId, values);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setError(undefined);
      setSaved(JSON.stringify(values));
      if (projectId) {
        toast.success(text.toast.saved);
        router.refresh();
      } else {
        toast.success(text.toast.created);
        router.push(`/admin/projects/${result.id}`);
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
      className="grid gap-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="project-client" label={text.fields.client} required>
          <select
            id="project-client"
            value={values.clientId}
            onChange={(event) => update({ clientId: event.target.value })}
            className={selectClass}
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="project-title" label={text.fields.title} required error={error}>
          <Input
            id="project-title"
            value={values.title}
            placeholder={text.fields.titlePlaceholder}
            onChange={(event) => update({ title: event.target.value })}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 font-heading text-sm font-semibold text-ink">
          {text.fields.type}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PROJECT_TYPES.map((type) => {
            const Icon = typeIcons[type];
            const checked = values.type === type;
            return (
              <label
                key={type}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border border-line bg-paper p-3 transition-colors hover:border-sand-deep",
                  checked && "border-primary ring-1 ring-primary",
                )}
              >
                <input
                  type="radio"
                  name="project-type"
                  value={type}
                  checked={checked}
                  onChange={() => update({ type })}
                  className="sr-only"
                />
                <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                <span>
                  <span className="block font-heading text-sm font-semibold">
                    {projectTypes[type]}
                  </span>
                  <span className="block text-sm text-ink/70">{typeHints[type]}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="project-date" label={text.fields.eventDate}>
          <Input
            id="project-date"
            type="date"
            value={values.eventDate ?? ""}
            onChange={(event) => update({ eventDate: event.target.value })}
          />
        </Field>
        <Field id="project-status" label={text.fields.status}>
          <select
            id="project-status"
            value={values.status}
            onChange={(event) => update({ status: event.target.value as ProjectInput["status"] })}
            className={selectClass}
          >
            {Object.entries(statuses.project).map(([value, def]) => (
              <option key={value} value={value}>
                {def.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {!projectId && teamOptions && (
        <fieldset>
          <legend className="mb-1 font-heading text-sm font-semibold text-ink">
            Tugaskan ke tim (opsional)
          </legend>
          <p className="mb-3 text-sm text-ink/70">
            Anggota yang dipilih langsung bisa melihat dan mengerjakan proyek ini.
          </p>
          <MemberPicker
            options={teamOptions}
            selected={values.memberIds ?? []}
            onChange={(memberIds) => update({ memberIds })}
          />
        </fieldset>
      )}

      <Field id="project-description" label={text.fields.description}>
        <Textarea
          id="project-description"
          rows={3}
          value={values.description ?? ""}
          onChange={(event) => update({ description: event.target.value })}
        />
      </Field>

      <div>
        <Button type="submit" size="lg" disabled={pending || (!dirty && Boolean(projectId))}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          {projectId ? "Simpan perubahan" : text.create}
        </Button>
      </div>
    </form>
  );
}
