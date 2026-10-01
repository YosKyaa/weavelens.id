"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  FileText,
  FolderKanban,
  FolderOpen,
  Home,
  Images,
  Inbox,
  LayoutTemplate,
  type LucideIcon,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PortalNavItem = { href: string; label: string; icon?: string };
export type PortalNavGroup = {
  id: string;
  label?: string;
  icon?: string;
  /** Grup bisa dibuka-tutup; statusnya diingat per browser. */
  collapsible?: boolean;
  /** Tertutup saat pertama kali, kecuali berisi halaman aktif. */
  defaultOpen?: boolean;
  items: PortalNavItem[];
};

/** Ikon dipetakan di sini karena komponen ikon tidak bisa dikirim dari Server Component. */
const icons: Record<string, LucideIcon> = {
  home: Home,
  chart: BarChart3,
  inbox: Inbox,
  folder: FolderOpen,
  kanban: FolderKanban,
  images: Images,
  users: Users,
  layout: LayoutTemplate,
  invoice: FileText,
  settings: Settings,
  shield: ShieldCheck,
  user: UserRound,
};

const STORAGE_KEY = "wl_nav_groups";

type PortalSidebarProps = {
  groups: PortalNavGroup[];
  label: string;
  /** Dipanggil setelah link diklik, mis. untuk menutup menu di HP. */
  onNavigate?: () => void;
};

function readSaved(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

/**
 * Menu portal berkelompok. Grup panjang (mis. CMS) bisa dibuka-tutup supaya menu tetap ringkas.
 * Item aktif = href terpanjang yang cocok dengan URL (ditandai aria-current).
 */
export function PortalSidebar({ groups, label, onNavigate }: PortalSidebarProps) {
  const pathname = usePathname();
  const activeHref = groups
    .flatMap((group) => group.items.map((item) => item.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  const [open, setOpen] = useState<Record<string, boolean>>({});

  // Status tersimpan dibaca setelah mount supaya render server dan client sama.
  useEffect(() => setOpen(readSaved()), []);

  function isOpen(group: PortalNavGroup): boolean {
    if (!group.collapsible) return true;
    if (group.items.some((item) => item.href === activeHref)) return open[group.id] ?? true;
    return open[group.id] ?? group.defaultOpen ?? false;
  }

  function toggle(group: PortalNavGroup) {
    const next = { ...open, [group.id]: !isOpen(group) };
    setOpen(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Penyimpanan diblokir: grup tetap bisa dibuka-tutup untuk sesi ini.
    }
  }

  return (
    <nav aria-label={label} className="flex flex-col gap-5">
      {groups.map((group) => {
        const expanded = isOpen(group);
        const listId = `nav-group-${group.id}`;
        const GroupIcon = group.icon ? icons[group.icon] : null;
        const hasActive = group.items.some((item) => item.href === activeHref);

        return (
          <div key={group.id}>
            {group.label &&
              (group.collapsible ? (
                <button
                  type="button"
                  onClick={() => toggle(group)}
                  aria-expanded={expanded}
                  aria-controls={listId}
                  className={cn(
                    "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink/80 transition-colors hover:bg-sand hover:text-ink",
                    hasActive && !expanded && "bg-sand text-ink",
                  )}
                >
                  {GroupIcon && <GroupIcon aria-hidden className="size-4 shrink-0" />}
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-4 transition-transform duration-200",
                      expanded && "rotate-180",
                    )}
                  />
                </button>
              ) : (
                <p className="mb-2 px-3 font-heading text-xs font-semibold text-ink/60">
                  {group.label}
                </p>
              ))}
            <ul
              id={listId}
              hidden={!expanded}
              className={cn(
                "flex flex-col gap-0.5",
                group.collapsible && "mt-0.5 ml-5 border-l border-line pl-2",
              )}
            >
              {group.items.map((item) => {
                const Icon = item.icon ? icons[item.icon] : null;
                const active = item.href === activeHref;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink/80 transition-colors hover:bg-sand hover:text-ink",
                        group.collapsible ? "h-9" : "h-10",
                        active &&
                          "bg-primary text-primary-foreground shadow-soft hover:bg-primary hover:text-primary-foreground",
                      )}
                    >
                      {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
