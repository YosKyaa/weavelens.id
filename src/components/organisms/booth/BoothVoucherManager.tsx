"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  saveBoothVoucher,
  setBoothVoucherActive,
  type VoucherInput,
} from "@/app/(portal)/admin/booth/actions";
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
import { formatRupiah } from "@/lib/booth/profile";
import { formatDate } from "@/lib/format";
import { CheckList, NumberField, SelectField, SwitchRow } from "./BoothFields";

export type BoothVoucherView = {
  code: string;
  kind: "rupiah" | "percent" | "free";
  value: number;
  packageIds: string[];
  maxUses: number;
  used: number;
  validUntil: string | null;
  active: boolean;
};

const KINDS = [
  { value: "rupiah" as const, label: "Potongan rupiah" },
  { value: "percent" as const, label: "Potongan persen" },
  { value: "free" as const, label: "Gratis" },
];

function describe(voucher: BoothVoucherView): string {
  if (voucher.kind === "free") return "Gratis";
  if (voucher.kind === "percent") return `${voucher.value}%`;
  return formatRupiah(voucher.value);
}

/** Voucher booth: tabel yang sama dengan Admin > Voucher di tablet. Kuota hanya naik saat pembayaran lunas. */
export function BoothVoucherManager(props: {
  vouchers: BoothVoucherView[];
  packages: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<BoothVoucherView | "new" | null>(null);
  const [, startTransition] = useTransition();

  function toggle(voucher: BoothVoucherView, active: boolean) {
    startTransition(async () => {
      const result = await setBoothVoucherActive(voucher.code, active);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(`${voucher.code} ${active ? "diaktifkan" : "dinonaktifkan"}.`);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-4">
      <div>
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden />
          Buat voucher
        </Button>
      </div>
      {props.vouchers.length === 0 ? (
        <EmptyState message="Belum ada voucher. Contoh: WISUDA10 potongan Rp 5.000, atau PANITIA gratis untuk panitia acara." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Potongan</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Terpakai</TableHead>
                <TableHead>Berlaku sampai</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead className="sr-only">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.vouchers.map((voucher) => (
                <TableRow key={voucher.code}>
                  <TableCell className="font-mono font-semibold">{voucher.code}</TableCell>
                  <TableCell>{describe(voucher)}</TableCell>
                  <TableCell className="max-w-56 truncate">
                    {voucher.packageIds.length === 0
                      ? "Semua paket"
                      : voucher.packageIds
                          .map((id) => props.packages.find((pkg) => pkg.id === id)?.label ?? id)
                          .join(", ")}
                  </TableCell>
                  <TableCell>
                    {voucher.used}
                    {voucher.maxUses > 0 ? ` / ${voucher.maxUses}` : ""}
                  </TableCell>
                  <TableCell>{voucher.validUntil ? formatDate(voucher.validUntil) : "Tanpa batas"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={voucher.active}
                      aria-label={`Aktifkan ${voucher.code}`}
                      onCheckedChange={(active) => toggle(voucher, active)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(voucher)}>
                      <Pencil aria-hidden />
                      Ubah
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {editing && (
        <VoucherForm
          key={editing === "new" ? "new" : editing.code}
          initial={editing === "new" ? null : editing}
          packages={props.packages}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function VoucherForm(props: {
  initial: BoothVoucherView | null;
  packages: { id: string; label: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState<VoucherInput>(
    props.initial
      ? {
          code: props.initial.code,
          kind: props.initial.kind,
          value: props.initial.value,
          packageIds: props.initial.packageIds,
          maxUses: props.initial.maxUses,
          validUntil: props.initial.validUntil,
          active: props.initial.active,
        }
      : { code: "", kind: "rupiah", value: 5000, packageIds: [], maxUses: 0, validUntil: null, active: true },
  );
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof VoucherInput>(key: K) => (next: VoucherInput[K]) =>
    setValue((current) => ({ ...current, [key]: next }));

  function submit() {
    startTransition(async () => {
      const result = await saveBoothVoucher(value, props.initial === null);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Voucher tersimpan. Langsung berlaku di semua booth yang online.");
      props.onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogTitle>{props.initial ? `Ubah ${props.initial.code}` : "Voucher baru"}</DialogTitle>
        <DialogDescription>
          Kuota terhitung saat pembayaran lunas, bukan saat kode diketik. Potongan dihitung ulang server saat QR dibuat.
        </DialogDescription>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field id="voucher-code" label="Kode" required hint="4–12 huruf besar atau angka" error={error}>
            <Input
              id="voucher-code"
              value={value.code}
              disabled={props.initial !== null}
              placeholder="WISUDA10"
              className="font-mono uppercase"
              onChange={(event) => set("code")(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField id="voucher-kind" label="Jenis" value={value.kind} options={KINDS} onChange={set("kind")} />
            {value.kind !== "free" && (
              <NumberField
                id="voucher-value"
                label={value.kind === "percent" ? "Potongan (%)" : "Potongan (Rp)"}
                value={value.value}
                min={1}
                max={value.kind === "percent" ? 100 : undefined}
                step={value.kind === "percent" ? 1 : 1000}
                onChange={set("value")}
              />
            )}
            <NumberField
              id="voucher-max"
              label="Batas pemakaian"
              value={value.maxUses}
              min={0}
              hint="0 = tanpa batas"
              onChange={set("maxUses")}
            />
            <Field id="voucher-until" label="Berlaku sampai (WIB)" hint="Kosong = tanpa batas">
              <Input
                id="voucher-until"
                type="date"
                value={value.validUntil ?? ""}
                onChange={(event) => set("validUntil")(event.target.value || null)}
              />
            </Field>
          </div>
          {props.packages.length > 0 && (
            <CheckList
              legend="Hanya untuk paket (kosong = semua paket)"
              options={props.packages.map((pkg) => ({ value: pkg.id, label: pkg.label }))}
              value={value.packageIds}
              onChange={set("packageIds")}
            />
          )}
          <SwitchRow id="voucher-active" label="Aktif" checked={value.active} onChange={set("active")} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={props.onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 aria-hidden className="animate-spin" />}
              Simpan voucher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
