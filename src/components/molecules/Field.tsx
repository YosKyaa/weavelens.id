import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
};

/** Label + kontrol + petunjuk + pesan error, dengan tautan aria yang benar. */
export function Field({ id, label, required, hint, error, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="font-heading font-semibold text-ink">
        {label}
        {required && (
          <span aria-hidden className="text-danger">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink/70">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const selectClass =
  "h-9 w-full rounded-md border border-input bg-paper px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm";
