const ID_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const SHORT_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Nama bulan (Indonesia), indeks 0–11. */
export const monthName = (index: number) => ID_MONTHS[((index % 12) + 12) % 12];

/**
 * Usulan nama proyek periode berikutnya: "Konten Instagram Oktober 2026" → "… November 2026",
 * "Feed Des 2026" → "Feed Jan 2027". Tanpa nama bulan → ditambah " — <Bulan> <Tahun>" dari
 * `fallback` (YYYY-MM-DD, mis. tanggal acara/hari ini) yang sudah digeser.
 */
export function nextPeriodTitle(title: string, months: number, fallback: string): string {
  const lists = [ID_MONTHS, EN_MONTHS, SHORT, SHORT_EN];
  for (const list of lists) {
    const pattern = new RegExp(`\\b(${list.join("|")})\\b(\\s+(\\d{4}))?`, "i");
    const match = title.match(pattern);
    if (!match) continue;
    const index = list.findIndex((name) => name.toLowerCase() === match[1].toLowerCase());
    const total = index + months;
    const nextIndex = ((total % 12) + 12) % 12;
    const yearShift = Math.floor(total / 12);
    const name = list[nextIndex];
    const year = match[3] ? ` ${Number(match[3]) + yearShift}` : "";
    return title.replace(pattern, `${name}${year}`);
  }
  if (months === 0) return `${title} (salinan)`;
  const [year, month] = fallback.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${title} — ${monthName(target.getUTCMonth())} ${target.getUTCFullYear()}`;
}
