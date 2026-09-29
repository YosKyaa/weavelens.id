import { Check } from "lucide-react";
import { PriceStamp } from "@/components/atoms/PriceStamp";
import { WaLink } from "@/components/atoms/WaLink";
import type { PricingPlan } from "@/types";

type PricingCardProps = {
  plan: PricingPlan;
};

export function PricingCard({ plan }: PricingCardProps) {
  return (
    <article className="glass-gradient relative flex h-full flex-col rounded-2xl p-6 pt-8 transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-lift md:p-8">
      <PriceStamp amount={plan.price} className="absolute -top-8 right-5 rotate-6" />
      <h3 className="pr-28 text-2xl">{plan.name}</h3>
      <ul className="mt-8 mb-8 space-y-3 border-t border-sand-deep pt-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3">
            <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-ink/70" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <WaLink
        section="pricing"
        message={plan.waMessage}
        label={plan.ctaLabel}
        className="mt-auto w-full"
      />
    </article>
  );
}
