import type { PortfolioFilter, PortfolioImage, SectionCopy } from "@/types";

export const portfolioSection: SectionCopy = {
  id: "portfolio",
  heading: "Hasil kerja kami",
  sub: "Wisuda, acara korporat, dan event yang pernah kami liput. Ketuk foto untuk melihat lebih besar.",
};

/** Label galeri dan lightbox (termasuk untuk pembaca layar). */
export const galleryLabels = {
  open: "Lihat foto",
  previous: "Foto sebelumnya",
  next: "Foto berikutnya",
  close: "Tutup",
  thumbnails: "Pilih foto",
  counter: (current: number, total: number) => `${current} / ${total}`,
  keyboardHint: "Gunakan tombol panah untuk berpindah foto.",
};

export const portfolioFilters: PortfolioFilter[] = [
  { value: "semua", label: "Semua" },
  { value: "wisuda", label: "Wisuda" },
  { value: "corporate", label: "Corporate" },
  { value: "event", label: "Event" },
];

/**
 * Foto disimpan di public/portfolio/ (hasil `npm run images:optimize`).
 * `width` dan `height` = ukuran file hasil optimasi. Foto pertama tampil besar di galeri.
 */
export const portfolioImages: PortfolioImage[] = [
  {
    id: "wisuda-lompat",
    src: "/portfolio/wisuda-lompat.webp",
    alt: "Wisudawan melompat sambil mengangkat toga di lobi gedung wisuda",
    category: "wisuda",
    width: 1600,
    height: 2400,
  },
  {
    id: "corporate-wahana",
    src: "/portfolio/corporate-wahana.webp",
    alt: "Foto bersama karyawan di acara PT Wahana Kosmetika Indonesia",
    category: "corporate",
    client: "PT Wahana Kosmetika Indonesia",
    width: 1600,
    height: 1067,
  },
  {
    id: "event-dies-natalis",
    src: "/portfolio/event-dies-natalis.webp",
    alt: "Foto bersama di acara Dies Natalis ke-28 Akademi Keperawatan Pasar Rebo",
    category: "event",
    client: "Akademi Keperawatan Pasar Rebo",
    year: "2024",
    width: 1600,
    height: 1067,
  },
  {
    id: "wisuda-grup",
    src: "/portfolio/wisuda-grup.webp",
    alt: "Tiga wisudawati bercanda saat sesi foto kelulusan",
    category: "wisuda",
    width: 1600,
    height: 900,
  },
  {
    id: "corporate-eksekutif",
    src: "/portfolio/corporate-eksekutif.webp",
    alt: "Dua pimpinan berbatik tersenyum di barisan tamu undangan",
    category: "corporate",
    width: 1036,
    height: 1350,
  },
  {
    id: "event-tari",
    src: "/portfolio/event-tari.webp",
    alt: "Penari tradisional dan prosesi potong tumpeng di acara kampus",
    category: "event",
    client: "Akademi Keperawatan Pasar Rebo",
    year: "2024",
    width: 1600,
    height: 899,
  },
  {
    id: "wisuda-buket",
    src: "/portfolio/wisuda-buket.webp",
    alt: "Wisudawati memegang buket bunga di taman berbunga ungu",
    category: "wisuda",
    width: 1600,
    height: 1066,
  },
  {
    id: "corporate-produksi",
    src: "/portfolio/corporate-produksi.webp",
    alt: "Sesi produksi konten wawancara di kantor dengan kamera dan tripod",
    category: "corporate",
    width: 1600,
    height: 1067,
  },
  {
    id: "event-outdoor",
    src: "/portfolio/event-outdoor.webp",
    alt: "Foto bersama peserta acara di area outdoor dengan spanduk",
    category: "event",
    width: 1600,
    height: 1067,
  },
];

/** Foto utama hero. */
export const heroImage: PortfolioImage = {
  id: "hero",
  src: "/portfolio/hero-wisuda.webp",
  alt: "Wisudawan dan wisudawati berpose peace di tangga kampus",
  category: "wisuda",
  width: 1600,
  height: 900,
};
