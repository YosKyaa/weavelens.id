import type { SectionCopy, Step } from "@/types";

export const stepsSection: SectionCopy = {
  id: "how-it-works",
  heading: "Dari chat sampai hasil, cuma tiga langkah",
  sub: "Semua diurus lewat WhatsApp, tanpa formulir.",
};

export const steps: Step[] = [
  {
    id: "kirim-detail",
    title: "Kirim detail acara",
    description:
      "Tanggal, lokasi, dan jenis acara lewat WhatsApp. Penawaran kami kirim di hari yang sama.",
  },
  {
    id: "liput",
    title: "Tim datang dan meliput",
    description: "Tim tiba 1 jam sebelum acara dan briefing singkat dengan panitia.",
  },
  {
    id: "hasil",
    title: "Terima hasilnya",
    description:
      "Foto pilihan yang sudah diedit dan semua file mentah, dikirim lewat link Google Drive.",
  },
];
