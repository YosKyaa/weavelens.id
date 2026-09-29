import type { PointerEvent } from "react";
import { Expand } from "lucide-react";
import { Photo } from "@/components/atoms/Photo";
import { cn } from "@/lib/utils";
import type { PortfolioImage } from "@/types";

type PortfolioItemProps = {
  image: PortfolioImage;
  categoryLabel: string;
  openLabel: string;
  sizes: string;
  onOpen: () => void;
  className?: string;
};

const MAX_TILT_DEG = 7;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Tile galeri: miring mengikuti kursor, kilau cahaya, dan keterangan glass yang naik saat disorot. */
export function PortfolioItem({
  image,
  categoryLabel,
  openLabel,
  sizes,
  onOpen,
  className,
}: PortfolioItemProps) {
  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" || prefersReducedMotion()) return;
    const tile = event.currentTarget;
    const rect = tile.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    tile.style.setProperty("--rx", `${(0.5 - y) * MAX_TILT_DEG}deg`);
    tile.style.setProperty("--ry", `${(x - 0.5) * MAX_TILT_DEG}deg`);
    tile.style.setProperty("--mx", `${x * 100}%`);
    tile.style.setProperty("--my", `${y * 100}%`);
  }

  function handlePointerLeave(event: PointerEvent<HTMLButtonElement>) {
    const tile = event.currentTarget;
    for (const name of ["--rx", "--ry", "--mx", "--my"]) tile.style.removeProperty(name);
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      aria-label={`${openLabel}: ${image.alt}`}
      style={{ transform: "perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))" }}
      className={cn(
        "group relative block size-full cursor-zoom-in overflow-hidden rounded-xl shadow-soft transition-[transform,box-shadow] duration-300 ease-out hover:shadow-lift",
        className,
      )}
    >
      <Photo
        image={image}
        sizes={sizes}
        className="aspect-auto h-full transition-transform duration-700 ease-out group-hover:scale-[1.06]"
      />
      {/* Kilau cahaya yang mengikuti kursor. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgb(255 255 255 / 0.35), transparent 55%)",
        }}
      />
      <span
        aria-hidden
        className="glass-lite absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-[transform,opacity] duration-300 sm:inset-x-3 sm:bottom-3 sm:translate-y-3 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-visible:translate-y-0 sm:group-focus-visible:opacity-100"
      >
        <span className="min-w-0">
          <span className="block font-heading text-xs font-semibold text-ink">{categoryLabel}</span>
          {image.client && (
            <span className="block truncate text-xs text-ink/80">{image.client}</span>
          )}
        </span>
        <Expand className="size-4 shrink-0 text-ink" />
      </span>
    </button>
  );
}
