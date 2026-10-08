import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/atoms/Logo";
import { MfaChallenge } from "@/components/organisms/MfaChallenge";
import { getLoginState, homeFor, LOGIN_PATH } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verifikasi 2 langkah — WeaveLens",
  robots: { index: false, follow: false },
  other: { google: "notranslate" },
};

type PageProps = { searchParams: Promise<{ next?: string }> };

/** Langkah kedua login: kode 6 digit dari aplikasi authenticator. */
export default async function MfaPage({ searchParams }: PageProps) {
  const session = await getLoginState();
  if (!session) redirect(LOGIN_PATH);
  const { next } = await searchParams;
  const home = homeFor(session.profile.role);
  // Hanya path internal; selain itu kembali ke beranda sesuai peran.
  const target = next && /^\/(admin|client)(\/|$|\?)/.test(next) ? next : home;
  if (!session.mfaPending) redirect(target);

  return (
    <main id="content" className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-paper p-6 shadow-soft">
        <Logo className="mb-6 h-7 w-auto" />
        <h1 className="text-2xl">Verifikasi 2 langkah</h1>
        <p className="mt-1 text-sm text-ink/75">
          Buka aplikasi authenticator (Google Authenticator, Authy, 1Password) lalu masukkan kode 6
          digit untuk WeaveLens.
        </p>
        <MfaChallenge next={target} />
      </div>
    </main>
  );
}
