import { cn } from "@/lib/utils";

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
}

/** Inisial penanggung jawab (bulat kecil); nama lengkap muncul sebagai tooltip & untuk pembaca layar. */
export function PersonBadge({ name, className }: { name: string; className?: string }) {
  return (
    <span
      title={name}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-ink font-heading text-[10px] font-bold text-paper",
        className,
      )}
    >
      <span aria-hidden>{initials(name)}</span>
      <span className="sr-only">Penanggung jawab: {name}</span>
    </span>
  );
}
