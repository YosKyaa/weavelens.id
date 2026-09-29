import Image from "next/image";
import { cn } from "@/lib/utils";

type OrnamentProps = {
  className?: string;
};

/** Motif batik dekoratif. Hanya di pojok hero dan footer, tidak pernah di belakang teks. */
export function Ornament({ className }: OrnamentProps) {
  return (
    <Image
      src="/brand/ornament.svg"
      alt=""
      aria-hidden
      width={200}
      height={200}
      unoptimized
      className={cn("pointer-events-none absolute select-none opacity-[0.08]", className)}
    />
  );
}
