"use client";

import { ImageUpload } from "@/components/molecules/ImageUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CmsField } from "@/lib/cms/collections";
import { cn } from "@/lib/utils";

type AdminFieldProps = {
  field: CmsField;
  /** Baris data saat ini (kosong untuk item baru). */
  row: Record<string, unknown>;
  error?: string;
};

const selectClass =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-red-700 md:text-sm";

function asText(value: unknown): string {
  if (Array.isArray(value)) return value.join("\n");
  return value == null ? "" : String(value);
}

/** Satu field form admin: label, kontrol sesuai tipe, petunjuk, dan pesan error. */
export function AdminField({ field, row, error }: AdminFieldProps) {
  const id = `field-${field.name}`;
  const hintId = field.hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const value = asText(row[field.name]);
  const common = {
    id,
    name: field.name,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  };

  let control;
  switch (field.type) {
    case "textarea":
      control = <Textarea {...common} defaultValue={value} rows={field.rows ?? 3} />;
      break;
    case "list":
      control = <Textarea {...common} defaultValue={value} rows={5} />;
      break;
    case "select":
      control = (
        <select {...common} defaultValue={value} className={selectClass}>
          {!field.required && <option value="">—</option>}
          {field.required && !value && (
            <option value="" disabled>
              Pilih…
            </option>
          )}
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
      break;
    case "image":
      control = (
        <ImageUpload
          id={id}
          name={field.name}
          widthName={field.widthName}
          heightName={field.heightName}
          folder={field.folder}
          required={field.required}
          describedBy={describedBy}
          invalid={Boolean(error)}
          initial={
            value
              ? {
                  src: value,
                  width: Number(field.widthName ? row[field.widthName] : 0) || 0,
                  height: Number(field.heightName ? row[field.heightName] : 0) || 0,
                }
              : null
          }
        />
      );
      break;
    default:
      control = <Input {...common} defaultValue={value} placeholder={field.placeholder} />;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-heading font-semibold text-ink">
        {field.label}
        {field.required && (
          <span aria-hidden className="text-red-700">
            *
          </span>
        )}
      </Label>
      {control}
      {field.hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {field.hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={cn("text-sm font-medium text-red-700")}>
          {error}
        </p>
      )}
    </div>
  );
}
