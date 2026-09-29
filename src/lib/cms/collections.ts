/**
 * Definisi koleksi CMS: satu sumber untuk form admin, validasi, dan tabel daftar.
 * Nama field = nama kolom di Supabase (lihat supabase/migrations/0001_cms.sql).
 * Modul ini murni data, jadi aman diimpor dari komponen client maupun server.
 */

/** Lokasi CMS di dalam portal admin. */
export const CMS_BASE = "/admin/konten";

export type SelectOption = { value: string; label: string };

type FieldBase = {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  /** Wajib hanya jika field lain bernilai tertentu, mis. layanan berstatus "available". */
  requiredWhen?: { field: string; equals: string };
};

export type CmsField =
  | (FieldBase & {
      type: "text";
      maxLength?: number;
      placeholder?: string;
      pattern?: { regex: string; message: string };
    })
  | (FieldBase & { type: "textarea"; maxLength?: number; rows?: number })
  | (FieldBase & { type: "select"; options: SelectOption[] })
  /** Satu baris = satu item (disimpan sebagai text[]). */
  | (FieldBase & { type: "list" })
  /** Unggah foto. Lebar/tinggi disimpan ke kolom terpisah jika disebutkan. */
  | (FieldBase & { type: "image"; folder: string; widthName?: string; heightName?: string });

export type CmsCollection = {
  /** Segmen URL admin, mis. /admin/testimoni. */
  slug: string;
  table: string;
  label: string;
  /** Kata benda tunggal untuk tombol, mis. "Tambah testimoni". */
  singular: string;
  description: string;
  /** Kolom yang tampil sebagai judul dan keterangan di tabel daftar. */
  titleField: string;
  subtitleField?: string;
  /** Kolom foto untuk thumbnail di tabel daftar. */
  imageField?: string;
  fields: CmsField[];
  /** Satu baris saja (id = 1), tanpa tambah/hapus/urutkan. */
  singleton?: boolean;
};

const waMessageOptions: SelectOption[] = [
  { value: "general", label: "Umum (cek jadwal)" },
  { value: "photo", label: "Dokumentasi Foto" },
  { value: "photoVideo", label: "Foto + Video Highlight" },
  { value: "video", label: "Video Highlight" },
  { value: "reels", label: "Konten Reels" },
  { value: "design", label: "Desain Visual" },
];

const serviceOptions: SelectOption[] = [
  { value: "Dokumentasi Foto", label: "Dokumentasi Foto" },
  { value: "Video Highlight", label: "Video Highlight" },
  { value: "Konten Reels", label: "Konten Reels" },
  { value: "Desain Visual", label: "Desain Visual" },
];

const whenAvailable = { field: "status", equals: "available" };

export const collections: CmsCollection[] = [
  {
    slug: "testimoni",
    table: "testimonials",
    label: "Testimoni",
    singular: "testimoni",
    description:
      "Kutipan asli klien, dengan izin mereka. Begitu ada satu testimoni tampil, section studi kasus diganti testimoni.",
    titleField: "name",
    subtitleField: "client",
    fields: [
      {
        name: "quote",
        label: "Kutipan",
        type: "textarea",
        required: true,
        maxLength: 400,
        rows: 4,
        hint: "Tulis persis seperti yang klien sampaikan. Idealnya di bawah 40 kata.",
      },
      { name: "name", label: "Nama klien", type: "text", required: true, maxLength: 80 },
      {
        name: "role",
        label: "Jabatan / peran",
        type: "text",
        maxLength: 80,
        placeholder: "Ketua Panitia Wisuda",
      },
      {
        name: "client",
        label: "Institusi / perusahaan",
        type: "text",
        maxLength: 100,
        placeholder: "Jakarta Global University",
      },
      { name: "service", label: "Layanan", type: "select", options: serviceOptions },
    ],
  },
  {
    slug: "galeri",
    table: "portfolio_images",
    label: "Galeri",
    singular: "foto",
    description:
      "Foto di section portofolio dan pita film. Foto pertama tampil paling besar di galeri.",
    titleField: "alt",
    subtitleField: "category",
    imageField: "src",
    fields: [
      {
        name: "src",
        label: "Foto",
        type: "image",
        folder: "portfolio",
        widthName: "width",
        heightName: "height",
        required: true,
        hint: "JPG/PNG/WebP. Otomatis dikecilkan ke maks. 1600px dan dikonversi ke WebP.",
      },
      {
        name: "alt",
        label: "Deskripsi foto",
        type: "text",
        required: true,
        maxLength: 160,
        hint: "Untuk pembaca layar dan Google. Jelaskan isi foto, mis. “Wisudawan melompat di lobi”.",
      },
      {
        name: "category",
        label: "Kategori",
        type: "select",
        required: true,
        options: [
          { value: "wisuda", label: "Wisuda" },
          { value: "corporate", label: "Corporate" },
          { value: "event", label: "Event" },
        ],
      },
      { name: "client", label: "Klien", type: "text", maxLength: 100 },
      {
        name: "year",
        label: "Tahun",
        type: "text",
        placeholder: "2025",
        pattern: { regex: "^\\d{4}$", message: "Isi 4 digit tahun, mis. 2025." },
      },
    ],
  },
  {
    slug: "layanan",
    table: "services",
    label: "Layanan",
    singular: "layanan",
    description:
      "Kartu layanan. Layanan tersedia pertama tampil besar. Status “Segera hadir” tampil tanpa tombol dan foto.",
    titleField: "title",
    subtitleField: "tagline",
    imageField: "image_src",
    fields: [
      {
        name: "title",
        label: "Nama layanan",
        type: "text",
        required: true,
        maxLength: 40,
        hint: "Kata pertama tampil kecil miring, sisanya besar. Mis. “Dokumentasi Foto”.",
      },
      { name: "tagline", label: "Tagline", type: "text", required: true, maxLength: 80 },
      {
        name: "description",
        label: "Deskripsi",
        type: "textarea",
        required: true,
        maxLength: 300,
        rows: 3,
        hint: "Jangan tulis harga di sini; harga cukup sekali di section Harga.",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { value: "available", label: "Tersedia" },
          { value: "coming_soon", label: "Segera hadir" },
        ],
      },
      {
        name: "cta_label",
        label: "Label tombol WhatsApp",
        type: "text",
        maxLength: 40,
        placeholder: "Tanya foto",
        requiredWhen: whenAvailable,
      },
      {
        name: "wa_message",
        label: "Pesan WhatsApp otomatis",
        type: "select",
        options: waMessageOptions,
        requiredWhen: whenAvailable,
      },
      {
        name: "image_src",
        label: "Foto kartu",
        type: "image",
        folder: "layanan",
        widthName: "image_width",
        heightName: "image_height",
        requiredWhen: whenAvailable,
      },
      { name: "image_alt", label: "Deskripsi foto", type: "text", maxLength: 160 },
    ],
  },
  {
    slug: "harga",
    table: "pricing_plans",
    label: "Harga",
    singular: "paket",
    description: "Paket di section Harga. Harga hanya ditulis di sini, tidak di kartu layanan.",
    titleField: "name",
    subtitleField: "price",
    fields: [
      { name: "name", label: "Nama paket", type: "text", required: true, maxLength: 60 },
      {
        name: "price",
        label: "Harga mulai",
        type: "text",
        required: true,
        maxLength: 20,
        placeholder: "450 ribu",
        hint: "Tanpa “Rp” dan “Mulai dari”; keduanya ditambahkan otomatis.",
      },
      {
        name: "features",
        label: "Isi paket",
        type: "list",
        required: true,
        hint: "Satu baris untuk satu poin.",
      },
      { name: "cta_label", label: "Label tombol", type: "text", required: true, maxLength: 40 },
      {
        name: "wa_message",
        label: "Pesan WhatsApp otomatis",
        type: "select",
        required: true,
        options: waMessageOptions,
      },
    ],
  },
  {
    slug: "faq",
    table: "faqs",
    label: "FAQ",
    singular: "pertanyaan",
    description: "Pertanyaan pertama otomatis terbuka di halaman.",
    titleField: "question",
    fields: [
      { name: "question", label: "Pertanyaan", type: "text", required: true, maxLength: 120 },
      {
        name: "answer",
        label: "Jawaban",
        type: "textarea",
        required: true,
        maxLength: 500,
        rows: 4,
      },
    ],
  },
  {
    slug: "klien",
    table: "partners",
    label: "Klien",
    singular: "klien",
    description: "Nama di pita “Pernah bekerja sama dengan”. Tanpa logo, nama tampil sebagai teks.",
    titleField: "name",
    imageField: "logo",
    fields: [
      { name: "name", label: "Nama klien", type: "text", required: true, maxLength: 60 },
      {
        name: "logo",
        label: "Logo (opsional)",
        type: "image",
        folder: "klien",
        hint: "PNG/SVG berlatar transparan. Tampil abu-abu di halaman.",
      },
    ],
  },
  {
    slug: "admin-wa",
    table: "wa_admins",
    label: "Admin WhatsApp",
    singular: "admin",
    description:
      "Nomor tujuan semua tombol WhatsApp. Tampil sebagai “Admin 1”, “Admin 2”, dst. sesuai urutan.",
    titleField: "display",
    fields: [
      {
        name: "number",
        label: "Nomor WhatsApp",
        type: "text",
        required: true,
        placeholder: "6282112187810",
        pattern: {
          regex: "^62\\d{8,13}$",
          message: "Awali dengan 62, tanpa “+”, spasi, atau tanda hubung.",
        },
      },
      {
        name: "display",
        label: "Nomor untuk ditampilkan",
        type: "text",
        required: true,
        maxLength: 24,
        placeholder: "+62 821-1218-7810",
      },
    ],
  },
  {
    slug: "kontak",
    table: "site_contact",
    label: "Kontak",
    singular: "kontak",
    description: "Info di footer.",
    titleField: "email",
    singleton: true,
    fields: [
      { name: "address", label: "Domisili", type: "text", required: true, maxLength: 80 },
      { name: "area", label: "Area layanan", type: "text", required: true, maxLength: 80 },
      {
        name: "response_hours",
        label: "Jam balas admin",
        type: "text",
        required: true,
        maxLength: 80,
      },
      {
        name: "instagram_handle",
        label: "Username Instagram",
        type: "text",
        required: true,
        placeholder: "@weavelens",
        pattern: { regex: "^@[A-Za-z0-9._]{1,30}$", message: "Awali dengan @, mis. @weavelens." },
      },
      {
        name: "instagram_url",
        label: "Link Instagram",
        type: "text",
        required: true,
        pattern: { regex: "^https://", message: "Link harus diawali https://" },
      },
      {
        name: "email",
        label: "Email",
        type: "text",
        required: true,
        pattern: { regex: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", message: "Format email tidak valid." },
      },
    ],
  },
];

export function findCollection(slug: string): CmsCollection | undefined {
  return collections.find((collection) => collection.slug === slug);
}

/** Label pilihan untuk ditampilkan di tabel, mis. "corporate" → "Corporate". */
export function displayValue(collection: CmsCollection, field: string, value: unknown): string {
  const def = collection.fields.find((item) => item.name === field);
  if (def?.type === "select") {
    return def.options.find((option) => option.value === value)?.label ?? String(value ?? "");
  }
  return value == null ? "" : String(value);
}
