import type { SectionCopy, Testimonial } from "@/types";

/** Tanda kutip dekoratif di pojok kartu. */
export const quoteMark = "\u201C";

export const testimonialsSection: SectionCopy = {
  id: "testimoni",
  heading: "Kata klien kami",
  sub: "Cerita langsung dari klien yang pernah bekerja sama dengan WeaveLens.",
};

/**
 * Isi HANYA dengan kutipan asli dari klien (mis. dari chat WhatsApp atau email),
 * dengan izin mereka. Maksimal ±40 kata per kutipan.
 *
 * Selama daftar ini kosong, halaman menampilkan section "Proyek yang pernah kami kerjakan".
 * Begitu ada minimal satu testimoni, section testimoni otomatis menggantikannya.
 *
 * Contoh format:
 * {
 *   id: "jgu-wisuda",
 *   quote: "Tulis kutipan asli klien di sini.",
 *   name: "Nama klien",
 *   role: "Jabatan / peran",
 *   client: "Institusi atau perusahaan",
 *   service: "Dokumentasi Foto",
 * },
 */
export const testimonials: Testimonial[] = [];
