import Link from "next/link";
import { Logo } from "@/components/atoms/Logo";
import { WaLink } from "@/components/atoms/WaLink";
import { NavLink } from "@/components/molecules/NavLink";
import { site } from "@/content/site";
import { cn, container } from "@/lib/utils";

/** Header sticky berupa panel glass: konten di bawahnya samar terlihat saat di-scroll. */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/75 backdrop-blur-xl backdrop-saturate-150">
      <div className={cn(container, "flex flex-wrap items-center justify-between gap-x-6")}>
        <Link
          href="/"
          aria-label={site.a11y.homeLink}
          className="flex h-16 items-center rounded-sm"
        >
          <Logo priority className="h-8 md:h-9" />
        </Link>
        <nav
          aria-label={site.a11y.mainNav}
          className="order-last -mx-4 w-[calc(100%+2rem)] border-t border-line/70 md:order-none md:mx-0 md:ml-auto md:w-auto md:border-none"
        >
          <ul className="flex justify-center gap-2 md:gap-1">
            {site.nav.map((item) => (
              <li key={item.href}>
                <NavLink item={item} />
              </li>
            ))}
          </ul>
        </nav>
        <WaLink
          section="header"
          shortLabel={site.wa.ctaShortLabel}
          className="h-11 px-4 text-sm shadow-none"
        />
      </div>
    </header>
  );
}
