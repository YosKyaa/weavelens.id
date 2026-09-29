import type { CmsCollection, CmsField } from "@/lib/cms/collections";

export type FieldErrors = Record<string, string>;
export type RowValues = Record<string, string | number | string[] | null>;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isRequired(field: CmsField, raw: Record<string, string>): boolean {
  if (field.required) return true;
  return field.requiredWhen ? raw[field.requiredWhen.field] === field.requiredWhen.equals : false;
}

function toDimension(value: string): number | null {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : null;
}

/** Membaca FormData sesuai definisi koleksi. Pesan error ditulis untuk admin, bukan developer. */
export function parseForm(
  collection: CmsCollection,
  formData: FormData,
): { values: RowValues; errors: FieldErrors } {
  const values: RowValues = {};
  const errors: FieldErrors = {};
  const raw = Object.fromEntries(
    collection.fields.map((field) => [field.name, text(formData, field.name)]),
  );

  for (const field of collection.fields) {
    const value = raw[field.name];
    const required = isRequired(field, raw);

    if (field.type === "list") {
      const items = value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (required && items.length === 0) errors[field.name] = `${field.label} wajib diisi.`;
      values[field.name] = items;
      continue;
    }

    if (!value) {
      if (required) errors[field.name] = `${field.label} wajib diisi.`;
      values[field.name] = null;
      if (field.type === "image") {
        if (field.widthName) values[field.widthName] = null;
        if (field.heightName) values[field.heightName] = null;
      }
      continue;
    }

    if ((field.type === "text" || field.type === "textarea") && field.maxLength) {
      if (value.length > field.maxLength) {
        errors[field.name] = `Maksimal ${field.maxLength} karakter (sekarang ${value.length}).`;
      }
    }
    if (field.type === "text" && field.pattern && !new RegExp(field.pattern.regex).test(value)) {
      errors[field.name] = field.pattern.message;
    }
    if (field.type === "select" && !field.options.some((option) => option.value === value)) {
      errors[field.name] = `Pilih salah satu ${field.label.toLowerCase()}.`;
    }
    if (field.type === "image") {
      const width = field.widthName ? toDimension(text(formData, field.widthName)) : null;
      const height = field.heightName ? toDimension(text(formData, field.heightName)) : null;
      if ((field.widthName && !width) || (field.heightName && !height)) {
        errors[field.name] = "Ukuran foto tidak terbaca. Unggah ulang fotonya.";
      }
      if (field.widthName) values[field.widthName] = width;
      if (field.heightName) values[field.heightName] = height;
    }

    values[field.name] = value;
  }

  return { values, errors };
}
