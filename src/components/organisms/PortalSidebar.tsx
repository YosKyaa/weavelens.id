"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  FolderOpen,
  Inbox,
  LayoutTemplate,
  type LucideIcon,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PortalNavItem = { href: string; label: string; icon: string };

/** Ikon dipetakan di sini karena komponen ikon tidak bisa dikirim dari Server Component. */
const icons: Record<string, LucideIcon> = {
  inbox: Inbox,
  folder: FolderOpen,
  users: Users,
  layout: LayoutTemplate,
  invoice: FileText,
  settings: Settings,
};

type PortalSidebarProps = {
  items: PortalNavItem[];
  label: string;
};

/** Menu samping di desktop, baris geser di HP. Item aktif ditandai aria-current. */
export function PortalSidebar({ items, label }: PortalSidebarProps) {
  const pathname = usePathname();
  // Item dengan href terpanjang yang cocok dianggap aktif (/admin vs /admin/projects).
  const activeHref = items
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav aria-label={label}>
      <ul className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
        {items.map((item) => {
          const Icon = icons[item.icon] ?? FolderOpen;
          const active = item.href === activeHref;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium whitespace-nowrap text-ink/80 transition-colors hover:bg-sand hover:text-ink",
                  active &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                <Icon aria-hidden className="size-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
