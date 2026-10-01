import { ComingSoonBadge } from "@/components/atoms/ComingSoonBadge";
import { GlassChip } from "@/components/atoms/GlassChip";
import { Photo } from "@/components/atoms/Photo";
import { WaLink } from "@/components/atoms/WaLink";
import { cn } from "@/lib/utils";
import type { Service } from "@/types";

type ServiceCardProps = {
  service: Service;
  /** Urutan tampil (0 = pertama), dipakai untuk nomor stempel. */
  index: number;
  /** "feature" = baris besar terbelah; "card" = kartu dengan foto yang menyembul. */
  variant?: "feature" | "card";
};

/** "Dokumentasi Foto" → kata kecil "Dokumentasi" + judul besar "Foto". */
function splitTitle(title: string) {
  const [first, ...rest] = title.split(" ");
  return rest.length > 0 ? { kicker: first, main: rest.join(" ") } : { kicker: "", main: first };
}

function ServiceTitle({ title, size }: { title: string; size: "lg" | "md" }) {
  const { kicker, main } = splitTitle(title);
  return (
    <h3 className="leading-none">
      {kicker && (
        <span className="block font-serif text-2xl font-normal text-ink/80 italic md:text-3xl">
          {kicker}
        </span>
      )}
      {/* Spasi agar terbaca "Dokumentasi Foto" oleh mesin pencari & pembaca layar. */}
      {kicker && " "}
      <span
        className={cn(
          "mt-1 block tracking-tight",
          size === "lg" ? "text-6xl md:text-7xl" : "text-4xl md:text-5xl",
        )}
      >
        {main}
      </span>
    </h3>
  );
}

function NumberStamp({ index, className }: { index: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "float flex size-16 items-center justify-center rounded-full border border-sand-deep bg-paper font-heading text-lg font-bold text-ink shadow-lift",
        className,
      )}
    >
      {String(index + 1).padStart(2, "0")}
    </span>
  );
}

export function ServiceCard({ service, index, variant = "card" }: ServiceCardProps) {
  if (service.status === "coming_soon") {
    return (
      <article className="flex flex-col gap-3 rounded-2xl border border-dashed border-sand-deep p-6 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-2xl text-ink">{service.title}</h3>
          <ComingSoonBadge />
        </div>
        <p className="max-w-[60ch] text-ink/80">
          {service.tagline} {service.description}
        </p>
      </article>
    );
  }

  const cta = <WaLink section="services" message={service.waMessage} label={service.ctaLabel} />;

  if (variant === "feature") {
    return (
      <article className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <div className="relative mx-auto w-full max-w-md md:mx-0">
          {service.image && (
            <div className="group relative -rotate-3 overflow-hidden rounded-2xl shadow-lift transition-transform duration-700 hover:rotate-0">
              <Photo
                image={service.image}
                sizes="(min-width: 768px) 448px, 100vw"
                className="aspect-[4/5] transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <span aria-hidden className="light-leak" />
            </div>
          )}
          <NumberStamp index={index} className="absolute -top-6 -right-4" />
          <GlassChip
            label={service.tagline}
            floatDelay={0.8}
            className="absolute -bottom-6 left-4 max-w-[85%] md:-left-6"
          />
        </div>
        <div>
          <ServiceTitle title={service.title} size="lg" />
          <p className="glass-gradient mt-8 max-w-[52ch] rounded-2xl p-6 text-lg">
            {service.description}
          </p>
          <div className="mt-8">{cta}</div>
        </div>
      </article>
    );
  }

  return (
    <article className="group relative flex h-full flex-col rounded-[2rem] border border-sand-deep bg-sand px-6 pt-0 pb-6 transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-lift md:px-7">
      {service.image && (
        <div
          className={cn(
            "-mt-14 overflow-hidden rounded-2xl shadow-lift transition-transform duration-700 group-hover:rotate-0",
            index % 2 === 0 ? "rotate-2" : "-rotate-2",
          )}
        >
          <Photo
            image={service.image}
            sizes="(min-width: 1152px) 340px, (min-width: 768px) 33vw, 100vw"
            className="transition-transform duration-700 group-hover:scale-[1.05]"
          />
        </div>
      )}
      <NumberStamp index={index} className="absolute -top-10 -right-3" />
      <div className="mt-7">
        <ServiceTitle title={service.title} size="md" />
      </div>
      <p className="mt-3 font-heading text-sm font-semibold text-ink/80">{service.tagline}</p>
      <p className="mt-3 max-w-[48ch]">{service.description}</p>
      <div className="mt-auto flex justify-end pt-6">{cta}</div>
    </article>
  );
}
