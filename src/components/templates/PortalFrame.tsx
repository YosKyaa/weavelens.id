import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/atoms/Logo";
import { StatusToast } from "@/components/atoms/StatusToast";
import { PortalMobileNav } from "@/components/organisms/PortalMobileNav";
import { PortalSidebar, type PortalNavGroup } from "@/components/organisms/PortalSidebar";
import { Button } from "@/components/ui/button";
import { portal } from "@/content/portal";

type PortalFrameProps = {
  homeHref: string;
  nav: PortalNavGroup[];
  /** Label kecil di bawah logo, mis. "Admin" atau nama klien. */
  badge: string;
  /** Nama atau email user yang login. */
  userLabel: string;
  /** Tombol kecil di kanan atas (mis. lonceng notifikasi). */
  headerAction?: ReactNode;
  children: ReactNode;
};

function AccountFooter({ userLabel }: { userLabel: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="truncate px-3 pb-1 text-xs text-ink/70">
        {portal.shell.signedInAs} <span className="font-semibold text-ink">{userLabel}</span>
      </p>
      <Button asChild variant="ghost" size="sm" className="justify-start">
        <Link href="/" target="_blank">
          <ExternalLink aria-hidden />
          {portal.shell.viewSite}
        </Link>
      </Button>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
          <LogOut aria-hidden />
          {portal.shell.signOut}
        </Button>
      </form>
    </div>
  );
}

/**
 * Kerangka bersama AdminShell dan ClientShell.
 * Desktop (lg+): sidebar tetap di kiri. HP/tablet: bar atas + menu geser.
 */
export function PortalFrame({
  homeHref,
  nav,
  badge,
  userLabel,
  headerAction,
  children,
}: PortalFrameProps) {
  const footer = <AccountFooter userLabel={userLabel} />;

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-paper lg:flex">
        <div className="relative border-b border-line">
          <Link href={homeHref} className="flex flex-col gap-2 px-6 py-5">
            <Logo className="h-8 self-start" />
            <span className="w-fit max-w-[11rem] truncate rounded-sm bg-sand px-2 py-0.5 font-heading text-xs font-semibold text-ink">
              {badge}
            </span>
          </Link>
          {headerAction && <div className="absolute top-4 right-3">{headerAction}</div>}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-6">
          <PortalSidebar groups={nav} label={portal.shell.menuLabel} />
        </div>
        <div className="border-t border-line p-3">{footer}</div>
      </aside>

      {/* Bar atas HP/tablet */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur lg:hidden">
        <PortalMobileNav
          groups={nav}
          label={portal.shell.menuLabel}
          openLabel={portal.shell.openMenu}
          footer={footer}
        />
        <Link href={homeHref} className="flex min-w-0 items-center gap-2">
          <Logo className="h-6 shrink-0" />
          <span className="truncate rounded-sm bg-sand px-2 py-0.5 font-heading text-xs font-semibold text-ink">
            {badge}
          </span>
        </Link>
        {headerAction && <div className="ml-auto">{headerAction}</div>}
      </header>

      <main id="content" tabIndex={-1} className="outline-none lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>
      <Suspense>
        <StatusToast />
      </Suspense>
    </div>
  );
}
