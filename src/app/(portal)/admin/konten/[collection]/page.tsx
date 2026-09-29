import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { AdminCollectionTable } from "@/components/organisms/AdminCollectionTable";
import { AdminItemForm } from "@/components/organisms/AdminItemForm";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { CMS_BASE, findCollection } from "@/lib/cms/collections";
import { cmsFrom } from "@/lib/cms/untyped";

type PageProps = { params: Promise<{ collection: string }> };

export default async function CollectionPage({ params }: PageProps) {
  const { collection: slug } = await params;
  const collection = findCollection(slug);
  if (!collection) notFound();
  const { supabase } = await requireAdmin();

  const query = cmsFrom(supabase, collection.table).select("*");
  const { data, error } = collection.singleton
    ? await query.eq("id", 1)
    : await query.order("sort").order("id");
  const rows: Record<string, unknown>[] = data ?? [];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl">{collection.label}</h2>
          <p className="mt-2 max-w-[65ch] text-ink/80">{collection.description}</p>
        </div>
        {!collection.singleton && (
          <Button asChild size="lg">
            <Link href={`${CMS_BASE}/${collection.slug}/baru`}>
              <Plus aria-hidden />
              Tambah {collection.singular}
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-8">
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
          >
            Data tidak bisa dimuat. Pastikan migrasi database sudah dijalankan (lihat README).
          </p>
        ) : collection.singleton ? (
          <div className="rounded-2xl border border-line bg-paper p-6 md:p-8">
            <AdminItemForm slug={collection.slug} id="1" row={rows[0] ?? {}} />
          </div>
        ) : (
          <AdminCollectionTable collection={collection} rows={rows} />
        )}
      </div>
    </>
  );
}
