import { EmptyState } from "@/components/atoms/EmptyState";
import { workspaceText } from "@/content/workspace";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";

const text = workspaceText.activity;

type PageProps = { params: Promise<{ id: string }> };

const time = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

function detail(meta: unknown): string {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";
  const record = meta as Record<string, unknown>;
  const parts = [record.title, record.gallery, record.count ? `${record.count} file` : null];
  return parts.filter((part) => typeof part === "string" || typeof part === "number").join(" · ");
}

/** Jejak siapa melakukan apa: tim maupun klien (lewat link). */
export default async function ProjectActivityPage({ params }: PageProps) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("activity_log")
    .select("id, action, actor_name, meta, created_at, profiles(full_name)")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!data?.length) return <EmptyState message={text.empty} className="bg-paper" />;

  return (
    <ol className="grid gap-2">
      {data.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-line bg-paper px-4 py-3 text-sm"
        >
          <span>
            <span className="font-semibold text-ink">
              {entry.actor_name ?? entry.profiles?.full_name ?? "Tim WeaveLens"}
            </span>{" "}
            {text.actions[entry.action] ?? entry.action}
            {detail(entry.meta) && <span className="text-ink/70"> — {detail(entry.meta)}</span>}
          </span>
          <time dateTime={entry.created_at} className="text-xs text-ink/60">
            {formatDate(entry.created_at)}, {time.format(new Date(entry.created_at))}
          </time>
        </li>
      ))}
    </ol>
  );
}
