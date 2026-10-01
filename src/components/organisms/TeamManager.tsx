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
import { Field, selectClass } from "@/components/molecules/Field";
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

export type MemberRow = {
  id: string;
  name: string;
  email: string;
  /** "admin" atau id peran tim. */
  access: string;
  roleName: string;
  active: boolean;
  projects: string[];
  isSelf: boolean;
};

type Credential = { name: string; email: string; password: string };

function RoleBadge({ member }: { member: Pick<MemberRow, "access" | "roleName"> }) {
  const isAdmin = member.access === "admin";
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2.5 font-heading text-xs font-semibold whitespace-nowrap",
        isAdmin ? "border-brand/20 bg-brand-soft text-primary" : "border-line bg-paper text-ink",
      )}
    >
      {isAdmin ? (
        <ShieldCheck aria-hidden className="size-3.5" />
      ) : (
        <UserRound aria-hidden className="size-3.5" />
      )}
      {member.roleName}
    </span>
  );
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

/** Pilihan peran: semua peran tim + Admin, dengan ringkasan izin peran terpilih. */
function AccessSelect({
  id,
  value,
  roles,
  onChange,
}: {
  id: string;
  value: string;
  roles: TeamRoleRow[];
  onChange: (value: string) => void;
}) {
  const role = roles.find((item) => item.id === value);
  const hint =
    value === "admin"
      ? text.roleHints.admin
      : role
        ? role.permissions.length
          ? `Proyek yang ditugaskan + ${role.permissions.map(permissionLabel).join(", ")}.`
          : text.roleHints.team
        : undefined;

  return (
    <Field id={id} label={text.fields.role} hint={hint}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
        aria-describedby={hint ? `${id}-hint` : undefined}
      >
        {roles.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
        <option value="admin">Admin (akses penuh)</option>
      </select>
    </Field>
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
  const [access, setAccess] = useState(member.access);

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
        <DialogContent className="sm:max-w-md">
          <DialogTitle>{text.actions.changeRoleTitle(member.name)}</DialogTitle>
          <DialogDescription className="text-ink/75">
            {text.actions.changeRoleHint}
          </DialogDescription>
          <AccessSelect
            id={`access-${member.id}`}
            value={access}
            roles={roles}
            onChange={setAccess}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={saveRole} disabled={pending || access === member.access}>
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
  const initial = { fullName: "", email: "", access: roles[0]?.id ?? "admin" };
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
        <DialogContent className="sm:max-w-md">
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
            <AccessSelect
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
  const role = roles.find((item) => item.id === member.access);
  if (role?.permissions.includes("projects.all")) return "Semua proyek";
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
      accessorKey: "roleName",
      header: text.columns.role,
      filterFn: "equalsString",
      cell: ({ row }) => <RoleBadge member={row.original} />,
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
            columnId: "roleName",
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
                  <RoleBadge member={member} />
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
