import { clients } from "@/content/clients";
import { faqs } from "@/content/faq";
import { portfolioImages } from "@/content/portfolio";
import { pricingPlans } from "@/content/pricing";
import { services } from "@/content/services";
import { site } from "@/content/site";
import { testimonials } from "@/content/testimonials";
import type { CmsData } from "@/types";

/**
 * Konten bawaan dari src/content. Dipakai saat Supabase belum dikonfigurasi atau gagal diakses,
 * dan sebagai isi awal database (npm run cms:seed).
 */
export const fallbackCms: CmsData = {
  testimonials,
  services,
  pricingPlans,
  faqs,
  portfolioImages,
  clients,
  admins: [...site.wa.admins],
  contact: { ...site.contact },
};
