/**
 * Mengisi database CMS dengan konten bawaan dari src/content.
 *   npm run cms:seed            → hanya tabel yang masih kosong
 *   npm run cms:seed -- --force → timpa baris dengan id yang sama
 * Butuh NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { fallbackCms } from "@/lib/cms/fallback";
import { toRow } from "@/lib/cms/mappers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const force = process.argv.includes("--force");

if (!url || !serviceKey) {
  console.error("Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local dulu.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const tables: [string, Record<string, unknown>[]][] = [
  ["testimonials", fallbackCms.testimonials.map(toRow.testimonial)],
  ["services", fallbackCms.services.map(toRow.service)],
  ["pricing_plans", fallbackCms.pricingPlans.map(toRow.pricingPlan)],
  ["faqs", fallbackCms.faqs.map(toRow.faq)],
  ["portfolio_images", fallbackCms.portfolioImages.map(toRow.portfolioImage)],
  ["partners", fallbackCms.clients.map(toRow.client)],
  ["wa_admins", fallbackCms.admins.map(toRow.admin)],
  ["site_contact", [toRow.contact(fallbackCms.contact)]],
];

async function main() {
  let failed = false;
  for (const [table, rows] of tables) {
    if (rows.length === 0) {
      console.log(`– ${table}: tidak ada konten bawaan`);
      continue;
    }
    if (!force) {
      const { count, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true });
      if (error) {
        console.error(`✗ ${table}: ${error.message}`);
        failed = true;
        continue;
      }
      if (count) {
        console.log(`– ${table}: sudah berisi ${count} baris, dilewati`);
        continue;
      }
    }
    const { error } = await supabase.from(table).upsert(rows);
    if (error) {
      console.error(`✗ ${table}: ${error.message}`);
      failed = true;
    } else {
      console.log(`✓ ${table}: ${rows.length} baris`);
    }
  }
  return failed;
}

main().then((failed) => process.exit(failed ? 1 : 0));
