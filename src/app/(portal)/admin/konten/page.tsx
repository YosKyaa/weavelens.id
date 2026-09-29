import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { portal } from "@/content/portal";
import { requireAdmin } from "@/lib/auth";
import { CMS_BASE, collections } from "@/lib/cms/collections";
import { cmsFrom } from "@/lib/cms/untyped";

/** Ringkasan konten landing page: jumlah item per koleksi. */
export default async function CmsHomePage() {
  const { supabase } = await requireAdmin();
  const counts = await Promise.all(
    collections.map(async (collection) => {
      if (collection.singleton) return null;
      const { count } = await cmsFrom(supabase, collection.table).select("id", {
        count: "exact",
        head: true,
      });
      return count ?? 0;
    }),
  );

  return (
    <>
      <p className="max-w-[60ch] text-ink/80">{portal.cms.intro}</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {collections.map((collection, index) => (
          <li key={collection.slug}>
            <Link
              href={`${CMS_BASE}/${collection.slug}`}
              className="group flex h-full flex-col rounded-2xl border border-line bg-paper p-5 transition-shadow hover:shadow-soft"
            >
              <span className="flex items-center justify-between">
                <span className="font-heading font-semibold text-ink">{collection.label}</span>
                <ArrowRight
                  aria-hidden
                  className="size-4 text-ink/60 transition-transform group-hover:translate-x-1"
                />
              </span>
              {counts[index] !== null && (
                <span className="mt-3 font-heading text-3xl font-bold text-primary">
                  {counts[index]}
                </span>
              )}
              <span className="mt-2 text-sm text-ink/70">{collection.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
