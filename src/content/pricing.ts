import type { PricingPlan, SectionCopy } from "@/types";

export const pricingSection: SectionCopy = {
  id: "harga",
  heading: "Harga jelas sejak awal",
  sub: "Ini harga mulainya. Harga akhir tergantung durasi dan jumlah tim, penawaran lengkapnya kami kirim lewat WhatsApp.",
};

export const pricePrefix = "Mulai dari";

export const pricingNote = "Untuk acara di luar Jabodetabek, transportasi dihitung terpisah.";

export const pricingPlans: PricingPlan[] = [
  {
    id: "fotografi",
    name: "Dokumentasi Foto",
    price: "450 ribu",
    features: [
      "1 fotografer, 4 jam liputan",
      "50+ foto terpilih sudah diedit",
      "Semua file mentah lewat Google Drive",
      "Hasil dalam 3 hari kerja",
    ],
    ctaLabel: "Tanya paket Dokumentasi Foto",
    waMessage: "photo",
  },
  {
    id: "foto-video",
    name: "Foto + Video Highlight",
    price: "1 juta",
    features: [
      "1 fotografer + 1 videografer",
      "Semua yang ada di paket Dokumentasi Foto",
      "Video highlight 60 detik untuk media sosial",
      "Hasil dalam 5 hari kerja",
    ],
    ctaLabel: "Tanya paket Foto + Video",
    waMessage: "photoVideo",
  },
];
