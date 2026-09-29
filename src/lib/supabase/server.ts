import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/** Klien dengan sesi user yang login (cookie). Hak akses dijaga RLS di database. */
export async function createSessionClient() {
  const env = supabaseEnv();
  if (!env) return null;
  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Dipanggil dari Server Component: sesi disegarkan oleh middleware.
        }
      },
    },
  });
}

export type SessionClient = NonNullable<Awaited<ReturnType<typeof createSessionClient>>>;
