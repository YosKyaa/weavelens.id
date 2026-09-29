import { portal } from "@/content/portal";
import { formatDate } from "@/lib/format";

type DateTextProps = {
  /** ISO date/timestamp dari database. */
  value: string | null | undefined;
  className?: string;
};

/** Tanggal format Indonesia, mis. "19 Sep 2026", dengan atribut datetime yang benar. */
export function DateText({ value, className }: DateTextProps) {
  if (!value) return <span className={className}>{portal.dateEmpty}</span>;
  return (
    <time dateTime={value} className={className}>
      {formatDate(value)}
    </time>
  );
}
