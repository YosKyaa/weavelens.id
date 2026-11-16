import { PageHeader } from "@/components/molecules/PageHeader";
import { BoothFrameStudio } from "@/components/organisms/booth/BoothFrameStudio";
import { requirePermission } from "@/lib/auth";
import { isLayout, type FrameRow } from "@/lib/booth/frames";

export default async function BoothFramesPage() {
  const { supabase } = await requirePermission("booth");
  const { data } = await supabase
    .from("booth_frames")
    .select("id, name, layout, version, canvas_w, canvas_h, slots, print, png_path, active_from, active_to, deleted_at, qr")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  const frames = (data ?? []).filter((frame) => isLayout(frame.layout)) as unknown as FrameRow[];
  const publicBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/frames`;

  return (
    <>
      <PageHeader
        title="Frame"
        description="PNG frame dengan area foto transparan. Aturan ukuran dan slot sama dengan tablet; frame yang ditolak validasi tidak bisa disimpan."
      />
      <BoothFrameStudio frames={frames} publicBase={publicBase} />
    </>
  );
}
