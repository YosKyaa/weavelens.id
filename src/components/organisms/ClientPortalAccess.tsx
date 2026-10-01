"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Power, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { inviteClientUser, setClientUserActive } from "@/app/(portal)/admin/clients/actions";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Field } from "@/components/molecules/Field";
import { ResendAccessDialog } from "@/components/organisms/ResendAccessDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PortalUserRow = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  lastSignIn: string | null;
};

type ClientPortalAccessProps = {
  clientId: string;
  users: PortalUserRow[];
  /** Untuk isian awal undangan & nomor WhatsApp. */
  contact: { name: string; email: string; phone: string | null };
  google: boolean;
};

/**
 * Akun portal untuk PIC klien: undang (tanpa password), kirim cara masuk lewat WhatsApp,
 * nonaktifkan/aktifkan. Klien masuk lewat tab "Klien" (link email atau Google).
 */
export function ClientPortalAccess({ clientId, users, contact, google }: ClientPortalAccessProps) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [values, setValues] = useState({ fullName: contact.name, email: contact.email });
  const [error, setError] = useState<string>();
  const [sendTo, setSendTo] = useState<PortalUserRow | null>(null);
  const [pending, startTransition] = useTransition();
  const invitedContact = users.some((user) => user.email === contact.email.toLowerCase());

  function invite() {
    startTransition(async () => {
      const result = await inviteClientUser(clientId, values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(undefined);
      setInviteOpen(false);
      toast.success("Akun portal dibuat. Kirim cara masuknya lewat WhatsApp.");
      router.refresh();
      setSendTo({
        id: "new",
        name: values.fullName,
        email: values.email.trim().toLowerCase(),
        active: true,
        lastSignIn: null,
      });
    });
  }

  return (
    <div className="grid gap-4">
      {users.length === 0 ? (
        <p className="text-sm text-ink/70">
          Belum ada akun portal. Klien tetap bisa mereview lewat link klien di tiap proyek; akun
          portal berguna kalau PIC ingin melihat semua proyeknya di satu tempat.
        </p>
      ) : (
        <ul className="grid gap-2">
          {users.map((user) => (
            <li
              key={user.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-3",
                !user.active && "opacity-65",
              )}
            >
              <span className="min-w-0">
                <span className="block font-medium text-ink">{user.name}</span>
                <span className="block truncate text-sm text-ink/65">
                  {user.email} ·{" "}
                  {!user.active
                    ? "Nonaktif"
                    : user.lastSignIn
                      ? `Terakhir masuk ${formatDate(user.lastSignIn)}`
                      : "Belum pernah masuk"}
                </span>
              </span>
              <span className="flex flex-wrap gap-2">
                {user.active && (
                  <Button variant="outline" size="sm" onClick={() => setSendTo(user)}>
                    <MessageCircle aria-hidden />
                    Kirim akses
                  </Button>
                )}
                <ConfirmDialog
                  tone={user.active ? "danger" : "primary"}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        user.active && "text-danger hover:bg-danger-soft hover:text-danger",
                      )}
                    >
                      <Power aria-hidden />
                      {user.active ? "Nonaktifkan" : "Aktifkan lagi"}
                    </Button>
                  }
                  title={
                    user.active ? `Nonaktifkan akses ${user.name}?` : `Aktifkan lagi ${user.name}?`
                  }
                  description={
                    user.active
                      ? "Akun tidak bisa masuk portal lagi. Link klien di proyek tetap berfungsi."
                      : "Akun bisa masuk portal lagi dengan email yang sama."
                  }
                  confirmLabel={user.active ? "Nonaktifkan" : "Aktifkan"}
                  onConfirm={async () => {
                    const result = await setClientUserActive(clientId, user.id, !user.active);
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success(user.active ? "Akses dinonaktifkan." : "Akses aktif lagi.");
                    router.refresh();
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      <Button
        variant={users.length ? "outline" : "default"}
        className="w-fit"
        onClick={() => {
          setValues({
            fullName: invitedContact ? "" : contact.name,
            email: invitedContact ? "" : contact.email,
          });
          setError(undefined);
          setInviteOpen(true);
        }}
      >
        <UserPlus aria-hidden />
        Undang ke portal
      </Button>

      <Dialog open={inviteOpen} onOpenChange={(open) => !pending && setInviteOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Undang PIC ke portal</DialogTitle>
          <DialogDescription className="text-ink/75">
            Akun dibuat tanpa password. PIC masuk dengan email ini lewat tab Klien
            {google ? " (tombol Google atau link email)" : " (link email)"}.
          </DialogDescription>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              invite();
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
            <Field id="invite-name" label="Nama PIC" required>
              <Input
                id="invite-name"
                value={values.fullName}
                autoFocus
                onChange={(event) => setValues({ ...values, fullName: event.target.value })}
              />
            </Field>
            <Field
              id="invite-email"
              label="Email"
              required
              hint={
                google ? "Pakai Gmail supaya PIC bisa langsung masuk dengan Google." : undefined
              }
            >
              <Input
                id="invite-email"
                type="email"
                autoComplete="off"
                value={values.email}
                onChange={(event) => setValues({ ...values, email: event.target.value })}
              />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <UserPlus aria-hidden />
              )}
              Buat akun portal
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {sendTo && (
        <ResendAccessDialog
          open
          onOpenChange={(open) => !open && setSendTo(null)}
          member={{ name: sendTo.name, email: sendTo.email, phone: contact.phone }}
          google={google}
          audience="client"
        />
      )}
    </div>
  );
}
