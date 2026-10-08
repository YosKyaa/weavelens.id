"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, MessageSquare, RotateCcw, UserCheck } from "lucide-react";
import { markNotificationsSeen } from "@/app/(portal)/admin/notification-actions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { NotificationFeed, NotificationItem } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const ICONS = {
  approved: { icon: CheckCircle2, className: "bg-success-soft text-success" },
  revision: { icon: RotateCcw, className: "bg-brand-soft text-primary" },
  comment: { icon: MessageSquare, className: "bg-sand text-ink" },
  assigned: { icon: UserCheck, className: "bg-ink text-paper" },
} as const;

function sentence(item: NotificationItem): string {
  if (item.kind === "approved") return `${item.actor} menyetujui "${item.title}"`;
  if (item.kind === "revision") return `${item.actor} minta revisi "${item.title}"`;
  if (item.kind === "assigned") return `${item.actor} menugaskanmu "${item.title}"`;
  return `${item.actor} berkomentar di "${item.title}"`;
}

function relative(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  return days === 1 ? "kemarin" : `${days} hari lalu`;
}

/** Lonceng notifikasi tim: aksi klien terbaru. Membuka lonceng = semua ditandai dibaca. */
export function NotificationBell({ feed }: { feed: NotificationFeed }) {
  const [unread, setUnread] = useState(feed.unread);
  const [, startTransition] = useTransition();

  return (
    <Popover
      onOpenChange={(open) => {
        if (open && unread > 0) {
          setUnread(0);
          startTransition(async () => {
            await markNotificationsSeen();
          });
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
          className="relative"
        >
          <Bell aria-hidden />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <p className="border-b border-line px-4 py-3 font-heading text-sm font-semibold">
          Notifikasi
        </p>
        {feed.items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink/65">
            Belum ada aktivitas klien dalam 30 hari terakhir.
          </p>
        ) : (
          <ul className="max-h-[22rem] overflow-y-auto py-1">
            {feed.items.map((item) => {
              const { icon: Icon, className } = ICONS[item.kind];
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex gap-3 px-4 py-2.5 transition-colors hover:bg-canvas",
                      item.unread && "bg-brand-soft/30",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                        className,
                      )}
                    >
                      <Icon aria-hidden className="size-3.5" />
                    </span>
                    <span className="min-w-0 text-sm">
                      <span className="block text-ink">{sentence(item)}</span>
                      <span className="block truncate text-xs text-ink/60">
                        {[item.project, relative(item.createdAt)].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {item.unread && (
                      <span
                        aria-label="Belum dibaca"
                        className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
