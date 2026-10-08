import { notFound } from "next/navigation";
import { FormSection } from "@/components/molecules/FormSection";
import { PageHeader } from "@/components/molecules/PageHeader";
import { BrandFiles } from "@/components/organisms/BrandFiles";
import { BrandKitForm } from "@/components/organisms/BrandKitForm";
import { requirePermission } from "@/lib/auth";
import { loadBrandKits } from "@/lib/brand-kit";
import { isId } from "@/lib/ids";

type PageProps = { params: Promise<{ id: string; brandId: string }> };

/** Brand kit: bahan kerja desainer & penulis caption untuk satu brand. */
export default async function BrandKitPage({ params }: PageProps) {
  const { id, brandId } = await params;
  if (!isId(id) || !isId(brandId)) notFound();
  const { supabase } = await requirePermission("clients");
  const [{ data: client }, [kit]] = await Promise.all([
    supabase.from("clients").select("id, name").eq("id", id).maybeSingle(),
    loadBrandKits(supabase, [brandId]),
  ]);
  if (!client || !kit) notFound();

  return (
    <>
      <PageHeader
        title={`Brand kit ${kit.name}`}
        icon={
          <span
            aria-hidden
            className="size-10 shrink-0 rounded-full border border-line"
            style={{ backgroundColor: kit.color }}
          />
        }
        description="Tampil untuk semua tim di papan proyek brand ini. Gaya bahasa dipakai asisten caption AI."
        back={{ href: `/admin/clients/${id}`, label: client.name }}
      />
      <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
        <FormSection title="Panduan">
          <BrandKitForm
            clientId={id}
            brandId={brandId}
            initial={{
              guideline: kit.guideline ?? "",
              voice: kit.voice ?? "",
              palette: kit.palette,
              fonts: kit.fonts ?? "",
              assetUrl: kit.assetUrl ?? "",
            }}
          />
        </FormSection>
        <FormSection title="File aset">
          <BrandFiles clientId={id} brandId={brandId} files={kit.files} />
        </FormSection>
      </div>
    </>
  );
}
