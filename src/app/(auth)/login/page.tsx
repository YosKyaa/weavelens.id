import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/atoms/Logo";
import { LoginForm } from "@/components/organisms/LoginForm";
import { PortalSetupNotice } from "@/components/organisms/PortalSetupNotice";
import { portal } from "@/content/portal";
import { getSession, homeFor } from "@/lib/auth";
import { supabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${portal.login.heading} — WeaveLens`,
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: PageProps) {
  if (!supabaseEnv()) return <PortalSetupNotice />;

  const session = await getSession();
  if (session) redirect(homeFor(session.profile.role));

  const { next, error } = await searchParams;

  return (
    <main id="content" className="flex min-h-dvh items-center justify-center bg-sand/50 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-paper p-8 shadow-soft">
        <Logo priority className="h-9" />
        <h1 className="mt-8 text-2xl">{portal.login.heading}</h1>
        <p className="mt-2 mb-8 text-sm text-ink/80">{portal.login.sub}</p>
        <LoginForm
          next={next}
          initialError={error === "link" ? portal.login.errors.linkExpired : undefined}
        />
      </div>
    </main>
  );
}
