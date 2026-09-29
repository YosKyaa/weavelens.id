import type { CSSProperties } from "react";
import { AmbientGlow } from "@/components/atoms/AmbientGlow";
import { BatikPattern } from "@/components/atoms/BatikPattern";
import { GlassChip } from "@/components/atoms/GlassChip";
import { Ornament } from "@/components/atoms/Ornament";
import { Photo } from "@/components/atoms/Photo";
import { RotatingSeal } from "@/components/atoms/RotatingSeal";
import { WaLink } from "@/components/atoms/WaLink";
import { heroImage } from "@/content/portfolio";
import { site } from "@/content/site";
import { cn, container, sectionSpacing } from "@/lib/utils";

type HeroProps = {
  className?: string;
};

const tagPositions = ["-top-5 right-6", "top-1/3 -right-3 md:-right-6", "bottom-10 right-10"];

export function Hero({ className }: HeroProps) {
  const words = site.hero.headline.split(" ");

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className={cn("relative overflow-hidden", sectionSpacing, className)}
    >
      {/* Hamparan krem bermotif batik di belakang foto, tepinya memudar lembut. */}
      <div
        aria-hidden
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_95%_42%_at_55%_80%,black_45%,transparent_100%)] md:left-auto md:w-[68%] md:[mask-image:radial-gradient(ellipse_75%_80%_at_68%_50%,black_40%,transparent_100%)]"
      >
        <div className="absolute inset-0 bg-sand" />
        <BatikPattern id="batik-hero" variant="kawung" speed={70} className="opacity-[0.14]" />
      </div>
      <AmbientGlow className="-top-40 -left-40 size-[34rem]" />
      <AmbientGlow tone="rose" delay={-6} className="top-1/3 right-[20%] size-[28rem]" />
      <Ornament className="turn-on-scroll -right-16 -bottom-16 size-64 md:size-80" />
      <div
        className={cn(container, "relative grid gap-14 md:grid-cols-12 md:items-center md:gap-10")}
      >
        <div className="md:col-span-6">
          <p className="glass-gradient inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-ink">
            <span aria-hidden className="size-2 rounded-full bg-primary" />
            {site.hero.badge}
          </p>
          <h1
            id="hero-heading"
            className="mt-6 text-4xl leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]"
          >
            {words.map((word, index) => (
              <span
                key={`${word}-${index}`}
                className="hero-word"
                style={{ "--word": index } as CSSProperties}
              >
                {word}
                {index < words.length - 1 && " "}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-[52ch] animate-hero-in text-lg [animation-delay:250ms]">
            {site.hero.sub}
          </p>
          <div className="mt-8 flex animate-hero-in flex-col items-start gap-3 [animation-delay:400ms]">
            <WaLink section="hero" />
          </div>
        </div>
        <div className="drift-up relative md:col-span-6">
          <div>
            <div className="relative overflow-hidden rounded-2xl shadow-lift">
              <Photo
                image={heroImage}
                priority
                sizes="(min-width: 1152px) 540px, (min-width: 768px) 50vw, 100vw"
                className="rounded-2xl"
              />
              <span aria-hidden className="light-leak" />
            </div>
          </div>
          {site.hero.photoTags.map((tag, index) => (
            <GlassChip
              key={tag}
              label={tag}
              floatDelay={index * 1.2}
              className={cn("absolute", tagPositions[index])}
            />
          ))}
          <RotatingSeal
            text={site.hero.sealText}
            className="float absolute -bottom-10 left-4 [--float-delay:0.6s] md:-left-10"
          />
        </div>
      </div>
    </section>
  );
}
