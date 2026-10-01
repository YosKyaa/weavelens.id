import "server-only";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Apakah login Google sudah diaktifkan di Supabase (Authentication → Providers → Google).
 * Dibaca dari endpoint publik /auth/v1/settings dan di-cache 5 menit.
 */
export async function googleEnabled(): Promise<boolean> {
  const env = supabaseEnv();
  if (!env) return false;
  try {
    const response = await fetch(`${env.url}/auth/v1/settings`, {
      headers: { apikey: env.key },
      next: { revalidate: 300 },
    });
    if (!response.ok) return false;
    const settings = (await response.json()) as { external?: Record<string, boolean> };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}
