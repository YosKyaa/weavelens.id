import "server-only";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { isId } from "@/lib/ids";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Proyek milik klien yang login. RLS memastikan hanya proyek organisasinya yang terbaca;
 * setelah lolos, data review dibaca dengan service role (nama tim di komentar, file bertanda tangan).
 */
export async function loadClientProject(id: string) {
  if (!isId(id)) notFound();
  const { supabase } = await requireClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, client_id, brand_id, status, logo_path")
    .eq("id", id)
    .neq("status", "draft")
    .maybeSingle();
  if (!project) notFound();
  return { supabase, db: createServiceClient() ?? supabase, project };
}
