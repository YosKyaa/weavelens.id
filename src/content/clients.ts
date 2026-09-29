import type { Client } from "@/types";

export const clientsLabel = "Pernah bekerja sama dengan";

/**
 * Sumber: WeaveLens Creative Portfolio, halaman Selected Partners.
 * Logo disimpan di public/clients/. `logo: null` menampilkan nama sebagai teks.
 */
export const clients: Client[] = [
  { id: "malaysia-healthcare", name: "Malaysia Healthcare", logo: null },
  { id: "maybank", name: "Maybank", logo: null },
  { id: "bank-bjb", name: "bank bjb", logo: null },
  { id: "jgu", name: "Jakarta Global University", logo: null },
  { id: "sbi", name: "Solusi Bangun Indonesia", logo: null },
  { id: "sig", name: "SIG", logo: null },
  { id: "chiozz", name: "Chiozz", logo: null },
  { id: "catania", name: "Catania Premiere Cibubur", logo: null },
  { id: "multicomp", name: "MultiComp", logo: null },
  { id: "potret-indonesia", name: "Potret Indonesia", logo: null },
];
