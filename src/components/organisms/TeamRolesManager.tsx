"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { deleteTeamRole, saveTeamRole } from "@/app/(portal)/admin/team/actions";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { teamText } from "@/content/team";
import { PERMISSIONS, permissionLabel, type Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const text = teamText.roles;

export type TeamRoleRow = {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
  members: number;
};

type Draft = { id: string | null; name: string; description: string; permissions: Permission[] };

function RoleEditor({ draft, onClose }: { draft: Draft | null; onClose: () => void }) {
  const router = useRouter();
  const [values, setValues] = useState<Draft | null>(draft);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // Dialog dipakai ulang untuk peran lain: muat ulang isian saat draf berganti.
  const [lastDraft, setLastDraft] = useState(draft);
  if (draft !== lastDraft) {
    setLastDraft(draft);
    setValues(draft);
    setError(undefined);
  }

  function toggle(permission: Permission) {
    if (!values) return;
    setValues({
      ...values,
      permissions: values.permissions.includes(permission)
        ? values.permissions.filter((item) => item !== permission)
        : [...values.permissions, permission],
    });
  }

  function save() {
    if (!values) return;
    startTransition(async () => {
      const result = await saveTeamRole(values.id, values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(text.saved);
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open={values !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>{values?.id ? text.editTitle : text.add}</DialogTitle>
        <DialogDescription className="text-ink/75">{text.editorHint}</DialogDescription>
        {values && (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              save();
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
            <Field id="role-name" label={text.name} required>
              <Input
                id="role-name"
                value={values.name}
                placeholder={text.namePlaceholder}
                autoFocus
                onChange={(event) => setValues({ ...values, name: event.target.value })}
              />
            </Field>
            <Field id="role-description" label={text.descriptionLabel}>
              <Input
                id="role-description"
                value={values.description}
                onChange={(event) => setValues({ ...values, description: event.target.value })}
              />
            </Field>
            <fieldset className="grid gap-2">
              <legend className="mb-1 font-heading text-sm font-semibold text-ink">
                {text.permissions}
              </legend>
              <p className="mb-1 text-sm text-ink/70">{text.base}</p>
              {PERMISSIONS.map((permission) => {
                const checked = values.permissions.includes(permission.key);
                return (
                  <label
                    key={permission.key}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:border-sand-deep",
                      checked && "border-primary bg-brand-soft/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(permission.key)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-line bg-paper peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50",
                        checked && "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {checked && <Check className="size-3.5" />}
                    </span>
                    <span>
                      <span className="block font-medium text-ink">{permission.label}</span>
                      <span className="block text-sm text-ink/70">{permission.description}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <p className="text-xs text-ink/60">{text.adminOnly}</p>
            <div className="sticky -bottom-6 -mx-6 -mb-6 flex justify-end gap-2 border-t border-line bg-background px-6 py-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
                Batal
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" aria-hidden />}
                {text.save}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Kartu peran tim: nama, jumlah anggota, izin. Ubah izin satu peran = berlaku untuk semua anggotanya. */
export function TeamRolesManager({ roles }: { roles: TeamRoleRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);

  return (
    <section aria-labelledby="roles-heading" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="roles-heading" className="text-xl">
            {text.title}
          </h2>
          <p className="mt-1 max-w-[65ch] text-ink/75">{text.description}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setDraft({ id: null, name: "", description: "", permissions: [] })}
          className="w-full sm:w-auto"
        >
          <Plus aria-hidden />
          {text.add}
        </Button>
      </div>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <li className="flex flex-col gap-3 rounded-2xl border border-brand/20 bg-brand-soft/40 p-5">
          <div>
            <p className="font-heading font-semibold text-ink">Admin</p>
            <p className="mt-1 text-sm text-ink/70">{text.adminDescription}</p>
          </div>
          <p className="mt-auto text-xs text-ink/60">{text.adminLocked}</p>
        </li>
        {roles.map((role) => (
          <li
            key={role.id}
            className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-heading font-semibold text-ink">{role.name}</p>
                {role.description && <p className="mt-1 text-sm text-ink/70">{role.description}</p>}
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink/65">
                <Users aria-hidden className="size-3.5" />
                {role.members}
              </span>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              <li className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-ink/80">
                {text.assignedProjects}
              </li>
              {role.permissions.map((permission) => (
                <li
                  key={permission}
                  className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-primary"
                >
                  {permissionLabel(permission)}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setDraft({
                    id: role.id,
                    name: role.name,
                    description: role.description ?? "",
                    permissions: role.permissions,
                  })
                }
              >
                <Pencil aria-hidden />
                {text.edit}
              </Button>
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 aria-hidden />
                    {text.delete}
                  </Button>
                }
                title={text.deleteTitle(role.name)}
                description={text.deleteDescription(role.members)}
                confirmLabel={text.delete}
                onConfirm={async () => {
                  const result = await deleteTeamRole(role.id);
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(text.deleted);
                  router.refresh();
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <RoleEditor draft={draft} onClose={() => setDraft(null)} />
    </section>
  );
}
