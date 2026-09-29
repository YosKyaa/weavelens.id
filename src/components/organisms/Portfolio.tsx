import { BatikPattern } from "@/components/atoms/BatikPattern";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { FilmStrip } from "@/components/molecules/FilmStrip";
import { PortfolioGallery } from "@/components/organisms/PortfolioGallery";
import { portfolioSection } from "@/content/portfolio";
import { getCms } from "@/lib/cms/data";
import { cn, container, sectionSpacing } from "@/lib/utils";

type PortfolioProps = {
  className?: string;
};

export async function Portfolio({ className }: PortfolioProps) {
  const { portfolioImages } = await getCms();
  const headingId = `${portfolioSection.id}-heading`;

  return (
    <section
      id={portfolioSection.id}
      aria-labelledby={headingId}
      className={cn("relative overflow-hidden", sectionSpacing, className)}
    >
      <BatikPattern
        id="batik-portfolio"
        variant="truntum"
        speed={90}
        className="opacity-[0.07] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
      />
      <FilmStrip
        images={portfolioImages}
        className="relative mb-16 -ml-[5%] w-[110%] -rotate-2 md:mb-20"
      />
      <div className={cn(container, "relative")}>
        <SectionHeading
          id={headingId}
          heading={portfolioSection.heading}
          sub={portfolioSection.sub}
        />
        <PortfolioGallery images={portfolioImages} />
      </div>
    </section>
  );
}
