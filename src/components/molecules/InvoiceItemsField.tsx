"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { invoiceText } from "@/content/invoice";
import {
  formatRupiah,
  formatThousands,
  lineTotal,
  parseRupiah,
  type InvoiceItem,
} from "@/lib/invoice";

const text = invoiceText.editor;

type InvoiceItemsFieldProps = {
  items: InvoiceItem[];
  disabled: boolean;
  error?: string;
  onChange: (key: string, patch: Partial<InvoiceItem>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
};

/** Baris item dinamis. Harga diketik bebas; titik ribuan ditambahkan otomatis. */
export function InvoiceItemsField({
  items,
  disabled,
  error,
  onChange,
  onAdd,
  onRemove,
}: InvoiceItemsFieldProps) {
  return (
    <div className="grid gap-3">
      <ol className="grid gap-3">
        {items.map((item, index) => {
          const id = `item-${item.key}`;
          return (
            <li
              key={item.key}
              className="grid gap-3 rounded-xl border border-line bg-canvas/60 p-3 sm:grid-cols-[6rem_minmax(0,1fr)_9rem] sm:items-start"
            >
              <div className="grid gap-1.5 sm:col-span-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${id}-desc`} className="text-sm font-semibold">
                    {index + 1}. {text.fields.description}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled || items.length === 1}
                    onClick={() => onRemove(item.key)}
                    aria-label={text.removeItem(index + 1)}
                    className="text-danger hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
                <Textarea
                  id={`${id}-desc`}
                  rows={2}
                  value={item.description}
                  disabled={disabled}
                  placeholder={text.fields.descriptionPlaceholder}
                  onChange={(event) => onChange(item.key, { description: event.target.value })}
                  className="bg-paper"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-qty`} className="text-sm">
                  {text.fields.qty}
                </Label>
                <Input
                  id={`${id}-qty`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={item.qty}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange(item.key, {
                      qty: Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                    })
                  }
                  className="bg-paper tabular-nums"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-price`} className="text-sm">
                  {text.fields.price}
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink/60">
                    Rp
                  </span>
                  <Input
                    id={`${id}-price`}
                    inputMode="numeric"
                    value={formatThousands(item.unitPrice)}
                    disabled={disabled}
                    placeholder="0"
                    onChange={(event) =>
                      onChange(item.key, { unitPrice: parseRupiah(event.target.value) })
                    }
                    className="bg-paper pl-9 text-right tabular-nums"
                  />
                </div>
              </div>
              <p className="flex items-center justify-between gap-2 text-sm sm:col-start-3 sm:flex-col sm:items-end sm:justify-start">
                <span className="text-ink/70">{text.fields.lineTotal}</span>
                <span className="font-heading font-semibold tabular-nums">
                  {formatRupiah(lineTotal(item))}
                </span>
              </p>
            </li>
          );
        })}
      </ol>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <Button type="button" variant="outline" onClick={onAdd} disabled={disabled} className="w-fit">
        <Plus aria-hidden />
        {text.addItem}
      </Button>
    </div>
  );
}
