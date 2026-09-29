import type { ReactNode } from "react";
import { ClientShell } from "@/components/templates/ClientShell";
import { portal } from "@/content/portal";
import { requireClient } from "@/lib/auth";

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const { supabase, profile, user } = await requireClient();

  const { data: client } = profile.client_id
    ? await supabase.from("clients").select("name").eq("id", profile.client_id).maybeSingle()
    : { data: null };

  return (
    <ClientShell
      clientName={client?.name ?? portal.shell.clientFallback}
      userLabel={profile.full_name ?? user.email ?? ""}
    >
      {children}
    </ClientShell>
  );
}
