"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { registerBoothDevice, updateBoothDevice } from "@/app/(portal)/admin/booth/actions";
import { EmptyState } from "@/components/atoms/EmptyState";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type BoothDeviceView = {
  id: string;
  name: string;
  active: boolean;
  manageVouchers: boolean;
  lastSeen: string | null;
  appVersion: string | null;
};

const dateTime = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

/** Tablet booth yang boleh menulis ke Supabase lewat Edge Function (token perangkat). */
export function BoothDeviceManager({ devices }: { devices: BoothDeviceView[] }) {
  const router = useRouter();
  const [registering, setRegistering] = useState(false);
  const [, startTransition] = useTransition();

  function update(device: BoothDeviceView, flags: { active?: boolean; manageVouchers?: boolean }, message: string) {
    startTransition(async () => {
      const result = await updateBoothDevice(device.id, flags);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(message);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-4">
      <div>
        <Button onClick={() => setRegistering(true)}>
          <Plus aria-hidden />
          Daftarkan tablet
        </Button>
      </div>
      {devices.length === 0 ? (
        <EmptyState message="Belum ada tablet terdaftar. Daftarkan tablet, lalu ketik tokennya di tablet: Admin > Sistem > Token perangkat." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tablet</TableHead>
                <TableHead>Terakhir terhubung</TableHead>
                <TableHead>Versi app</TableHead>
                <TableHead>Akses</TableHead>
                <TableHead>Kelola voucher</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-semibold">{device.name}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {device.lastSeen ? dateTime.format(new Date(device.lastSeen)) : "Belum pernah"}
                  </TableCell>
                  <TableCell>{device.appVersion ?? "—"}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <Switch
                        checked={device.active}
                        aria-label={`Akses ${device.name}`}
                        onCheckedChange={(active) =>
                          update(
                            device,
                            { active },
                            active ? `${device.name} diaktifkan lagi.` : `Akses ${device.name} dicabut.`,
                          )
                        }
                      />
                      <span className="text-sm text-ink/75">{device.active ? "Aktif" : "Dicabut"}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={device.manageVouchers}
                      aria-label={`${device.name} boleh mengelola voucher`}
                      onCheckedChange={(manageVouchers) =>
                        update(
                          device,
                          { manageVouchers },
                          manageVouchers
                            ? `${device.name} boleh membuat dan mengubah voucher.`
                            : `${device.name} hanya bisa memakai voucher.`,
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {registering && <RegisterDialog onClose={() => setRegistering(false)} />}
    </div>
  );
}

function RegisterDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await registerBoothDevice(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setToken(result.token);
      router.refresh();
    });
  }

  async function copy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Token disalin.");
    } catch {
      toast.error("Tidak bisa menyalin otomatis. Salin manual dari kotak token.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>{token ? "Token perangkat" : "Daftarkan tablet"}</DialogTitle>
        <DialogDescription>
          {token
            ? "Token hanya tampil sekali. Ketik di tablet: Admin > Sistem > Token perangkat, lalu Simpan."
            : "Setiap tablet punya token sendiri, sehingga aksesnya bisa dicabut satu per satu."}
        </DialogDescription>
        {token ? (
          <div className="grid gap-3">
            <code className="rounded-lg border border-line bg-sand px-3 py-3 font-mono text-sm break-all">{token}</code>
            <DialogFooter>
              <Button variant="outline" onClick={copy}>
                <Copy aria-hidden />
                Salin token
              </Button>
              <Button onClick={onClose}>Selesai</Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            noValidate
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <Field id="device-name" label="Nama tablet" required error={error}>
              <Input
                id="device-name"
                value={name}
                placeholder="Booth 1"
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 aria-hidden className="animate-spin" />}
                Buat token
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
