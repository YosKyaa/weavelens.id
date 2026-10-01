"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  KeyRound,
  Loader2,
  MoreHorizontal,
  Power,
  ShieldCheck,
  UserCog,
  UserPlus,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  createMember,
  resetMemberPassword,
  setMemberActive,
  updateMember,
} from "@/app/(portal)/admin/team/actions";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Field } from "@/components/molecules/Field";
import { PageHeader } from "@/components/molecules/PageHeader";
import { DataTable } from "@/components/organisms/DataTable";
import { PasswordReveal } from "@/components/organisms/PasswordReveal";
import { TeamRolesManager, type TeamRoleRow } from "@/components/organisms/TeamRolesManager";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { teamText } from "@/content/team";
import { permissionLabel } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const text = teamText;

/** "admin" (akses penuh) atau daftar id peran tim (boleh lebih dari satu, boleh kosong). */
export type Access = "admin" | string[];

export type MemberRow = {
  id: string;
  name: string;
  email: string;
  access: Access;
  /** Nama peran untuk tampilan & filter (["Admin"] untuk admin). */
  roleNames: string[];
  active: boolean;
  projects: string[];
  isSelf: boolean;
};

type Credential = { name: string; email: string; password: string };

function RoleBadges({ member }: { member: Pick<MemberRow, "access" | "roleNames"> }) {
  const isAdmin = member.access === "admin";
  const names = member.roleNames.length ? member.roleNames : [text.baseOnly];
  return (
    <span className="flex flex-wrap gap-1">
      {names.map((name) => (
        <span
          key={name}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-full border px-2.5 font-heading text-xs font-semibold whitespace-nowrap",
            isAdmin
              ? "border-brand/20 bg-brand-soft text-primary"
              : "border-line bg-paper text-ink",
          )}
        >
          {isAdmin ? (
            <ShieldCheck aria-hidden className="size-3.5" />
          ) : (
            <UserRound aria-hidden className="size-3.5" />
          )}
          {name}
        </span>
      ))}
    </span>
  );
}

function sameAccess(a: Access, b: Access): boolean {
  if (a === "admin" || b === "admin") return a === b;
  return a.length === b.length && a.every((id) => b.includes(id));
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        active ? "bg-success-soft text-success" : "bg-placeholder text-ink/75",
      )}
    >
      {active ? text.status.active : text.status.inactive}
    </span>
  );
}

/**
 * Pilihan akses: Admin (akses penuh) ATAU anggota tim dengan satu/lebih peran.
 * Izin beberapa peran digabung; ringkasannya tampil di bawah daftar.
 */
function AccessPicker({
  id,
  value,
  roles,
  onChange,
}: {
  id: string;
  value: Access;
  roles: TeamRoleRow[];
  onChange: (value: Access) => void;
}) {
  const isAdmin = value === "admin";
  const selected = isAdmin ? [] : value;
  const permissions = [
    ...new Set(
      roles.filter((role) => selected.includes(role.id)).flatMap((role) => role.permissions),
    ),
  ];
  const summary = isAdmin
    ? text.roleHints.admin
    : permissions.length
      ? `Proyek yang ditugaskan + ${permissions.map(permissionLabel).join(", ")}.`
      : text.roleHints.team;

  const option = (active: boolean) =>
    cn(
      "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:border-sand-deep has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
      active ? "border-primary bg-brand-soft/40" : "border-line",
    );

  return (
    <fieldset className="grid gap-2" aria-describedby={`${id}-summary`}>
      <legend className="mb-1.5 font-heading text-sm font-semibold text-ink">
        {text.fields.role}
      </legend>
      <label className={option(isAdmin)}>
        <input
          type="radio"
          name={`${id}-kind`}
          checked={isAdmin}
          onChange={() => onChange("admin")}
          className="mt-1 accent-primary"
        />
        <span>
          <span className="block font-medium text-ink">Admin</span>
          <span className="block text-sm text-ink/70">Akses penuh ke semua menu.</span>
        </span>
      </label>
      <label className={option(!isAdmin)}>
        <input
          type="radio"
          name={`${id}-kind`}
          checked={!isAdmin}
          onChange={() => onChange(roles[0] ? [roles[0].id] : [])}
          className="mt-1 accent-primary"
        />
        <span>
          <span className="block font-medium text-ink">Tim WeaveLens</span>
          <span className="block text-sm text-ink/70">{text.pickRoles}</span>
        </span>
      </label>
      {!isAdmin && (
        <ul className="grid gap-1 pl-7">
          {roles.map((role) => {
            const checked = selected.includes(role.id);
            return (
              <li key={role.id}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-canvas">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange(
                        checked
                          ? selected.filter((roleId) => roleId !== role.id)
                          : [...selected, role.id],
                      )
                    }
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">{role.name}</span>
                    {role.description && (
                      <span className="block text-xs text-ink/65">{role.description}</span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <p id={`${id}-summary`} className="rounded-lg bg-canvas px-3 py-2 text-sm text-ink/75">
        {summary}
      </p>
    </fieldset>
  );
}

/** Menu aksi per anggota. Dialog dibuka dari menu (mode terkendali) supaya fokus tetap benar. */
function MemberActions({
  member,
  roles,
  onPassword,
}: {
  member: MemberRow;
  roles: TeamRoleRow[];
  onPassword: (credential: Credential) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"role" | "reset" | "deactivate" | null>(null);
  const [access, setAccess] = useState<Access>(member.access);

  function saveRole() {
    startTransition(async () => {
      const result = await updateMember(member.id, { fullName: member.name, access });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDialog(null);
      toast.success(text.toast.roleChanged);
      router.refresh();
    });
  }

  function activate() {
    startTransition(async () => {
      const result = await setMemberActive(member.id, true);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(text.toast.activated);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={text.actions.menu(member.name)}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <MoreHorizontal aria-hidden />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onSelect={() => {
              setAccess(member.access);
              setDialog("role");
            }}
          >
            <UserCog aria-hidden />
            {text.actions.changeRole}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("reset")}>
            <KeyRound aria-hidden />
            {text.actions.resetPassword}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {member.active ? (
            <DropdownMenuItem
              onSelect={() => setDialog("deactivate")}
              disabled={member.isSelf}
              className="text-danger focus:text-danger"
            >
              <Power aria-hidden />
              {text.actions.deactivate}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={activate}>
              <Power aria-hidden />
              {text.actions.activate}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === "role"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogTitle>{text.actions.changeRoleTitle(member.name)}</DialogTitle>
          <DialogDescription className="text-ink/75">
            {text.actions.changeRoleHint}
          </DialogDescription>
          <AccessPicker
            id={`access-${member.id}`}
            value={access}
            roles={roles}
            onChange={setAccess}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={saveRole} disabled={pending || sameAccess(access, member.access)}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              Simpan peran
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dialog === "reset"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={text.confirm.resetTitle(member.name)}
        description={text.confirm.resetDescription}
        confirmLabel={text.actions.resetPassword}
        tone="primary"
        onConfirm={async () => {
          const result = await resetMemberPassword(member.id);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          setDialog(null);
          onPassword({ name: member.name, email: member.email, password: result.password });
        }}
      />
      <ConfirmDialog
        open={dialog === "deactivate"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={text.confirm.deactivateTitle(member.name)}
        description={text.confirm.deactivateDescription}
        confirmLabel={text.actions.deactivate}
        onConfirm={async () => {
          const result = await setMemberActive(member.id, false);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          setDialog(null);
          toast.success(text.toast.deactivated);
          router.refresh();
        }}
      />
    </>
  );
}

function CreateMember({
  roles,
  onPassword,
}: {
  roles: TeamRoleRow[];
  onPassword: (credential: Credential) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initial: { fullName: string; email: string; access: Access } = {
    fullName: "",
    email: "",
    access: roles[0] ? [roles[0].id] : "admin",
  };
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createMember(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(text.toast.created);
      setOpen(false);
      onPassword({ name: values.fullName, email: values.email, password: result.password });
      setValues(initial);
      setError(undefined);
      router.refresh();
    });
  }

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <UserPlus aria-hidden />
        {text.add}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogTitle>{text.add}</DialogTitle>
          <DialogDescription className="text-ink/75">{text.addDescription}</DialogDescription>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              submit();
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
            <Field id="member-name" label={text.fields.fullName} required>
              <Input
                id="member-name"
                value={values.fullName}
                autoFocus
                onChange={(event) => setValues({ ...values, fullName: event.target.value })}
              />
            </Field>
            <Field id="member-email" label={text.fields.email} required>
              <Input
                id="member-email"
                type="email"
                autoComplete="off"
                value={values.email}
                onChange={(event) => setValues({ ...values, email: event.target.value })}
              />
            </Field>
            <AccessPicker
              id="member-access"
              value={values.access}
              roles={roles}
              onChange={(access) => setValues({ ...values, access })}
            />
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {text.add}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Halaman Tim & akses: anggota (tabel) + peran tim (kartu izin) + dialog password sekali tampil. */
/** Teks kolom proyek: admin & peran ber-izin "semua proyek" tidak perlu ditugaskan. */
function projectsLabel(member: MemberRow, roles: TeamRoleRow[]): string | null {
  if (member.access === "admin") return "Semua proyek";
  const access = member.access;
  const seesAll = roles.some(
    (role) => access.includes(role.id) && role.permissions.includes("projects.all"),
  );
  if (seesAll) return "Semua proyek";
  return member.projects.length ? null : text.assign.none;
}

export function TeamManager({ members, roles }: { members: MemberRow[]; roles: TeamRoleRow[] }) {
  const [credential, setCredential] = useState<Credential | null>(null);

  const columns: ColumnDef<MemberRow, unknown>[] = [
    {
      accessorKey: "name",
      header: text.columns.member,
      cell: ({ row }) => (
        <span className="block min-w-0">
          <span className="block font-medium text-ink">
            {row.original.name}
            {row.original.isSelf && (
              <span className="ml-1.5 text-xs font-normal text-ink/60">({text.you})</span>
            )}
          </span>
          <span className="block text-sm text-ink/65">{row.original.email}</span>
        </span>
      ),
    },
    {
      id: "roles",
      accessorFn: (row) => row.roleNames.join(", "),
      header: text.columns.role,
      // Satu anggota bisa punya beberapa peran: cocok jika salah satunya sama.
      filterFn: (row, _columnId, value: string) => row.original.roleNames.includes(value),
      cell: ({ row }) => <RoleBadges member={row.original} />,
    },
    {
      id: "projects",
      accessorFn: (row) => row.projects.join(", "),
      header: text.columns.projects,
      cell: ({ row }) => {
        const label = projectsLabel(row.original, roles);
        return label ? (
          <span className="text-sm text-ink/65">{label}</span>
        ) : (
          <span className="line-clamp-2 text-sm">{row.original.projects.join(" · ")}</span>
        );
      },
    },
    {
      accessorKey: "active",
      header: text.columns.status,
      enableGlobalFilter: false,
      cell: ({ row }) => <StatusBadge active={row.original.active} />,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Aksi</span>,
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => (
        <MemberActions member={row.original} roles={roles} onPassword={setCredential} />
      ),
    },
  ];

  return (
    <div className="grid gap-10">
      <div className="grid gap-4">
        <PageHeader
          title={text.title}
          description={text.description}
          actions={<CreateMember roles={roles} onPassword={setCredential} />}
        />
        <DataTable
          columns={columns}
          data={members}
          getRowId={(row) => row.id}
          searchPlaceholder={text.search}
          filter={{
            columnId: "roles",
            label: text.columns.role,
            options: [
              { value: "Admin", label: "Admin" },
              ...roles.map((role) => ({ value: role.name, label: role.name })),
            ],
          }}
          emptyMessage={text.empty}
          renderCard={(member) => (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-paper p-4">
              <div className="grid min-w-0 gap-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{member.name}</span>
                  <span className="block truncate text-sm text-ink/65">{member.email}</span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  <RoleBadges member={member} />
                  <StatusBadge active={member.active} />
                </span>
                {member.access !== "admin" && (
                  <span className="text-sm text-ink/70">
                    {projectsLabel(member, roles) ?? member.projects.join(" · ")}
                  </span>
                )}
              </div>
              <MemberActions member={member} roles={roles} onPassword={setCredential} />
            </div>
          )}
        />
      </div>

      <TeamRolesManager roles={roles} />
      <PasswordReveal credential={credential} onClose={() => setCredential(null)} />
    </div>
  );
}
