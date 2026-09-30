"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type TabNavProps = {
  label: string;
  tabs: { href: string; label: string; count?: number }[];
};

/** Tab berbasis URL (bisa dibagikan & tombol kembali browser tetap jalan). Bisa digeser di HP. */
export function TabNav({ label, tabs }: TabNavProps) {
  const pathname = usePathname();
  const active = tabs
    .map((tab) => tab.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav aria-label={label} className="-mx-4 mb-6 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-1 border-b border-line md:w-full">
        {tabs.map((tab) => {
          const current = tab.href === active;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "-mb-px flex h-11 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap text-ink/70 transition-colors hover:text-ink",
                  current && "border-primary text-primary",
                )}
              >
                {tab.label}
                {typeof tab.count === "number" && tab.count > 0 && (
                  <span className="rounded-full bg-sand px-1.5 text-xs font-semibold text-ink">
                    {tab.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
