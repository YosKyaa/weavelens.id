/**
 * Konversi dua arah baris Supabase ⇄ tipe yang dipakai komponen halaman.
 * Dipakai loader publik (row → domain) dan skrip seed (domain → row).
 */
import type {
  Client,
  Faq,
  PortfolioCategory,
  PortfolioImage,
  PricingPlan,
  Service,
  SiteContact,
  Testimonial,
  WaAdmin,
  WaMessageKey,
} from "@/types";

type Row = Record<string, unknown>;

const str = (value: unknown) => (typeof value === "string" ? value : "");
const optional = (value: unknown) => (typeof value === "string" && value ? value : undefined);
const num = (value: unknown) => (typeof value === "number" ? value : 0);

export const rowTo = {
  testimonial: (row: Row): Testimonial => ({
    id: str(row.id),
    quote: str(row.quote),
    name: str(row.name),
    role: str(row.role),
    client: str(row.client),
    service: str(row.service),
  }),

  service: (row: Row): Service => {
    const available = row.status === "available";
    return {
      id: str(row.id),
      title: str(row.title),
      tagline: str(row.tagline),
      description: str(row.description),
      status: available ? "available" : "coming_soon",
      ctaLabel: available ? optional(row.cta_label) : undefined,
      waMessage: available ? (optional(row.wa_message) as WaMessageKey | undefined) : undefined,
      image:
        available && row.image_src
          ? {
              id: `${str(row.id)}-image`,
              src: str(row.image_src),
              alt: str(row.image_alt) || str(row.title),
              category: "event",
              width: num(row.image_width) || 1600,
              height: num(row.image_height) || 1067,
            }
          : undefined,
    };
  },

  pricingPlan: (row: Row): PricingPlan => ({
    id: str(row.id),
    name: str(row.name),
    price: str(row.price),
    features: Array.isArray(row.features) ? row.features.map(String) : [],
    ctaLabel: str(row.cta_label),
    waMessage: (optional(row.wa_message) ?? "general") as WaMessageKey,
  }),

  faq: (row: Row): Faq => ({
    id: str(row.id),
    question: str(row.question),
    answer: str(row.answer),
  }),

  portfolioImage: (row: Row): PortfolioImage => ({
    id: str(row.id),
    src: str(row.src) || null,
    alt: str(row.alt),
    category: str(row.category) as PortfolioCategory,
    client: optional(row.client),
    year: optional(row.year),
    width: num(row.width),
    height: num(row.height),
  }),

  client: (row: Row): Client => ({
    id: str(row.id),
    name: str(row.name),
    logo: optional(row.logo) ?? null,
  }),

  admin: (row: Row): WaAdmin => ({
    id: str(row.id),
    number: str(row.number),
    display: str(row.display),
  }),

  contact: (row: Row): SiteContact => ({
    instagramHandle: str(row.instagram_handle),
    instagramUrl: str(row.instagram_url),
    email: str(row.email),
    address: str(row.address),
    area: str(row.area),
    responseHours: str(row.response_hours),
  }),
};

export const toRow = {
  testimonial: (item: Testimonial, sort: number): Row => ({
    id: item.id,
    quote: item.quote,
    name: item.name,
    role: item.role || null,
    client: item.client || null,
    service: item.service || null,
    sort,
  }),

  service: (item: Service, sort: number): Row => ({
    id: item.id,
    title: item.title,
    tagline: item.tagline,
    description: item.description,
    status: item.status,
    cta_label: item.ctaLabel ?? null,
    wa_message: item.waMessage ?? null,
    image_src: item.image?.src ?? null,
    image_alt: item.image?.alt ?? null,
    image_width: item.image?.width ?? null,
    image_height: item.image?.height ?? null,
    sort,
  }),

  pricingPlan: (item: PricingPlan, sort: number): Row => ({
    id: item.id,
    name: item.name,
    price: item.price,
    features: item.features,
    cta_label: item.ctaLabel,
    wa_message: item.waMessage,
    sort,
  }),

  faq: (item: Faq, sort: number): Row => ({
    id: item.id,
    question: item.question,
    answer: item.answer,
    sort,
  }),

  portfolioImage: (item: PortfolioImage, sort: number): Row => ({
    id: item.id,
    src: item.src,
    alt: item.alt,
    category: item.category,
    client: item.client ?? null,
    year: item.year ?? null,
    width: item.width,
    height: item.height,
    sort,
  }),

  client: (item: Client, sort: number): Row => ({
    id: item.id,
    name: item.name,
    logo: item.logo,
    sort,
  }),

  admin: (item: WaAdmin, sort: number): Row => ({
    id: item.id,
    number: item.number,
    display: item.display,
    sort,
  }),

  contact: (item: SiteContact): Row => ({
    id: 1,
    instagram_handle: item.instagramHandle,
    instagram_url: item.instagramUrl,
    email: item.email,
    address: item.address,
    area: item.area,
    response_hours: item.responseHours,
  }),
};
