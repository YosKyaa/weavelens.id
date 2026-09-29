import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { fallbackCms } from "@/lib/cms/fallback";
import { rowTo } from "@/lib/cms/mappers";
import { cmsFrom } from "@/lib/cms/untyped";
import { createPublicClient } from "@/lib/supabase/public";
import type { CmsData } from "@/types";

/** Tag cache konten. Setiap simpan di admin memanggil revalidateTag(CMS_TAG). */
export const CMS_TAG = "cms";

type Result = { data: Record<string, unknown>[] | null; error: { message: string } | null };

function listOr<T>(
  result: Result,
  map: (row: Record<string, unknown>) => T,
  fallback: T[],
  table: string,
): T[] {
  if (result.error || !result.data) {
    console.error(`[cms] Gagal membaca ${table}, memakai konten bawaan:`, result.error?.message);
    return fallback;
  }
  return result.data.map(map);
}

async function load(): Promise<CmsData> {
  const supabase = createPublicClient();
  if (!supabase) return fallbackCms;

  const list = (table: string) =>
    cmsFrom(supabase, table).select("*").eq("visible", true).order("sort").order("id");

  const [testimonials, services, plans, faqs, images, clients, admins, contact] = await Promise.all(
    [
      list("testimonials"),
      list("services"),
      list("pricing_plans"),
      list("faqs"),
      list("portfolio_images"),
      list("partners"),
      list("wa_admins"),
      supabase.from("site_contact").select("*").eq("id", 1).maybeSingle(),
    ],
  );

  const adminList = listOr(admins, rowTo.admin, fallbackCms.admins, "wa_admins");

  return {
    testimonials: listOr(testimonials, rowTo.testimonial, fallbackCms.testimonials, "testimonials"),
    services: listOr(services, rowTo.service, fallbackCms.services, "services"),
    pricingPlans: listOr(plans, rowTo.pricingPlan, fallbackCms.pricingPlans, "pricing_plans"),
    faqs: listOr(faqs, rowTo.faq, fallbackCms.faqs, "faqs"),
    portfolioImages: listOr(
      images,
      rowTo.portfolioImage,
      fallbackCms.portfolioImages,
      "portfolio_images",
    ),
    clients: listOr(clients, rowTo.client, fallbackCms.clients, "partners"),
    // Tombol WhatsApp tidak boleh mati: tanpa admin aktif, pakai nomor bawaan.
    admins: adminList.length > 0 ? adminList : fallbackCms.admins,
    contact: contact.data ? rowTo.contact(contact.data) : fallbackCms.contact,
  };
}

const loadCached = unstable_cache(load, ["cms-content"], { tags: [CMS_TAG], revalidate: 3600 });

/** Konten halaman. Di-cache lintas request, di-dedupe per render. */
export const getCms = cache(() => loadCached());
