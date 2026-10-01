import { redirect } from "next/navigation";
import { setPublishDate } from "@/app/(portal)/admin/projects/actions";
import { ViewSwitch } from "@/components/molecules/ViewSwitch";
import { ContentBoard } from "@/components/organisms/ContentBoard";
import { ContentCalendar } from "@/components/organisms/ContentCalendar";
import { requireStaff } from "@/lib/auth";
import { loadBoard, toCalendarItems } from "@/lib/board-data";
import { isMonth, shiftMonth } from "@/lib/calendar";
import { todayJakarta } from "@/lib/format";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; month?: string }>;
};

/** Papan konten (kanban) atau kalender tayang. Proyek foto/video langsung dibuka di tab galeri. */
export default async function ProjectBoardPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { view, month: monthParam } = await searchParams;
  const { supabase } = await requireStaff();

  const { data: project } = await supabase
    .from("projects")
    .select("type, client_id")
    .eq("id", id)
    .single();
  if (project && (project.type === "photo" || project.type === "video")) {
    redirect(`/admin/projects/${id}/galleries`);
  }

  const [items, { data: brands }] = await Promise.all([
    loadBoard(supabase, id),
    supabase
      .from("brands")
      .select("id, name, color")
      .eq("client_id", project?.client_id ?? "")
      .order("sort"),
  ]);

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
      {calendar ? (
        <ContentCalendar
          key={`${month}-${items.length}`}
          items={toCalendarItems(items, brands ?? [])}
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
        <ContentBoard projectId={id} items={items} brands={brands ?? []} />
      )}
    </div>
  );
}
