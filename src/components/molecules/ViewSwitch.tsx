import Link from "next/link";
import { CalendarDays, Columns3, LayoutGrid, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  board: Columns3,
  list: LayoutGrid,
  calendar: CalendarDays,
  plan: ListChecks,
} as const;

type ViewSwitchProps = {
  label: string;
  options: { id: keyof typeof ICONS; label: string; href: string }[];
  active: keyof typeof ICONS;
};

/** Pilihan tampilan (mis. Papan | Kalender) berbasis URL, jadi bisa dibagikan & di-bookmark. */
export function ViewSwitch({ label, options, active }: ViewSwitchProps) {
  return (
    <nav
      aria-label={label}
      className="inline-flex w-fit rounded-lg border border-line bg-paper p-1"
    >
      {options.map((option) => {
        const Icon = ICONS[option.id];
        const current = option.id === active;
        return (
          <Link
            key={option.id}
            href={option.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-ink/70 transition-colors hover:text-ink",
              current && "bg-ink text-paper hover:text-paper",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
