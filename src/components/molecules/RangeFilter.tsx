import Link from "next/link";
import { cn } from "@/lib/utils";

type RangeFilterProps = {
  basePath: string;
  options: readonly number[];
  value: number;
};

/** Pilihan rentang waktu sebagai link (bisa dibagikan & tetap saat halaman dimuat ulang). */
export function RangeFilter({ basePath, options, value }: RangeFilterProps) {
  return (
    <nav aria-label="Rentang waktu" className="inline-flex rounded-lg border border-line bg-paper p-1">
      {options.map((days) => (
        <Link
          key={days}
          href={`${basePath}?hari=${days}`}
          aria-current={days === value ? "page" : undefined}
          scroll={false}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium text-ink/75 transition-colors hover:text-ink",
            days === value && "bg-ink text-paper hover:text-paper",
          )}
        >
          {days} hari
        </Link>
      ))}
    </nav>
  );
}
