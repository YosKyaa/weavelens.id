import { ChevronDown } from "lucide-react";
import type { Faq } from "@/types";

type FaqItemProps = {
  faq: Faq;
  defaultOpen?: boolean;
};

/**
 * `<details>` bawaan browser: jawaban selalu ada di HTML (terbaca Google & asisten AI walau
 * tertutup), tanpa JavaScript. `name` yang sama membuat hanya satu jawaban terbuka.
 */
export function FaqItem({ faq, defaultOpen }: FaqItemProps) {
  return (
    <details name="faq" open={defaultOpen} className="faq-item group border-b border-sand-deep">
      <summary className="flex min-h-14 cursor-pointer list-none items-start justify-between gap-4 rounded-md py-5 text-left font-heading text-base font-semibold text-ink transition-colors outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-lg [&::-webkit-details-marker]:hidden">
        <h3 className="text-[length:inherit] leading-snug font-[inherit] [color:inherit]">
          {faq.question}
        </h3>
        <ChevronDown
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-ink/70 transition-transform duration-300 group-open:rotate-180"
        />
      </summary>
      <p className="max-w-[65ch] pb-5 text-base text-ink/90">{faq.answer}</p>
    </details>
  );
}
