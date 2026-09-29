import type { ReactNode } from "react";
import { EmptyState } from "@/components/atoms/EmptyState";

export type InboxRow = {
  id: string;
  title: string;
  /** Baris kedua, mis. nama klien · proyek. */
  meta: string;
  aside?: ReactNode;
};

type InboxSectionProps = {
  heading: string;
  empty: string;
  rows: InboxRow[];
};

/** Satu kelompok "yang menunggu saya" di dashboard admin. */
export function InboxSection({ heading, empty, rows }: InboxSectionProps) {
  const headingId = `inbox-${heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="flex items-center gap-2 text-lg">
        {heading}
        {rows.length > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 font-heading text-xs font-bold text-primary-foreground">
            {rows.length}
          </span>
        )}
      </h2>
      {rows.length === 0 ? (
        <EmptyState message={empty} className="mt-3 py-6" />
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <span className="min-w-0">
                <span className="block font-medium text-ink">{row.title}</span>
                <span className="block text-sm text-ink/70">{row.meta}</span>
              </span>
              {row.aside}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
