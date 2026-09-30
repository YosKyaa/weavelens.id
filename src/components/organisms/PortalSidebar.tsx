"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  FolderOpen,
  Home,
  Inbox,
  LayoutTemplate,
  type LucideIcon,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PortalNavItem = { href: string; label: string; icon: string };
export type PortalNavGroup = { label?: string; items: PortalNavItem[] };

/** Ikon dipetakan di sini karena komponen ikon tidak bisa dikirim dari Server Component. */
const icons: Record<string, LucideIcon> = {
  home: Home,
  chart: BarChart3,
  inbox: Inbox,
  folder: FolderOpen,
  users: Users,
  layout: LayoutTemplate,
  invoice: FileText,
  settings: Settings,
};

type PortalSidebarProps = {
  groups: PortalNavGroup[];
  label: string;
  /** Dipanggil setelah link diklik, mis. untuk menutup menu di HP. */
  onNavigate?: () => void;
};

/** Menu portal berkelompok. Item aktif = href terpanjang yang cocok dengan URL (ditandai aria-current). */
export function PortalSidebar({ groups, label, onNavigate }: PortalSidebarProps) {
  const pathname = usePathname();
  const activeHref = groups
    .flatMap((group) => group.items.map((item) => item.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav aria-label={label} className="flex flex-col gap-6">
      {groups.map((group, index) => (
        <div key={group.label ?? index}>
          {group.label && (
            <p className="mb-2 px-3 font-heading text-xs font-semibold text-ink/60">
              {group.label}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = icons[item.icon] ?? FolderOpen;
              const active = item.href === activeHref;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink/80 transition-colors hover:bg-sand hover:text-ink",
                      active &&
                        "bg-primary text-primary-foreground shadow-soft hover:bg-primary hover:text-primary-foreground",
                    )}
                  >
                    <Icon aria-hidden className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
