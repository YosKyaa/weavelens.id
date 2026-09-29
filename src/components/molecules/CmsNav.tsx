"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CMS_BASE, collections } from "@/lib/cms/collections";
import { cn } from "@/lib/utils";

const items = [
  { href: CMS_BASE, label: "Ringkasan" },
  ...collections.map((collection) => ({
    href: `${CMS_BASE}/${collection.slug}`,
    label: collection.label,
  })),
];

/** Pilihan koleksi di dalam "Konten website", berupa baris pil yang bisa digeser. */
export function CmsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Koleksi konten">
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {items.map(({ href, label }) => {
          const active = href === CMS_BASE ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center rounded-full border border-line bg-paper px-4 text-sm font-medium whitespace-nowrap text-ink/80 transition-colors hover:border-sand-deep hover:text-ink",
                  active && "border-ink bg-ink text-paper hover:border-ink hover:text-paper",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
