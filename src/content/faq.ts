import type { Faq, SectionCopy } from "@/types";

export const faqSection: SectionCopy = {
  id: "faq",
  heading: "Pertanyaan yang sering masuk",
  sub: "Belum ketemu jawabannya? Tanyakan langsung ke admin lewat WhatsApp.",
};

/** Jawaban hanya berisi fakta yang sudah ada di halaman. */
export const faqs: Faq[] = [
  {
    id: "booking",
    question: "Bagaimana cara booking?",
    answer:
      "Chat admin lewat WhatsApp, lalu kirim tanggal, lokasi, dan jenis acara. Kami cek jadwal tim dan kirim penawaran di hari yang sama.",
  },
  {
    id: "area",
    question: "Area mana saja yang dilayani?",
    answer:
      "Kami berbasis di Jakarta dan melayani seluruh Jabodetabek. Untuk acara di luar Jabodetabek, biaya transportasi dihitung terpisah.",
  },
  {
    id: "hasil",
    question: "Kapan hasilnya dikirim?",
    answer:
      "Paket Dokumentasi Foto dalam 3 hari kerja, paket Foto + Video Highlight dalam 5 hari kerja. Semua dikirim lewat link Google Drive.",
  },
  {
    id: "file-mentah",
    question: "Apakah file mentah ikut dikirim?",
    answer: "Ya. Semua file mentah dikirim bersama foto pilihan yang sudah diedit.",
  },
  {
    id: "paket-khusus",
    question: "Bisa minta paket di luar daftar harga?",
    answer:
      "Bisa. Harga akhir menyesuaikan durasi dan jumlah tim, jadi ceritakan kebutuhan acaramu dan kami susun penawarannya.",
  },
];
