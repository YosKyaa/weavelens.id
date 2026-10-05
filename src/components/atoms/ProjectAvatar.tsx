import { cn } from "@/lib/utils";

/** Logo proyek di bucket publik `logos` → URL langsung (tanpa tanda tangan). */
export function projectLogoUrl(path: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return path && base ? `${base}/storage/v1/object/public/logos/${path}` : null;
}

const COLORS = ["#74342B", "#2B5C74", "#4F6B2F", "#8A5A12", "#5B3F86", "#1F6F68", "#9A3B5A"];

/** Warna tetap per judul, supaya proyek tanpa logo tetap mudah dibedakan. */
function colorFor(title: string): string {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

function initials(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  return (
    words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)
  ).toUpperCase();
}

const SIZES = {
  sm: "size-9 rounded-lg text-xs",
  md: "size-12 rounded-xl text-sm",
  lg: "size-16 rounded-2xl text-lg",
} as const;

/** Logo proyek (opsional); tanpa logo tampil inisial berwarna. */
export function ProjectAvatar({
  title,
  logoPath,
  size = "md",
  className,
}: {
  title: string;
  logoPath?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const url = projectLogoUrl(logoPath);
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-line font-heading font-bold",
        SIZES[size],
        url ? "bg-paper" : "text-white",
        className,
      )}
      style={url ? undefined : { backgroundColor: colorFor(title) }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo kecil dari bucket publik
        <img src={url} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        initials(title)
      )}
    </span>
  );
}
