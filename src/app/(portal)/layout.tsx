import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalSetupNotice } from "@/components/organisms/PortalSetupNotice";
import { Toaster } from "@/components/ui/sonner";
import { portal } from "@/content/portal";
import { supabaseEnv } from "@/lib/supabase/env";

/** Semua halaman portal bergantung pada sesi login: jangan pernah di-prerender. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: portal.name,
  robots: { index: false, follow: false },
};

/** Sesi & peran dicek di layout admin/ dan c/, karena tiap peran punya shell sendiri. */
export default function PortalLayout({ children }: { children: ReactNode }) {
  if (!supabaseEnv()) return <PortalSetupNotice />;

  return (
    <>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </>
  );
}
