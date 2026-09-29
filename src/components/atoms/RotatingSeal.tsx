import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const SEAL_CIRCUMFERENCE = 2 * Math.PI * 46;

type RotatingSealProps = {
  text: string;
  className?: string;
};

/** Segel bulat: teks melingkar yang berputar pelan, dengan ikon kamera diam di tengah. */
export function RotatingSeal({ text, className }: RotatingSealProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative flex size-32 items-center justify-center rounded-full bg-ink text-paper shadow-lift",
        className,
      )}
    >
      <svg viewBox="0 0 120 120" className="spin-slow absolute inset-0 size-full">
        <defs>
          <path id="seal-circle" d="M60 60 m-46 0 a46 46 0 1 1 92 0 a46 46 0 1 1 -92 0" />
        </defs>
        <text className="fill-current font-heading text-[12px] font-semibold">
          {/* textLength = keliling lingkaran, supaya teks pas satu putaran penuh. */}
          <textPath href="#seal-circle" textLength={SEAL_CIRCUMFERENCE} lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      <span className="flex size-12 items-center justify-center rounded-full border border-paper/30">
        <Camera className="size-5" />
      </span>
    </div>
  );
}
