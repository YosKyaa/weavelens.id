import { SectionHeading } from "@/components/atoms/SectionHeading";
import { FaqItem } from "@/components/molecules/FaqItem";
import { faqSection } from "@/content/faq";
import { getCms } from "@/lib/cms/data";
import { reveal } from "@/lib/motion";
import { cn, container, sectionSpacing } from "@/lib/utils";

type FaqProps = {
  className?: string;
};

/** Menjawab keberatan umum sebelum calon klien chat (dan mengurangi pertanyaan berulang). */
export async function Faq({ className }: FaqProps) {
  const { faqs } = await getCms();
  const headingId = `${faqSection.id}-heading`;

  return (
    <section
      id={faqSection.id}
      aria-labelledby={headingId}
      className={cn(sectionSpacing, className)}
    >
      <div className={cn(container, "grid gap-4 md:grid-cols-12 md:gap-10")}>
        <SectionHeading
          id={headingId}
          heading={faqSection.heading}
          sub={faqSection.sub}
          className="md:col-span-5 md:mb-0"
        />
        <div {...reveal(1)} className="md:col-span-7">
          {faqs.map((faq, index) => (
            <FaqItem key={faq.id} faq={faq} defaultOpen={index === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
