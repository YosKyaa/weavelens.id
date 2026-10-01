import type { NavItem, WaAdmin } from "@/types";

/**
 * Admin WhatsApp. `number`: format internasional tanpa "+" dan tanpa spasi.
 * Tombol WhatsApp di halaman menawarkan pilihan admin sesuai urutan di sini.
 */
const admins: WaAdmin[] = [
  { id: "admin-1", number: "6282112187810", display: "+62 821-1218-7810" },
  { id: "admin-2", number: "6281387273158", display: "+62 813-8727-3158" },
];

const WA_PATTERN = /^62\d{8,13}$/;

/** Menggagalkan build jika ada nomor admin yang formatnya salah. */
function validateAdmins(list: WaAdmin[]): WaAdmin[] {
  for (const [index, admin] of list.entries()) {
    if (!WA_PATTERN.test(admin.number)) {
      throw new Error(
        `[content/site.ts] Nomor WhatsApp admin ke-${index + 1} ("${admin.number}") tidak valid. Gunakan format 62xxxxxxxxxx tanpa "+" dan spasi.`,
      );
    }
  }
  return list;
}

const nav: NavItem[] = [
  { label: "Layanan", href: "#services" },
  { label: "Portofolio", href: "#portfolio" },
  { label: "Harga", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export const site = {
  name: "WeaveLens",
  tagline: "Catch the Moment, Remember Forever",
  /** Tiga pilar layanan (dari Creative Portfolio). */
  pillars: "Capture. Craft. Connect.",
  /** Domain kanonik (weavelens.id dialihkan ke www). */
  url: "https://www.weavelens.id",
  locale: "id_ID",

  meta: {
    title: "WeaveLens — Dokumentasi foto, video, dan konten Reels di Jakarta",
    description:
      "Dokumentasi foto, video highlight, dan produksi konten Reels untuk wisuda, seminar, dan acara kantor di Jabodetabek. Berbasis di Jakarta. Foto siap dalam 3 hari kerja.",
  },

  wa: {
    admins: validateAdmins(admins),
    ctaLabel: "Cek jadwal via WhatsApp",
    /** Versi pendek untuk tombol header di layar kecil. */
    ctaShortLabel: "WhatsApp",
    chooser: {
      title: "Chat dengan admin",
      description: "Pilih salah satu. Keduanya bisa bantu cek jadwal dan kirim penawaran.",
      /** Admin ditampilkan bernomor sesuai urutan di daftar `admins`. */
      adminLabel: (index: number) => `Admin ${index + 1}`,
    },
    messages: {
      general: "Halo WeaveLens, saya mau cek jadwal liputan.\nJenis acara: \nTanggal: \nLokasi: ",
      photo: "Halo WeaveLens, saya tertarik paket Dokumentasi Foto.\nTanggal acara: \nLokasi: ",
      photoVideo:
        "Halo WeaveLens, saya tertarik paket Foto + Video Highlight.\nTanggal acara: \nLokasi: ",
      video: "Halo WeaveLens, saya mau tanya layanan Video Highlight.\nTanggal acara: \nLokasi: ",
      reels:
        "Halo WeaveLens, saya mau tanya produksi Konten Reels.\nUntuk (brand/acara): \nJumlah video: \nTanggal: ",
      design:
        "Halo WeaveLens, saya mau tanya harga Desain Visual.\nUntuk acara: \nKebutuhan (backdrop/banner/feed): ",
    },
  },

  contact: {
    instagramHandle: "@weavelens",
    instagramUrl: "https://instagram.com/weavelens",
    email: "weavelens.studio@gmail.com",
    address: "Jakarta, Indonesia",
    area: "Melayani seluruh Jabodetabek",
    responseHours: "Admin membalas Senin–Sabtu, 09.00–21.00",
  },

  nav,

  hero: {
    badge: "Berbasis di Jakarta, melayani Jabodetabek",
    headline: "Dokumentasi wisuda dan acara kantor, foto siap dalam 3 hari kerja.",
    sub: "Foto, video highlight, dan konten Reels dari satu tim. Kirim tanggal dan lokasi acaramu, sisanya kami yang urus.",
    photoTags: ["Wisuda", "Seminar", "Gathering"],
    /** Teks yang berputar di segel bulat pada foto hero. */
    sealText: "Foto • Video • Reels • Desain • ",
  },

  finalCta: {
    heading: "Acaramu tanggal berapa?",
    sub: "Kirim tanggal dan lokasinya. Kami cek jadwal tim dan balas hari ini juga.",
    tags: ["Wisuda", "Seminar", "Gathering", "Acara kantor"],
  },

  footer: {
    menuHeading: "Menu",
    contactHeading: "Chat admin",
    infoHeading: "Info",
    instagramLabel: "Instagram",
    emailLabel: "Email",
    copyright: (year: number) => `© ${year} WeaveLens. Semua hak dilindungi.`,
  },

  notFound: {
    heading: "Halaman tidak ditemukan",
    body: "Link yang kamu buka mungkin salah ketik atau sudah dipindah.",
    homeLabel: "Kembali ke beranda",
  },

  /** Label ukuran pada placeholder foto, mis. "1600 × 1067". */
  placeholderSize: (width: number, height: number) => `${width} × ${height}`,

  /** Label untuk pembaca layar dan elemen non-visual. */
  a11y: {
    skipToContent: "Langsung ke konten",
    homeLink: "WeaveLens, kembali ke beranda",
    logoAlt: "WeaveLens",
    mainNav: "Navigasi utama",
    opensInNewTab: "(membuka WhatsApp di tab baru)",
    closeDialog: "Tutup",
    portfolioFilter: "Filter portofolio",
    clientList: "Klien yang pernah bekerja sama",
  },
} as const;
