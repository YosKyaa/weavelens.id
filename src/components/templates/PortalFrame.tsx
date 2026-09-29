import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/atoms/Logo";
import { StatusToast } from "@/components/atoms/StatusToast";
import { PortalSidebar, type PortalNavItem } from "@/components/organisms/PortalSidebar";
import { Button } from "@/components/ui/button";
import { portal } from "@/content/portal";

type PortalFrameProps = {
  homeHref: string;
  nav: PortalNavItem[];
  /** Label kecil di samping logo, mis. "Admin" atau nama klien. */
  badge: string;
  /** Nama atau email user yang login. */
  userLabel: string;
  children: ReactNode;
};

/** Kerangka bersama AdminShell dan ClientShell: header, menu, area konten. */
export function PortalFrame({ homeHref, nav, badge, userLabel, children }: PortalFrameProps) {
  return (
    <div className="min-h-dvh bg-sand/40">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-6">
          <Link href={homeHref} className="flex min-w-0 items-center gap-3 rounded-sm">
            <Logo className="h-7 shrink-0" />
            <span className="truncate rounded-sm bg-sand px-2 py-0.5 font-heading text-xs font-semibold text-ink">
              {badge}
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/" target="_blank" aria-label={portal.shell.viewSite}>
                <ExternalLink aria-hidden />
                <span className="hidden sm:inline">{portal.shell.viewSite}</span>
              </Link>
            </Button>
            <span className="hidden text-sm text-ink/70 lg:inline">{userLabel}</span>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut aria-hidden />
                {portal.shell.signOut}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10 md:px-6 md:py-10">
        <aside className="min-w-0 md:sticky md:top-26 md:self-start">
          <PortalSidebar items={nav} label={portal.shell.menuLabel} />
        </aside>
        <main id="konten" tabIndex={-1} className="min-w-0 outline-none">
          {children}
        </main>
      </div>
      <Suspense>
        <StatusToast />
      </Suspense>
    </div>
  );
}
