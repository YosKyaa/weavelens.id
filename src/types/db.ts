import type { Database } from "@/types/database";

type PublicTables = Database["public"]["Tables"];

/** Baris tabel, mis. `Tables<"projects">`. Terpisah dari database.ts yang dibuat ulang oleh `npm run db:types`. */
export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"];
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"];
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"];
