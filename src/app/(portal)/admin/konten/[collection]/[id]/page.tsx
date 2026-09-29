import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AdminItemForm } from "@/components/organisms/AdminItemForm";
import { requireAdmin } from "@/lib/auth";
import { CMS_BASE, findCollection } from "@/lib/cms/collections";
import { cmsFrom } from "@/lib/cms/untyped";

type PageProps = { params: Promise<{ collection: string; id: string }> };

/** Segmen URL untuk item baru, mis. /admin/konten/testimoni/baru. */
const NEW_ID = "baru";

export default async function ItemPage({ params }: PageProps) {
  const { collection: slug, id: rawId } = await params;
  const collection = findCollection(slug);
  if (!collection || collection.singleton) notFound();
  const { supabase } = await requireAdmin();

  const id = decodeURIComponent(rawId);
  const isNew = id === NEW_ID;
  let row: Record<string, unknown> = {};

  if (!isNew) {
    const { data } = await cmsFrom(supabase, collection.table)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!data) notFound();
    row = data;
  }

  return (
    <>
      <Link
        href={`${CMS_BASE}/${collection.slug}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-ink/80 hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {collection.label}
      </Link>
      <h2 className="mt-3 text-2xl">
        {isNew ? `Tambah ${collection.singular}` : `Edit ${collection.singular}`}
      </h2>
      <div className="mt-8 rounded-2xl border border-line bg-paper p-6 md:p-8">
        <AdminItemForm slug={collection.slug} id={isNew ? null : id} row={row} />
      </div>
    </>
  );
}
