import { cn } from "@/lib/utils";

type Tone = "paper" | "sand" | "dark";

type SectionTransitionProps = {
  /** Warna section di atas. */
  from: Tone;
  /** Warna section di bawah. */
  to: Tone;
  /** Cerminkan bentuk supaya transisi berurutan tidak identik. */
  flip?: boolean;
};

const FILL: Record<Tone, string> = {
  paper: "#F9F9F9",
  sand: "#F2E1D1",
  dark: "#2B1A17",
};

const BG: Record<Tone, string> = {
  paper: "bg-paper",
  sand: "bg-sand",
  dark: "bg-ink",
};

/**
 * Tepi organik berlapis (seperti sapuan kuas) antar dua section: tiga lapis gelombang
 * dengan kepekatan berbeda membentuk gradasi halus dari warna atas ke warna bawah.
 */
export function SectionTransition({ from, to, flip = false }: SectionTransitionProps) {
  const fill = FILL[from];

  return (
    <div aria-hidden className={cn("relative -my-px h-16 md:h-24", BG[to])}>
      <svg
        viewBox="0 0 1440 96"
        preserveAspectRatio="none"
        className={cn("absolute inset-0 size-full", flip && "-scale-x-100")}
      >
        <path
          fill={fill}
          fillOpacity="0.3"
          d="M0 0H1440V70C1392 78 1356 60 1308 66C1250 74 1214 88 1152 82C1092 76 1060 58 996 62C930 66 900 86 834 84C770 82 744 62 682 64C612 66 586 90 516 86C452 82 430 60 366 62C300 64 270 84 204 82C142 80 110 62 58 66C34 68 16 74 0 78Z"
        />
        <path
          fill={fill}
          fillOpacity="0.6"
          d="M0 0H1440V50C1400 58 1362 42 1318 46C1262 52 1236 68 1176 64C1118 60 1086 40 1024 44C962 48 934 66 872 64C810 62 780 42 720 44C656 46 628 68 562 66C500 64 470 44 408 46C346 48 318 66 256 64C196 62 164 44 110 46C70 48 38 58 0 56Z"
        />
        <path
          fill={fill}
          d="M0 0H1440V30C1404 36 1370 24 1330 28C1280 32 1250 46 1196 44C1142 42 1110 26 1054 28C996 30 966 46 908 44C852 42 820 26 764 28C706 30 676 46 618 44C562 42 532 26 476 28C418 30 388 46 330 44C274 42 244 26 188 28C132 30 100 42 50 40C30 39 14 36 0 34Z"
        />
      </svg>
    </div>
  );
}
