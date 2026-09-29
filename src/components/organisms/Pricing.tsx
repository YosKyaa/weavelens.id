import { BatikPattern } from "@/components/atoms/BatikPattern";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { PricingCard } from "@/components/molecules/PricingCard";
import { pricingNote, pricingSection } from "@/content/pricing";
import { getCms } from "@/lib/cms/data";
import { reveal } from "@/lib/motion";
import { cn, container, sectionSpacing } from "@/lib/utils";

type PricingProps = {
  className?: string;
};

export async function Pricing({ className }: PricingProps) {
  const { pricingPlans } = await getCms();
  const headingId = `${pricingSection.id}-heading`;

  return (
    <section
      id={pricingSection.id}
      aria-labelledby={headingId}
      className={cn("relative overflow-hidden", sectionSpacing, className)}
    >
      <BatikPattern
        id="batik-pricing"
        variant="kawung"
        speed={80}
        className="opacity-[0.09] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div className={cn(container, "relative")}>
        <SectionHeading id={headingId} heading={pricingSection.heading} sub={pricingSection.sub} />
        <ul className="mt-4 grid max-w-4xl gap-x-6 gap-y-16 md:grid-cols-2">
          {pricingPlans.map((plan, index) => (
            <li key={plan.id} {...reveal(index)}>
              <PricingCard plan={plan} />
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-[70ch] text-sm text-ink/80">{pricingNote}</p>
      </div>
    </section>
  );
}
