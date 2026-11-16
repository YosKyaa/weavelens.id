import { PageHeader } from "@/components/molecules/PageHeader";
import {
  BoothEventsManager,
  type BoothFrameOption,
  type BoothPackageView,
} from "@/components/organisms/booth/BoothEventsManager";
import { requirePermission } from "@/lib/auth";
import { isLayout, type Layout } from "@/lib/booth/frames";
import { readProfile, type OutputKind } from "@/lib/booth/profile";

export default async function BoothEventsPage() {
  const { supabase } = await requirePermission("booth");
  const [events, packages, frames] = await Promise.all([
    supabase.from("booth_events").select("id, name, active, profile").order("updated_at", { ascending: false }),
    supabase
      .from("booth_packages")
      .select("id, event_id, name, price, output, print_copies, layouts, active, sort")
      .order("sort"),
    supabase.from("booth_frames").select("id, name, layout").is("deleted_at", null).order("name"),
  ]);

  return (
    <>
      <PageHeader
        title="Event & paket"
        description="Satu event = satu profil booth (mode bayar, frame, alur, paket). Di tablet: Admin > Profil > Sinkronkan profil, lalu pilih event."
      />
      <BoothEventsManager
        events={(events.data ?? []).map((event) => ({
          id: event.id,
          name: event.name,
          active: event.active,
          profile: readProfile(event.profile),
        }))}
        packages={(packages.data ?? []).map(
          (pkg): BoothPackageView => ({
            id: pkg.id,
            eventId: pkg.event_id,
            name: pkg.name,
            price: pkg.price,
            output: pkg.output as OutputKind,
            printCopies: pkg.print_copies,
            layouts: pkg.layouts.filter(isLayout) as Layout[],
            active: pkg.active,
            sort: pkg.sort,
          }),
        )}
        frames={(frames.data ?? []).flatMap((frame): BoothFrameOption[] =>
          isLayout(frame.layout) ? [{ id: frame.id, name: frame.name, layout: frame.layout }] : [],
        )}
      />
    </>
  );
}
