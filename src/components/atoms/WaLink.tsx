import { MessageCircle } from "lucide-react";
import { WaChooser } from "@/components/atoms/WaChooser";
import { buttonVariants } from "@/components/ui/button";
import { site } from "@/content/site";
import { getCms } from "@/lib/cms/data";
import { buildWaUrl } from "@/lib/wa";
import { cn } from "@/lib/utils";
import type { CtaSection, WaAdmin, WaMessageKey } from "@/types";

type WaLinkProps = {
  /** Asal klik, dicatat oleh CtaTracker lewat atribut data-cta. */
  section: CtaSection;
  message?: WaMessageKey;
  label?: string;
  /** Label pendek yang dipakai di bawah 640px (mis. header mobile). */
  shortLabel?: string;
  variant?: "button" | "inverse" | "fab" | "text" | "tile";
  /** Baris kedua, hanya untuk variant "tile" (mis. nomor admin). */
  sub?: string;
  /** Jika diisi, link langsung ke admin ini. Jika tidak, tampil pilihan admin. */
  admin?: WaAdmin;
  className?: string;
};

const buttonBase =
  "sheen group/wa h-12 gap-2.5 rounded-md px-6 font-heading text-base font-semibold transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-0.5 active:translate-y-0";

const variants = {
  button: cn(buttonVariants(), buttonBase, "shadow-soft hover:bg-brand-hover hover:shadow-lift"),
  inverse: cn(
    buttonVariants(),
    buttonBase,
    "bg-paper text-primary hover:bg-brand-soft hover:shadow-lift",
  ),
  fab: "relative inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift transition-transform duration-300 hover:scale-105",
  /** Kartu glass di latar gelap (footer). */
  tile: "glass-gradient-dark group/wa flex items-center gap-4 rounded-xl p-4 text-paper transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:bg-paper/10",
  text: "font-semibold text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-primary",
} as const;

/** Satu-satunya komponen yang tahu soal WhatsApp. */
export async function WaLink({
  section,
  message = "general",
  label = site.wa.ctaLabel,
  shortLabel,
  variant = "button",
  sub,
  admin,
  className,
}: WaLinkProps) {
  const { admins } = await getCms();
  const content =
    variant === "tile" ? (
      <>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-paper text-primary transition-transform duration-300 group-hover/wa:-rotate-12">
          <MessageCircle aria-hidden className="size-5" />
        </span>
        <span className="flex flex-col">
          <span className="font-heading font-semibold">{label}</span>
          {sub && <span className="text-sm text-paper/80">{sub}</span>}
        </span>
      </>
    ) : (
      <>
        {variant === "fab" && (
          <span aria-hidden className="fab-ping absolute inset-0 rounded-full" />
        )}
        {variant !== "text" && (
          <MessageCircle
            aria-hidden
            className={cn(
              "transition-transform duration-300 group-hover/wa:-rotate-12",
              variant === "fab" ? "relative size-6" : "size-5",
            )}
          />
        )}
        {shortLabel ? (
          <>
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </>
        ) : (
          <span className={variant === "fab" ? "sr-only" : undefined}>{label}</span>
        )}
      </>
    );

  if (admin) {
    return (
      <a
        href={buildWaUrl(admin, message)}
        target="_blank"
        rel="noopener noreferrer"
        data-cta={section}
        data-admin={admin.id}
        className={cn(variants[variant], className)}
      >
        {content}
        <span className="sr-only"> {site.a11y.opensInNewTab}</span>
      </a>
    );
  }

  return (
    <WaChooser
      section={section}
      title={site.wa.chooser.title}
      description={site.wa.chooser.description}
      newTabHint={site.a11y.opensInNewTab}
      options={admins.map((item, index) => ({
        id: item.id,
        label: site.wa.chooser.adminLabel(index),
        sub: item.display,
        href: buildWaUrl(item, message),
      }))}
      triggerClassName={cn(variants[variant], "cursor-pointer", className)}
      triggerContent={content}
      side={variant === "fab" ? "top" : "bottom"}
      align={variant === "fab" ? "end" : "start"}
    />
  );
}
