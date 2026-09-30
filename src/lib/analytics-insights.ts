/**
 * Rekomendasi otomatis dari angka analitik. Setiap saran lahir dari data nyata
 * (bukan saran umum), supaya tim tahu persis apa yang perlu dicoba minggu ini.
 */
import type { BreakdownRow, Overview } from "@/lib/analytics-data";

export type Insight = { tone: "good" | "attention" | "info"; title: string; body: string };

const MIN_VISITORS = 30;

/** Nama bagian halaman (dari atribut data-cta) dalam bahasa tim. */
const SECTION_LABELS: Record<string, string> = {
  header: "Menu atas",
  hero: "Hero (paling atas)",
  services: "Layanan",
  pricing: "Harga",
  "final-cta": "Ajakan di akhir halaman",
  footer: "Footer",
  sticky: "Tombol WhatsApp melayang",
  "not-found": "Halaman 404",
  bio: "Link bio",
};

export function sectionLabel(value: string): string {
  return SECTION_LABELS[value] ?? value;
}

const DEVICE_LABELS: Record<string, string> = {
  mobile: "HP",
  tablet: "Tablet",
  desktop: "Komputer",
};

export function deviceLabel(value: string): string {
  return DEVICE_LABELS[value] ?? value;
}

function share(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export function conversionRate(overview: Overview): number {
  return overview.visitors > 0 ? (overview.ctaVisitors / overview.visitors) * 100 : 0;
}

export function buildInsights(input: {
  current: Overview;
  previous: Overview;
  sources: BreakdownRow[];
  pages: BreakdownRow[];
  devices: BreakdownRow[];
  sections: BreakdownRow[];
}): Insight[] {
  const { current, previous, sources, devices, sections } = input;
  const insights: Insight[] = [];

  if (current.visitors < MIN_VISITORS) {
    return [
      {
        tone: "info",
        title: "Data masih sedikit",
        body: `Baru ${current.visitors} pengunjung di periode ini. Rekomendasi muncul otomatis setelah minimal ${MIN_VISITORS} pengunjung. Bagikan weavelens.id/bio di Instagram untuk mempercepat.`,
      },
    ];
  }

  const rate = conversionRate(current);
  if (rate < 2) {
    insights.push({
      tone: "attention",
      title: `Hanya ${rate.toFixed(1)}% pengunjung mengklik WhatsApp`,
      body: "Coba perjelas manfaat di headline hero, tampilkan harga mulai lebih awal, atau tambahkan testimoni asli. Ubah satu hal dalam satu waktu, lalu bandingkan angka ini seminggu kemudian.",
    });
  } else {
    insights.push({
      tone: "good",
      title: `${rate.toFixed(1)}% pengunjung mengklik WhatsApp`,
      body: "Konversi sudah sehat. Fokus berikutnya: menambah jumlah pengunjung dari sumber yang paling banyak menghasilkan klik.",
    });
  }

  const mobile = devices.find((row) => row.label === "mobile");
  const mobileShare = share(mobile?.visitors ?? 0, current.visitors);
  if (mobileShare >= 60) {
    insights.push({
      tone: "info",
      title: `${mobileShare}% pengunjung memakai HP`,
      body: "Prioritaskan tampilan HP saat mengubah konten: foto vertikal di galeri dan teks tombol yang singkat.",
    });
  }

  const topSource = [...sources].sort((a, b) => b.ctaClicks - a.ctaClicks)[0];
  if (topSource && topSource.ctaClicks > 0) {
    insights.push({
      tone: "good",
      title: `${topSource.label} menghasilkan klik WhatsApp terbanyak`,
      body: `${topSource.ctaClicks} klik dari ${topSource.visitors} pengunjung. Perbanyak konten di kanal ini dan pastikan link di sana mengarah ke weavelens.id/bio.`,
    });
  }

  if (previous.visitors >= MIN_VISITORS) {
    const change = share(current.visitors - previous.visitors, previous.visitors);
    if (change <= -20) {
      insights.push({
        tone: "attention",
        title: `Pengunjung turun ${Math.abs(change)}% dari periode sebelumnya`,
        body: "Cek apakah jadwal posting Instagram berkurang atau link bio berubah.",
      });
    }
  }

  const topSection = sections[0];
  if (topSection) {
    insights.push({
      tone: "info",
      title: `Tombol di bagian “${sectionLabel(topSection.label)}” paling sering diklik`,
      body: "Bagian ini paling meyakinkan pengunjung. Pertahankan posisinya dan jadikan acuan untuk bagian lain.",
    });
  }

  return insights.slice(0, 4);
}
