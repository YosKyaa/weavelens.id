/**
 * Halaman weavelens.id/bio: satu link untuk bio Instagram (pengganti Linktree).
 * Urutan disusun dari yang paling sering dibutuhkan calon klien: jadwal → hasil → harga.
 * Nomor admin, kontak, harga, dan foto diambil dari CMS, jadi tidak perlu diubah di sini.
 */

/** Ditempel di link ke halaman utama supaya kunjungan dari bio terbaca di analytics. */
const fromBio = "?utm_source=instagram&utm_medium=bio";

export type BioLink = {
  id: string;
  href: string;
  title: string;
  sub: string;
  icon: "images" | "tag" | "sparkles" | "portal" | "mail";
  external?: boolean;
};

export const bio = {
  meta: {
    title: "WeaveLens — Link bio",
    description:
      "Cek jadwal via WhatsApp, lihat portofolio, dan daftar harga dokumentasi foto, video, dan Reels WeaveLens di Jakarta.",
  },

  intro: "Dokumentasi foto, video & konten Reels",

  /** Tombol utama; di bawahnya tampil jam balas admin dari CMS. */
  primaryLabel: "Cek jadwal & tanya harga",

  photosLabel: "Lihat portofolio lengkap",

  links: (priceFrom: string | null): BioLink[] => [
    {
      id: "portofolio",
      href: `/${fromBio}#portofolio`,
      title: "Lihat hasil kerja kami",
      sub: "Wisuda, acara kantor, dan event",
      icon: "images",
    },
    {
      id: "harga",
      href: `/${fromBio}#harga`,
      title: "Daftar harga",
      sub: priceFrom
        ? `Mulai dari ${priceFrom} · harga jelas sejak awal`
        : "Harga jelas sejak awal",
      icon: "tag",
    },
    {
      id: "layanan",
      href: `/${fromBio}#layanan`,
      title: "Layanan kami",
      sub: "Foto · Video highlight · Reels · Desain",
      icon: "sparkles",
    },
    {
      id: "portal",
      href: "/login",
      title: "Portal klien",
      sub: "Sudah jadi klien? Pantau proyek dan pilih foto di sini",
      icon: "portal",
    },
  ],

  emailTitle: "Kirim email",

  footer: "weavelens.id",
};
