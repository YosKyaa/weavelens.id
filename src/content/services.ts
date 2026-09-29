import type { PortfolioImage, SectionCopy, Service } from "@/types";

export const servicesSection: SectionCopy = {
  id: "layanan",
  heading: "Satu tim untuk semua kebutuhan visual acaramu",
  sub: "Foto, video, Reels, dan desain dikerjakan tim yang sama, jadi warna dan gayanya tetap senada.",
};

export const comingSoonLabel = "Segera hadir";

/** Foto kartu layanan dari public/portfolio/. */
function cardImage(
  id: string,
  src: string,
  alt: string,
  width: number,
  height: number,
): PortfolioImage {
  return { id, src, alt, category: "event", width, height };
}

/**
 * Harga tidak ditulis di kartu layanan (cukup sekali di section Harga).
 * Untuk mengaktifkan layanan "segera hadir": ubah `status` ke "available", isi `ctaLabel` dan `waMessage`.
 */
export const services: Service[] = [
  {
    id: "dokumentasi-foto",
    title: "Dokumentasi Foto",
    tagline: "Momen penting acaramu, terekam rapi.",
    description:
      "Wisuda, seminar, gathering, dan acara kantor. Kamu terima foto pilihan yang sudah diedit plus semua file mentahnya.",
    status: "available",
    ctaLabel: "Tanya foto",
    waMessage: "photo",
    image: cardImage(
      "layanan-foto",
      "/portfolio/layanan-foto.webp",
      "Wisudawati melempar toga di lobi gedung",
      1600,
      2400,
    ),
  },
  {
    id: "video-highlight",
    title: "Video Highlight",
    tagline: "Ringkasan acara yang enak ditonton ulang.",
    description:
      "Liputan video acaramu, disunting jadi video highlight yang siap diunggah ke media sosial.",
    status: "available",
    ctaLabel: "Tanya video",
    waMessage: "video",
    image: cardImage(
      "layanan-video",
      "/portfolio/layanan-video.webp",
      "Cuplikan short movie Restart: sekelompok orang berdiri di padang rumput saat senja",
      1080,
      675,
    ),
  },
  {
    id: "konten-reels",
    title: "Konten Reels",
    tagline: "Video vertikal siap tayang di Instagram dan TikTok.",
    description:
      "Produksi Reels untuk acara, kampus, atau brand-mu: dari konsep, pengambilan gambar, sampai edit.",
    status: "available",
    ctaLabel: "Tanya Reels",
    waMessage: "reels",
    image: cardImage(
      "layanan-reels",
      "/portfolio/layanan-reels.webp",
      "Peserta acara melihat hasil foto dan video di ponsel",
      1600,
      1067,
    ),
  },
  {
    id: "desain-visual",
    title: "Desain Visual",
    tagline: "Materi promosi yang senada dengan acaramu.",
    description:
      "Backdrop, banner, dan konten feed. Harga menyesuaikan kebutuhan, tanya langsung lewat WhatsApp.",
    status: "available",
    ctaLabel: "Tanya desain",
    waMessage: "design",
    image: cardImage(
      "layanan-desain",
      "/portfolio/layanan-desain.webp",
      "Contoh desain feed Instagram untuk proyek properti Catania dan Valencia",
      1600,
      900,
    ),
  },
  {
    id: "photobooth",
    title: "Photobooth",
    tagline: "Tamu berfoto sendiri, langsung di lokasi.",
    description: "Photobooth yang kami bawa ke lokasi acaramu.",
    status: "coming_soon",
  },
];
