import { BatikPattern } from "@/components/atoms/BatikPattern";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { CaseStudyCard } from "@/components/molecules/CaseStudyCard";
import { caseStudies, caseStudiesSection } from "@/content/case-studies";
import { reveal } from "@/lib/motion";
import { cn, container, sectionSpacing } from "@/lib/utils";

type CaseStudiesProps = {
  className?: string;
};

/** Bukti sosial dari proyek nyata: klien, tantangan, dan yang dikerjakan. */
export function CaseStudies({ className }: CaseStudiesProps) {
  const headingId = `${caseStudiesSection.id}-heading`;

  return (
    <section
      id={caseStudiesSection.id}
      aria-labelledby={headingId}
      className={cn("relative overflow-hidden", sectionSpacing, className)}
    >
      <BatikPattern
        id="batik-case-studies"
        variant="parang"
        speed={80}
        className="opacity-[0.08] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div className={cn(container, "relative")}>
        <SectionHeading
          id={headingId}
          heading={caseStudiesSection.heading}
          sub={caseStudiesSection.sub}
          rule
        />
        <ul className="grid gap-6 md:grid-cols-2">
          {caseStudies.map((caseStudy, index) => (
            <li key={caseStudy.id} {...reveal(index % 2)}>
              <CaseStudyCard caseStudy={caseStudy} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
