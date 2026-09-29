import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Faq } from "@/types";

type FaqItemProps = {
  faq: Faq;
};

export function FaqItem({ faq }: FaqItemProps) {
  return (
    <AccordionItem value={faq.id} className="border-sand-deep">
      <AccordionTrigger className="min-h-14 py-5 font-heading text-base font-semibold text-ink hover:text-primary hover:no-underline md:text-lg [&>svg]:size-5 [&>svg]:text-ink/70">
        {faq.question}
      </AccordionTrigger>
      <AccordionContent className="max-w-[65ch] pb-5 text-base text-ink/90">
        {faq.answer}
      </AccordionContent>
    </AccordionItem>
  );
}
