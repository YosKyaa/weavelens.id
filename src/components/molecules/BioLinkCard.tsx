import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Images,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Sparkles,
  Tag,
} from "lucide-react";
import type { BioLink } from "@/content/bio";

const icons: Record<BioLink["icon"], LucideIcon> = {
  images: Images,
  tag: Tag,
  sparkles: Sparkles,
  portal: LayoutDashboard,
  mail: Mail,
};

type BioLinkCardProps = {
  link: BioLink;
  /** Urutan tampil, untuk jeda animasi masuk. */
  index: number;
};

/** Satu tombol link di halaman bio: ikon, judul, keterangan, panah. */
export function BioLinkCard({ link, index }: BioLinkCardProps) {
  const Icon = icons[link.icon];
  const style = { animationDelay: `${250 + index * 70}ms` } as CSSProperties;

  return (
    <Link
      href={link.href}
      {...(link.external && { target: "_blank", rel: "noopener noreferrer" })}
      style={style}
      className="glass-gradient group flex animate-hero-in items-center gap-4 rounded-2xl p-4 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary transition-transform duration-300 group-hover:-rotate-6">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading font-semibold text-ink">{link.title}</span>
        <span className="block text-sm text-ink/75">{link.sub}</span>
      </span>
      <ArrowUpRight
        aria-hidden
        className="size-5 shrink-0 text-ink/60 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      />
    </Link>
  );
}
