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
import { PageHeader } from "@/components/molecules/PageHeader";
import { Field, selectClass } from "@/components/molecules/Field";
import { DataTable } from "@/components/organisms/DataTable";
import { PasswordReveal } from "@/components/organisms/PasswordReveal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { teamText } from "@/content/team";
import { cn } from "@/lib/utils";

const text = teamText;

export type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "team";
  active: boolean;
  projects: string[];
  isSelf: boolean;
};

type Credential = { name: string; email: string; password: string };

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2.5 font-heading text-xs font-semibold whitespace-nowrap",
        role === "admin"
          ? "border-brand/20 bg-brand-soft text-primary"
          : "border-line bg-paper text-ink",
      )}
    >
      {role === "admin" ? (
        <ShieldCheck aria-hidden className="size-3.5" />
      ) : (
        <UserRound aria-hidden className="size-3.5" />
      )}
      {text.roles[role]}
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

/** Menu aksi per anggota: ubah peran, password sementara, nonaktifkan. Konfirmasi untuk aksi berisiko. */
function MemberActions({
  member,
  onPassword,
}: {
  member: MemberRow;
  onPassword: (c: Credential) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<"reset" | "deactivate" | null>(null);

  function changeRole(role: "admin" | "team") {
    startTransition(async () => {
      const result = await updateMember(member.id, { fullName: member.name, role });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
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
          {member.role === "team" ? (
            <DropdownMenuItem onSelect={() => changeRole("admin")}>
              <ShieldCheck aria-hidden />
              {text.actions.makeAdmin}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => changeRole("team")} disabled={member.isSelf}>
              <UserRound aria-hidden />
              {text.actions.makeTeam}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setConfirm("reset")}>
            <KeyRound aria-hidden />
            {text.actions.resetPassword}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {member.active ? (
            <DropdownMenuItem
              onSelect={() => setConfirm("deactivate")}
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

      {/* Dialog konfirmasi dibuka dari menu (bukan di dalamnya) supaya fokus keyboard tetap benar. */}
      <ConfirmDialog
        open={confirm === "reset"}
        onOpenChange={(open) => !open && setConfirm(null)}
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
          setConfirm(null);
          onPassword({ name: member.name, email: member.email, password: result.password });
        }}
      />
      <ConfirmDialog
        open={confirm === "deactivate"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={text.confirm.deactivateTitle(member.name)}
        description={text.confirm.deactivateDescription}
        confirmLabel={text.actions.deactivate}
        tone="danger"
        onConfirm={async () => {
          const result = await setMemberActive(member.id, false);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          setConfirm(null);
          toast.success(text.toast.deactivated);
          router.refresh();
        }}
      />
    </>
  );
}

function CreateMember({ onPassword }: { onPassword: (c: Credential) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({
    fullName: "",
    email: "",
    role: "team" as "admin" | "team",
  });
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
      setValues({ fullName: "", email: "", role: "team" });
      setError(undefined);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <UserPlus aria-hidden />
          {text.add}
        </Button>
      </DialogTrigger>
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
          <Field id="member-role" label={text.fields.role} hint={text.roleHints[values.role]}>
            <select
              id="member-role"
              value={values.role}
              onChange={(event) =>
                setValues({ ...values, role: event.target.value as "admin" | "team" })
              }
              className={selectClass}
              aria-describedby="member-role-hint"
            >
              <option value="team">{text.roles.team}</option>
              <option value="admin">{text.roles.admin}</option>
            </select>
          </Field>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {text.add}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Halaman tim: judul + tombol tambah, tabel anggota, dan dialog password sekali tampil. */
export function TeamManager({ members }: { members: MemberRow[] }) {
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
      accessorKey: "role",
      header: text.columns.role,
      enableGlobalFilter: false,
      filterFn: "equalsString",
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      id: "projects",
      accessorFn: (row) => row.projects.join(", "),
      header: text.columns.projects,
      cell: ({ row }) =>
        row.original.role === "admin" ? (
          <span className="text-sm text-ink/65">Semua proyek</span>
        ) : row.original.projects.length ? (
          <span className="line-clamp-2 text-sm">{row.original.projects.join(" · ")}</span>
        ) : (
          <span className="text-sm text-ink/60">{text.assign.none}</span>
        ),
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
      cell: ({ row }) => <MemberActions member={row.original} onPassword={setCredential} />,
    },
  ];

  return (
    <div className="grid gap-4">
      <PageHeader
        title={text.title}
        description={text.description}
        actions={<CreateMember onPassword={setCredential} />}
      />
      <DataTable
        columns={columns}
        data={members}
        getRowId={(row) => row.id}
        searchPlaceholder={text.search}
        filter={{
          columnId: "role",
          label: text.columns.role,
          options: [
            { value: "admin", label: text.roles.admin },
            { value: "team", label: text.roles.team },
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
                <RoleBadge role={member.role} />
                <StatusBadge active={member.active} />
              </span>
              {member.role === "team" && (
                <span className="text-sm text-ink/70">
                  {member.projects.length ? member.projects.join(" · ") : text.assign.none}
                </span>
              )}
            </div>
            <MemberActions member={member} onPassword={setCredential} />
          </div>
        )}
      />
      <PasswordReveal credential={credential} onClose={() => setCredential(null)} />
    </div>
  );
}
