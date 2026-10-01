import { caseStudies } from "@/content/case-studies";
import { pricePrefix, pricingNote } from "@/content/pricing";
import { site } from "@/content/site";
import type { CmsData } from "@/types";

/**
 * Data terstruktur (schema.org) dan ringkasan llms.txt untuk mesin pencari & asisten AI
 * (Google, ChatGPT, Perplexity, Gemini, Claude). Semua diambil dari konten CMS yang sama
 * dengan halaman, jadi fakta yang dikutip AI selalu sama dengan yang tampil.
 */

const AREA = ["Jakarta", "Bogor", "Depok", "Tangerang", "Bekasi"];

/** "450 ribu" → 450000, "1 juta" → 1000000, "1,5 juta" → 1500000. `null` bila tidak terbaca. */
export function parsePriceIdr(price: string): number | null {
  const match = price
    .toLowerCase()
    .replace(/rp\.?/g, "")
    .trim()
    .match(/^([\d.,]+)\s*(ribu|rb|k|juta|jt)?$/);
  if (!match) return null;
  const unit = match[2];
  // Dengan satuan: koma = desimal. Tanpa satuan: titik/koma = pemisah ribuan.
  const number = unit
    ? Number.parseFloat(match[1].replace(/\./g, "").replace(",", "."))
    : Number.parseInt(match[1].replace(/[.,]/g, ""), 10);
  if (!Number.isFinite(number)) return null;
  const factor = unit === "juta" || unit === "jt" ? 1_000_000 : unit ? 1_000 : 1;
  return Math.round(number * factor);
}

function rupiah(value: number): string {
  return `Rp${new Intl.NumberFormat("id-ID").format(value)}`;
}

export function landingJsonLd(cms: CmsData) {
  const url = site.url;
  const businessId = `${url}/#business`;
  const services = cms.services.filter((service) => service.status === "available");
  const prices = cms.pricingPlans
    .map((plan) => parsePriceIdr(plan.price))
    .filter((value): value is number => value !== null);

  const business = {
    "@type": ["ProfessionalService", "LocalBusiness"],
    "@id": businessId,
    name: site.name,
    slogan: site.tagline,
    description: site.meta.description,
    url,
    logo: `${url}/icon.png`,
    image: [`${url}/opengraph-image`, `${url}/portfolio/hero-wisuda.webp`],
    email: cms.contact.email,
    telephone: cms.admins[0] ? `+${cms.admins[0].number}` : undefined,
    priceRange: prices.length ? `${pricePrefix} ${rupiah(Math.min(...prices))}` : undefined,
    currenciesAccepted: "IDR",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Jakarta",
      addressRegion: "DKI Jakarta",
      addressCountry: "ID",
    },
    areaServed: [
      { "@type": "AdministrativeArea", name: "Jabodetabek" },
      ...AREA.map((name) => ({ "@type": "City", name })),
    ],
    sameAs: [cms.contact.instagramUrl],
    contactPoint: cms.admins.map((admin) => ({
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: `+${admin.number}`,
      availableLanguage: ["id", "en"],
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "21:00",
      },
    })),
    knowsAbout: [
      "Dokumentasi wisuda",
      "Dokumentasi acara kantor",
      "Dokumentasi seminar",
      "Video highlight acara",
      "Konten Reels Instagram dan TikTok",
      "Desain visual acara",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Layanan WeaveLens",
      itemListElement: [
        ...cms.pricingPlans.map((plan) => {
          const price = parsePriceIdr(plan.price);
          return {
            "@type": "Offer",
            name: plan.name,
            description: `${plan.features.join(". ")}. ${pricingNote}`,
            priceCurrency: "IDR",
            ...(price !== null && {
              price,
              priceSpecification: {
                "@type": "PriceSpecification",
                minPrice: price,
                priceCurrency: "IDR",
              },
            }),
            areaServed: "Jabodetabek",
            itemOffered: { "@type": "Service", name: plan.name, provider: { "@id": businessId } },
          };
        }),
        ...services
          .filter((service) => !cms.pricingPlans.some((plan) => plan.name === service.title))
          .map((service) => ({
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: service.title,
              description: service.description,
              provider: { "@id": businessId },
            },
          })),
      ],
    },
  };

  const website = {
    "@type": "WebSite",
    "@id": `${url}/#website`,
    url,
    name: site.name,
    inLanguage: "id-ID",
    publisher: { "@id": businessId },
  };

  const faq = {
    "@type": "FAQPage",
    "@id": `${url}/#faq`,
    inLanguage: "id-ID",
    mainEntity: cms.faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return { "@context": "https://schema.org", "@graph": [business, website, faq] };
}

/** Ringkasan Markdown untuk /llms.txt (format llmstxt.org). */
export function llmsText(cms: CmsData): string {
  const url = site.url;
  const services = cms.services.filter((service) => service.status === "available");
  const soon = cms.services.filter((service) => service.status !== "available");
  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.name} adalah jasa dokumentasi foto, video highlight, produksi konten Reels, dan desain visual untuk wisuda, seminar, gathering, dan acara kantor. Berbasis di Jakarta dan melayani seluruh Jabodetabek. Pemesanan lewat WhatsApp.`,
    "",
    "## Fakta singkat",
    "",
    `- Lokasi: ${cms.contact.address}. ${cms.contact.area}.`,
    "- Jenis acara: wisuda, seminar, gathering, acara kantor, event korporat, konten kampus dan brand.",
    "- Waktu pengerjaan: foto dalam 3 hari kerja; foto + video highlight dalam 5 hari kerja.",
    "- Hasil dikirim lewat Google Drive, termasuk semua file mentah.",
    `- ${cms.contact.responseHours}.`,
    "",
    "## Layanan",
    "",
    ...services.map((service) => `- **${service.title}**: ${service.description}`),
    ...soon.map((service) => `- **${service.title}** (segera hadir): ${service.description}`),
    "",
    "## Harga",
    "",
    ...cms.pricingPlans.map(
      (plan) =>
        `- **${plan.name}**: ${pricePrefix.toLowerCase()} ${plan.price}. ${plan.features.join("; ")}.`,
    ),
    `- ${pricingNote} Harga akhir menyesuaikan durasi dan jumlah tim; penawaran dikirim lewat WhatsApp.`,
    "",
    "## Pertanyaan umum",
    "",
    ...cms.faqs.flatMap((item) => [`### ${item.question}`, "", item.answer, ""]),
    "## Klien & proyek",
    "",
    `Pernah bekerja sama dengan: ${cms.clients.map((client) => client.name).join(", ")}.`,
    "",
    ...caseStudies.map(
      (study) => `- **${study.client}** (${study.project}, ${study.service}): ${study.result}`,
    ),
    ...(cms.testimonials.length
      ? [
          "",
          "## Testimoni",
          "",
          ...cms.testimonials.map(
            (item) => `- "${item.quote}" (${item.name}, ${item.role}, ${item.client})`,
          ),
        ]
      : []),
    "",
    "## Kontak",
    "",
    ...cms.admins.map(
      (admin, index) =>
        `- WhatsApp admin ${index + 1}: ${admin.display} (https://wa.me/${admin.number})`,
    ),
    `- Email: ${cms.contact.email}`,
    `- Instagram: ${cms.contact.instagramHandle} (${cms.contact.instagramUrl})`,
    "",
    "## Halaman",
    "",
    `- [Beranda](${url}/): layanan, portofolio, harga, dan FAQ`,
    `- [Link bio](${url}/bio): semua link WeaveLens dalam satu halaman`,
    "",
  ];
  return lines.join("\n");
}
