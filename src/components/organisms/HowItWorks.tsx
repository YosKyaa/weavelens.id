import { SectionHeading } from "@/components/atoms/SectionHeading";
import { StepItem } from "@/components/molecules/StepItem";
import { steps, stepsSection } from "@/content/steps";
import { cn, container, sectionSpacing } from "@/lib/utils";

type HowItWorksProps = {
  className?: string;
};

export function HowItWorks({ className }: HowItWorksProps) {
  const headingId = `${stepsSection.id}-heading`;

  return (
    <section
      id={stepsSection.id}
      aria-labelledby={headingId}
      className={cn(sectionSpacing, className)}
    >
      <div className={container}>
        <SectionHeading id={headingId} heading={stepsSection.heading} sub={stepsSection.sub} rule />
        <div className="relative mt-6">
          {/* Garis penghubung langkah, tergambar mengikuti scroll. */}
          <span
            aria-hidden
            className="draw-x absolute top-0 right-12 left-12 hidden h-px bg-sand-deep md:block"
          />
          <ol className="relative grid gap-12 md:grid-cols-3 md:gap-6">
            {steps.map((step, index) => (
              <StepItem key={step.id} step={step} number={index + 1} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
