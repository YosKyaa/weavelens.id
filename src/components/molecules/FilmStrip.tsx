import { Photo } from "@/components/atoms/Photo";
import { cn } from "@/lib/utils";
import type { PortfolioImage } from "@/types";

type FilmStripProps = {
  images: PortfolioImage[];
  className?: string;
};

/** Pita film analog (lengkap dengan lubang sprocket) yang berjalan terus. Dekoratif. */
export function FilmStrip({ images, className }: FilmStripProps) {
  const loop = [...images, ...images];

  return (
    <div aria-hidden className={cn("relative bg-ink py-2.5 shadow-lift", className)}>
      <div className="film-holes h-2.5" />
      <div className="marquee overflow-hidden py-2.5">
        <div className="marquee-track flex w-max gap-2.5 px-2.5 [--marquee-speed:80s]">
          {loop.map((image, index) => (
            <div
              key={`${image.id}-${index}`}
              className="aspect-[3/2] h-24 shrink-0 overflow-hidden rounded-sm sm:h-32 lg:h-40"
            >
              <Photo
                image={image}
                sizes="(min-width: 1024px) 240px, 192px"
                className="aspect-auto h-full sepia-[0.15] transition-[filter] duration-500 hover:sepia-0"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="film-holes h-2.5" />
    </div>
  );
}
