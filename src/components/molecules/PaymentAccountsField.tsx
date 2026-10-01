"use client";

import { Plus, Trash2 } from "lucide-react";
import { selectClass } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PAYMENT_GROUPS,
  PAYMENT_METHODS,
  methodInfo,
  numberLabel,
  type PaymentAccount,
  type PaymentMethodValue,
} from "@/lib/payment";

type PaymentAccountsFieldProps = {
  idPrefix: string;
  accounts: PaymentAccount[];
  onChange: (accounts: PaymentAccount[]) => void;
  disabled?: boolean;
};

/** Daftar metode pembayaran: pilih metode dari dropdown, lalu isi nomor & atas nama. */
export function PaymentAccountsField({
  idPrefix,
  accounts,
  onChange,
  disabled,
}: PaymentAccountsFieldProps) {
  function update(index: number, patch: Partial<PaymentAccount>) {
    onChange(accounts.map((account, i) => (i === index ? { ...account, ...patch } : account)));
  }

  return (
    <div className="grid gap-3">
      {accounts.length === 0 && (
        <p className="text-sm text-ink/65">Belum ada metode pembayaran. Tambahkan minimal satu.</p>
      )}
      <ol className="grid gap-3">
        {accounts.map((account, index) => {
          const id = `${idPrefix}-${index}`;
          const label = numberLabel(account.method);
          const isOtherBank = account.method === "bank_other";
          return (
            <li
              key={index}
              className="relative grid gap-3 rounded-xl border border-line bg-canvas/60 p-3 pr-12 sm:grid-cols-2"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                onClick={() => onChange(accounts.filter((_, i) => i !== index))}
                aria-label={`Hapus metode ${index + 1}`}
                className="absolute top-2 right-2 text-danger hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 aria-hidden />
              </Button>
              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-method`} className="text-sm font-semibold">
                  Metode {accounts.length > 1 ? index + 1 : ""}
                </Label>
                <select
                  id={`${id}-method`}
                  value={account.method}
                  disabled={disabled}
                  onChange={(event) =>
                    update(index, { method: event.target.value as PaymentMethodValue })
                  }
                  className={`${selectClass} bg-paper`}
                >
                  {PAYMENT_GROUPS.map((group) => (
                    <optgroup key={group.kind} label={group.label}>
                      {PAYMENT_METHODS.filter((method) => method.kind === group.kind).map(
                        (method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ),
                      )}
                    </optgroup>
                  ))}
                </select>
              </div>

              {isOtherBank && (
                <div className="grid gap-1.5">
                  <Label htmlFor={`${id}-bank`} className="text-sm">
                    Nama bank
                  </Label>
                  <Input
                    id={`${id}-bank`}
                    value={account.bankName ?? ""}
                    disabled={disabled}
                    placeholder="Mis. Bank DKI"
                    onChange={(event) => update(index, { bankName: event.target.value })}
                    className="bg-paper"
                  />
                </div>
              )}

              {label && (
                <div className="grid gap-1.5">
                  <Label htmlFor={`${id}-number`} className="text-sm">
                    {label}
                  </Label>
                  <Input
                    id={`${id}-number`}
                    inputMode="numeric"
                    value={account.number}
                    disabled={disabled}
                    placeholder={
                      methodInfo(account.method).kind === "ewallet" ? "0812…" : "1234567890"
                    }
                    onChange={(event) => update(index, { number: event.target.value })}
                    className="bg-paper tabular-nums"
                  />
                </div>
              )}

              {methodInfo(account.method).kind !== "cash" && (
                <div className="grid gap-1.5">
                  <Label htmlFor={`${id}-holder`} className="text-sm">
                    Atas nama
                  </Label>
                  <Input
                    id={`${id}-holder`}
                    value={account.holder}
                    disabled={disabled}
                    placeholder="Mis. WeaveLens"
                    onChange={(event) => update(index, { holder: event.target.value })}
                    className="bg-paper"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...accounts,
            { method: accounts.length ? "qris" : "bca", number: "", holder: "" },
          ])
        }
        className="w-fit"
      >
        <Plus aria-hidden />
        Tambah metode pembayaran
      </Button>
    </div>
  );
}
