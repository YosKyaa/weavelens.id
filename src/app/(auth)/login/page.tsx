import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { BatikPattern } from "@/components/atoms/BatikPattern";
import { Logo } from "@/components/atoms/Logo";
import { LoginForm } from "@/components/organisms/LoginForm";
import { PortalSetupNotice } from "@/components/organisms/PortalSetupNotice";
import { portal } from "@/content/portal";
import { getSession, homeFor } from "@/lib/auth";
import { supabaseEnv } from "@/lib/supabase/env";
import { googleEnabled } from "@/lib/supabase/providers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${portal.login.heading} — WeaveLens`,
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ next?: string; error?: string }> };

const text = portal.login;

/** Pesan dari parameter `?error=` setelah redirect (magic link, Google, akun). */
const ERRORS: Record<string, { message: string; tab: "team" | "client" }> = {
  link: { message: text.errors.linkExpired, tab: "client" },
  session: { message: text.errors.session, tab: "team" },
  google: { message: text.errors.googleFailed, tab: "team" },
  account: { message: text.errors.account, tab: "team" },
};

/**
 * Halaman masuk dua kolom: panel brand (desktop) + form.
 * Di HP hanya form, dengan logo di atas, supaya cepat dan fokus.
 */
export default async function LoginPage({ searchParams }: PageProps) {
  if (!supabaseEnv()) return <PortalSetupNotice />;

  const [session, google] = await Promise.all([getSession(), googleEnabled()]);
  if (session) redirect(homeFor(session.profile.role));

  const { next, error } = await searchParams;
  const problem = error ? ERRORS[error] : undefined;
  const tab = problem?.tab ?? (next?.startsWith("/client") ? "client" : "team");

  return (
    <main
      id="content"
      className="grid min-h-dvh bg-paper lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
    >
      {/* Panel brand (desktop) */}
      <section
        aria-hidden
        className="relative hidden overflow-hidden bg-brand text-sand lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16"
      >
        <Image
          src="/portfolio/hero-wisuda.webp"
          alt=""
          fill
          priority
          sizes="55vw"
          className="object-cover opacity-25 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(116,52,43,0.92)_0%,rgba(92,40,34,0.88)_55%,rgba(43,26,23,0.95)_100%)]" />
        <BatikPattern
          id="batik-login"
          variant="kawung"
          tone="light"
          speed={120}
          className="opacity-[0.07]"
        />

        <Logo priority className="relative h-10 self-start brightness-0 invert-[0.94]" />

        <div className="relative max-w-md">
          <p className="font-heading text-sm font-semibold tracking-wide text-sand/80">
            {text.brand.eyebrow}
          </p>
          <h2 className="mt-3 font-heading text-4xl leading-tight font-bold text-sand xl:text-[2.75rem]">
            {text.brand.title}
          </h2>
          <ul className="mt-8 grid gap-3">
            {text.brand.points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sand/90">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-sand/15">
                  <Check className="size-3.5" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-serif text-lg text-sand/75 italic">{text.brand.footer}</p>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[25rem]">
          <Link
            href="/"
            aria-label="Kembali ke weavelens.id"
            className="inline-block rounded-sm lg:hidden"
          >
            <Logo priority className="h-9" />
          </Link>
          <h1 className="mt-8 text-[1.75rem] leading-tight lg:mt-0">{text.heading}</h1>
          <p className="mt-2 mb-8 text-ink/70">{text.sub}</p>
          <LoginForm next={next} initialError={problem?.message} initialTab={tab} google={google} />
          <p className="mt-10 text-center text-sm text-ink/55">
            <Link href="/" className="hover:text-ink hover:underline">
              ← Kembali ke weavelens.id
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
