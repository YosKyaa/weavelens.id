"use client";

import { Field, selectClass } from "@/components/molecules/Field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

/** Bagian kecil formulir booth yang dipakai ulang: angka, pilihan, daftar centang, sakelar. */

export function NumberField(props: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Field id={props.id} label={props.label} hint={props.hint}>
      <Input
        id={props.id}
        type="number"
        inputMode="numeric"
        value={Number.isFinite(props.value) ? props.value : 0}
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        aria-describedby={props.hint ? `${props.id}-hint` : undefined}
        onChange={(event) => props.onChange(Math.trunc(Number(event.target.value) || 0))}
      />
    </Field>
  );
}

export function SelectField<T extends string>(props: {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
}) {
  return (
    <Field id={props.id} label={props.label} hint={props.hint}>
      <select
        id={props.id}
        value={props.value}
        className={selectClass}
        aria-describedby={props.hint ? `${props.id}-hint` : undefined}
        onChange={(event) => props.onChange(event.target.value as T)}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CheckList<T extends string>(props: {
  legend: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (value: T[]) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 font-heading text-sm font-semibold text-ink">{props.legend}</legend>
      <div className="flex flex-wrap gap-2">
        {props.options.map((option) => {
          const checked = props.value.includes(option.value);
          return (
            <label
              key={option.value}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-line bg-paper px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-brand-soft"
            >
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-brand)]"
                checked={checked}
                onChange={() =>
                  props.onChange(
                    checked
                      ? props.value.filter((item) => item !== option.value)
                      : props.options.map((item) => item.value).filter(
                          (item) => item === option.value || props.value.includes(item),
                        ),
                  )
                }
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SwitchRow(props: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-line bg-paper px-3 py-2.5">
      <div>
        <label htmlFor={props.id} className="font-heading text-sm font-semibold text-ink">
          {props.label}
        </label>
        {props.hint && <p className="text-sm text-ink/70">{props.hint}</p>}
      </div>
      <Switch id={props.id} checked={props.checked} onCheckedChange={props.onChange} />
    </div>
  );
}
