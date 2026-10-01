/** Pratinjau kecil versi terbaru sebuah konten (kartu kanban & daftar klien). Aman untuk client. */
export type DesignPreview =
  | { kind: "image"; url: string }
  | { kind: "video"; url: string }
  | { kind: "pdf" }
  | { kind: "drive"; url: string | null }
  | { kind: "none" };
