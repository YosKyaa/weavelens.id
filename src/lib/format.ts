const dateFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

/**
 * "2026-09-19" → "19 Sep 2026". Tanggal tanpa jam dibaca sebagai tanggal Jakarta,
 * supaya tidak bergeser sehari karena zona waktu server.
 */
export function formatDate(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00+07:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
}

/** Tanggal hari ini di Jakarta, format YYYY-MM-DD (untuk perbandingan kolom `date`). */
export function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}
