import { z } from "zod";

/** UUID Postgres (gen_random_uuid). Dicek dengan pola longgar supaya tidak menolak ID valid. */
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const idSchema = z.string().regex(ID_PATTERN, "ID tidak valid.");

export function isId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

/** Semua argumen berupa ID yang valid. Server action memakai ini agar tidak pernah melempar error. */
export function allIds(...values: unknown[]): boolean {
  return values.every(isId);
}
