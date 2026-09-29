/** Kunci pesan WhatsApp yang terisi otomatis. Teksnya ada di content/site.ts. */
export type WaMessageKey = "general" | "photo" | "photoVideo" | "video" | "reels" | "design";

/** Asal klik CTA, dikirim ke Vercel Analytics. */
export type CtaSection =
  | "header"
  | "hero"
  | "services"
  | "pricing"
  | "final-cta"
  | "footer"
  | "sticky"
  | "not-found"
  | "bio";

/** Admin WhatsApp. `number` format internasional tanpa "+", mis. 6281234567890. */
export type WaAdmin = {
  id: string;
  number: string;
  /** Nomor untuk ditampilkan, mis. "+62 821-1218-7810". */
  display: string;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
};

export type NavItem = {
  label: string;
  href: `#${string}`;
};

export type SectionCopy = {
  id: string;
  heading: string;
  sub?: string;
};

export type ServiceStatus = "available" | "coming_soon";

export type Service = {
  id: string;
  title: string;
  description: string;
  status: ServiceStatus;
  /** Satu baris pengait di bawah judul kartu. */
  tagline: string;
  /** Hanya untuk layanan tersedia. Harga sengaja tidak ditulis di sini: cukup sekali di section Harga. */
  ctaLabel?: string;
  waMessage?: WaMessageKey;
  /** Foto kartu (hanya layanan tersedia). */
  image?: PortfolioImage;
};

export type PricingPlan = {
  id: string;
  name: string;
  price: string;
  features: string[];
  ctaLabel: string;
  waMessage: WaMessageKey;
};

export type PortfolioCategory = "wisuda" | "corporate" | "event";

export type PortfolioFilter = {
  value: PortfolioCategory | "semua";
  label: string;
};

export type PortfolioImage = {
  id: string;
  /** Path di /public. `null` = belum ada foto, tampil placeholder abu. */
  src: string | null;
  alt: string;
  category: PortfolioCategory;
  /** Opsional: tampil di keterangan galeri jika diisi. */
  client?: string;
  year?: string;
  width: number;
  height: number;
};

/** Testimoni asli dari klien. */
export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  client: string;
  service: string;
};

/** Studi kasus singkat: bukti sosial dari proyek nyata (bukan testimoni karangan). */
export type CaseStudy = {
  id: string;
  client: string;
  project: string;
  service: string;
  challenge: string;
  result: string;
};

export type Client = {
  id: string;
  name: string;
  /** Path logo di /public. `null` = tampil nama sebagai teks. */
  logo: string | null;
};

export type Step = {
  id: string;
  title: string;
  description: string;
};

/** Kontak studio yang bisa diubah dari CMS. */
export type SiteContact = {
  instagramHandle: string;
  instagramUrl: string;
  email: string;
  address: string;
  area: string;
  responseHours: string;
};

/** Semua konten yang dikelola lewat admin CMS. */
export type CmsData = {
  testimonials: Testimonial[];
  services: Service[];
  pricingPlans: PricingPlan[];
  faqs: Faq[];
  portfolioImages: PortfolioImage[];
  clients: Client[];
  admins: WaAdmin[];
  contact: SiteContact;
};
