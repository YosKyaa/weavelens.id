import { reveal } from "@/lib/motion";
import type { Step } from "@/types";

type StepItemProps = {
  step: Step;
  number: number;
};

export function StepItem({ step, number }: StepItemProps) {
  return (
    <li
      {...reveal(number - 1)}
      className="relative h-full rounded-2xl border border-line bg-card p-6 pt-10 transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-lift md:p-8 md:pt-12"
    >
      <span
        aria-hidden
        className="absolute -top-6 left-6 flex size-12 items-center justify-center rounded-full border border-sand-deep bg-sand font-heading text-base font-bold text-ink md:left-8"
      >
        {String(number).padStart(2, "0")}
      </span>
      <h3 className="text-xl">{step.title}</h3>
      <p className="mt-2 max-w-[45ch]">{step.description}</p>
    </li>
  );
}
