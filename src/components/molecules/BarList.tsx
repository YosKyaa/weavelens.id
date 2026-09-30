type BarListRow = { label: string; value: number; secondary?: string };

type BarListProps = {
  title: string;
  valueLabel: string;
  rows: BarListRow[];
  empty: string;
};

const number = new Intl.NumberFormat("id-ID");

/**
 * Peringkat sederhana: label, batang sebanding nilai, angka.
 * Semua nilai tertulis sebagai teks, jadi tidak perlu tooltip untuk membacanya.
 */
export function BarList({ title, valueLabel, rows, empty }: BarListProps) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <section className="rounded-2xl border border-line bg-paper p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base">{title}</h2>
        <span className="text-xs text-ink/65">{valueLabel}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-ink/70">{empty}</p>
      ) : (
        <ol className="grid gap-2.5">
          {rows.map((row) => (
            <li key={row.label} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-ink" title={row.label}>
                  {row.label}
                </span>
                <span className="shrink-0 font-heading font-semibold text-ink tabular-nums">
                  {number.format(row.value)}
                  {row.secondary && (
                    <span className="ml-1.5 font-sans text-xs font-normal text-ink/65">
                      {row.secondary}
                    </span>
                  )}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-sand/70" aria-hidden>
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
