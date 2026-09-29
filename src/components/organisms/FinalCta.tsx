import { AmbientGlow } from "@/components/atoms/AmbientGlow";
import { BatikPattern } from "@/components/atoms/BatikPattern";
import { GlassChip } from "@/components/atoms/GlassChip";
import { Ornament } from "@/components/atoms/Ornament";
import { WaLink } from "@/components/atoms/WaLink";
import { site } from "@/content/site";
import { reveal } from "@/lib/motion";
import { cn, container, sectionSpacing } from "@/lib/utils";

type FinalCtaProps = {
  className?: string;
};

const chipPositions = [
  "top-8 left-6 md:left-12 -rotate-6",
  "top-10 right-6 md:right-14 rotate-3",
  "bottom-10 left-10 md:left-20 rotate-2",
  "bottom-8 right-8 md:right-20 -rotate-3",
];

/** Momen penutup: panel cokelat bergradasi dengan batik bergerak, satu heading, satu tombol. */
export function FinalCta({ className }: FinalCtaProps) {
  return (
    <section aria-labelledby="final-cta-heading" className={cn(sectionSpacing, className)}>
      <div className={container}>
        <div
          {...reveal()}
          className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#5c2822_0%,#74342b_45%,#8a4034_100%)] px-6 py-24 text-center shadow-lift md:py-28"
        >
          <BatikPattern
            id="batik-final-cta"
            variant="parang"
            tone="light"
            speed={40}
            className="opacity-[0.09]"
          />
          <AmbientGlow tone="light" className="-top-32 left-1/4 size-[30rem]" />
          <AmbientGlow tone="light" delay={-8} className="-right-24 -bottom-40 size-[26rem]" />
          <Ornament className="spin-slow -top-24 -left-24 size-80 opacity-[0.12] brightness-[3] [--spin-speed:60s]" />
          <Ornament className="spin-slow -right-24 -bottom-24 size-80 opacity-[0.12] brightness-[3] [--spin-speed:80s]" />
          {site.finalCta.tags.map((tag, index) => (
            <GlassChip
              key={tag}
              label={tag}
              tone="dark"
              floatDelay={index * 0.9}
              className={cn("absolute hidden sm:inline-flex", chipPositions[index])}
            />
          ))}
          <div className="relative">
            <h2
              id="final-cta-heading"
              className="text-3xl leading-tight text-primary-foreground md:text-5xl"
            >
              {site.finalCta.heading}
            </h2>
            <p className="mx-auto mt-5 max-w-[46ch] text-lg text-primary-foreground/90">
              {site.finalCta.sub}
            </p>
            <WaLink section="final-cta" variant="inverse" className="mt-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
