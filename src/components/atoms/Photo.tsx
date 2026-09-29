import Image from "next/image";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import type { PortfolioImage } from "@/types";

type PhotoProps = {
  image: PortfolioImage;
  sizes: string;
  priority?: boolean;
  className?: string;
};

/** Foto 3:2 dari content. Jika `src` kosong, tampil placeholder abu berlabel ukuran. */
export function Photo({ image, sizes, priority = false, className }: PhotoProps) {
  if (!image.src) {
    return (
      <div
        role="img"
        aria-label={image.alt}
        className={cn(
          "flex aspect-[3/2] w-full items-center justify-center bg-placeholder text-sm text-ink/80",
          className,
        )}
      >
        <span aria-hidden>{site.placeholderSize(image.width, image.height)}</span>
      </div>
    );
  }

  return (
    <Image
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      priority={priority}
      className={cn("aspect-[3/2] w-full object-cover", className)}
    />
  );
}
