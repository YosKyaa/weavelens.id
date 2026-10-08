import Link from "next/link";
import { CalendarDays, Columns3, FileBarChart, LayoutGrid, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  board: Columns3,
  list: LayoutGrid,
  calendar: CalendarDays,
  plan: ListChecks,
  report: FileBarChart,
} as const;

type ViewSwitchProps = {
  label: string;
  /** `shortLabel` dipakai di layar sempit (HP) supaya tidak terpotong ke baris kedua. */
  options: { id: keyof typeof ICONS; label: string; shortLabel?: string; href: string }[];
  active: keyof typeof ICONS;
};

/** Pilihan tampilan (mis. Papan | Kalender) berbasis URL, jadi bisa dibagikan & di-bookmark. */
export function ViewSwitch({ label, options, active }: ViewSwitchProps) {
  return (
    <nav
      aria-label={label}
      // HP: selebar layar, kolom sama rata. Desktop: selebar isinya.
      className="grid w-full auto-cols-fr grid-flow-col gap-1 rounded-lg border border-line bg-paper p-1 sm:inline-flex sm:w-fit sm:gap-0"
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
              // HP: ikon di atas label (tetap terbaca walau font HP diperbesar). Desktop: sebaris.
              "flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1.5 text-xs font-medium whitespace-nowrap text-ink/70 transition-colors hover:text-ink sm:inline-flex sm:min-h-0 sm:h-8 sm:flex-row sm:gap-1.5 sm:px-3 sm:py-0 sm:text-sm",
              current && "bg-ink text-paper hover:text-paper",
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            {option.shortLabel ? (
              <>
                <span className="truncate sm:hidden">{option.shortLabel}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </>
            ) : (
              <span className="truncate">{option.label}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
