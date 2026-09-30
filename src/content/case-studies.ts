import type { CaseStudy, SectionCopy } from "@/types";

export const caseStudiesSection: SectionCopy = {
  id: "projects",
  heading: "Proyek yang pernah kami kerjakan",
  sub: "Dari event korporat sampai konten kampus. Ini tantangan klien dan cara kami menjawabnya.",
};

export const caseStudyLabels = {
  challenge: "Tantangan",
  result: "Yang kami kerjakan",
};

/** Diringkas dari WeaveLens Creative Portfolio. Tambah proyek baru dengan format yang sama. */
export const caseStudies: CaseStudy[] = [
  {
    id: "malaysia-healthcare",
    client: "Malaysia Healthcare",
    project: "MHexpo",
    service: "Dokumentasi corporate",
    challenge: "Event resmi yang butuh liputan rapi, representatif, dan siap masuk press release.",
    result:
      "Foto utama dan rangkaian foto untuk media, sosial, dan arsip brand, dengan daftar momen kunci dari opening sampai closing.",
  },
  {
    id: "solusi-bangun-indonesia",
    client: "Solusi Bangun Indonesia",
    project: "Perayaan HUT ke-80 RI",
    service: "Konten Reels",
    challenge: "Merangkum perayaan internal jadi video singkat tanpa kehilangan suasananya.",
    result:
      "Reels 20–35 detik dengan hook di 2–3 detik pertama, dirilis di hari yang sama atau sehari setelahnya.",
  },
  {
    id: "catania",
    client: "Catania Premiere Cibubur",
    project: "Feed promo properti",
    service: "Desain Visual",
    challenge:
      "Info promo, sisa unit, dan harga harus tampil jelas tanpa membuat audiens kewalahan.",
    result:
      "Desain feed dengan hierarki informasi ketat dan tipografi tegas untuk mendorong kunjungan show unit selama periode promo.",
  },
  {
    id: "jgu",
    client: "Jakarta Global University",
    project: "Short movie kampus",
    service: "Video",
    challenge: "Menyampaikan pesan kampus secara emosional dalam durasi yang padat.",
    result:
      "Short movie dengan naskah ringkas, visual khas kampus, dan kombinasi dialog serta voice over.",
  },
];
