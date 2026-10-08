import { redirect } from "next/navigation";
import { setPublishDate } from "@/app/(portal)/admin/projects/actions";
import { ViewSwitch } from "@/components/molecules/ViewSwitch";
import { BrandKitPanel } from "@/components/organisms/BrandKitPanel";
import { ContentBoard } from "@/components/organisms/ContentBoard";
import { ContentCalendar } from "@/components/organisms/ContentCalendar";
import { can, requireStaff } from "@/lib/auth";
import { hasKit, loadBrandKits } from "@/lib/brand-kit";
import { loadBoard, toCalendarItems } from "@/lib/board-data";
import { isMonth, shiftMonth } from "@/lib/calendar";
import { todayJakarta } from "@/lib/format";
import { loadStaffOptions } from "@/lib/team-data";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; month?: string }>;
};

/** Papan konten (kanban) atau kalender tayang. Proyek foto/video langsung dibuka di tab galeri. */
export default async function ProjectBoardPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { view, month: monthParam } = await searchParams;
  const session = await requireStaff();
  const { supabase, user } = session;

  const { data: project } = await supabase
    .from("projects")
    .select("type, client_id, brand_id")
    .eq("id", id)
    .single();
  if (project && (project.type === "photo" || project.type === "video")) {
    redirect(`/admin/projects/${id}/galleries`);
  }

  const [items, { data: clientBrands }, people] = await Promise.all([
    loadBoard(supabase, id),
    supabase
      .from("brands")
      .select("id, name, color")
      .eq("client_id", project?.client_id ?? "")
      .order("sort"),
    loadStaffOptions(supabase),
  ]);
  // Proyek khusus satu brand: hanya brand itu yang relevan.
  const brandLocked = Boolean(project?.brand_id);
  const brands = (clientBrands ?? []).filter(
    (brand) => !brandLocked || brand.id === project?.brand_id,
  );
  const kits = (
    await loadBrandKits(
      supabase,
      brands.map((brand) => brand.id),
    )
  ).filter(hasKit);
  const canManageBrands = can(session, "clients");

  const base = `/admin/projects/${id}`;
  const calendar = view === "calendar";
  const month = isMonth(monthParam) ? monthParam : todayJakarta().slice(0, 7);
  const monthHref = (value: string) => `${base}?view=calendar&month=${value}`;

  return (
    <div className="grid gap-4">
      <ViewSwitch
        label="Tampilan konten"
        active={calendar ? "calendar" : "board"}
        options={[
          { id: "board", label: "Papan", href: base },
          { id: "calendar", label: "Kalender", href: monthHref(month) },
        ]}
      />
      <BrandKitPanel
        kits={kits}
        manageHref={
          canManageBrands && project
            ? (brandId) => `/admin/clients/${project.client_id}/brands/${brandId}`
            : undefined
        }
      />
      {calendar ? (
        <ContentCalendar
          key={`${month}-${items.length}`}
          items={toCalendarItems(items, brands)}
          month={month}
          monthHrefs={{
            previous: monthHref(shiftMonth(month, -1)),
            next: monthHref(shiftMonth(month, 1)),
            current: monthHref(todayJakarta().slice(0, 7)),
          }}
          itemHrefPrefix={`${base}/content/`}
          reschedule={setPublishDate.bind(null, id)}
        />
      ) : (
        <ContentBoard
          projectId={id}
          items={items}
          brands={brands}
          brandLocked={brandLocked}
          people={people}
          currentUserId={user.id}
        />
      )}
    </div>
  );
}
