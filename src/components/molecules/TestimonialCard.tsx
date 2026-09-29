import { quoteMark } from "@/content/testimonials";
import { cn } from "@/lib/utils";
import type { Testimonial } from "@/types";

type TestimonialCardProps = {
  testimonial: Testimonial;
  /** Kartu pertama tampil lebih besar. */
  featured?: boolean;
};

export function TestimonialCard({ testimonial, featured = false }: TestimonialCardProps) {
  const initial = testimonial.name.trim().charAt(0).toUpperCase();

  return (
    <figure
      className={cn(
        "glass-gradient relative flex h-full flex-col overflow-hidden rounded-[2rem] p-7 transition-transform duration-500 hover:-translate-y-1 md:p-10",
        featured && "md:p-12",
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-6 right-6 font-serif text-[9rem] leading-none text-primary/15"
      >
        {quoteMark}
      </span>
      <span className="w-fit rounded-sm border border-sand-deep bg-sand px-2.5 py-1 font-heading text-xs font-semibold text-ink">
        {testimonial.service}
      </span>
      <blockquote
        className={cn(
          "relative mt-6 font-serif leading-relaxed text-ink italic",
          featured ? "text-2xl md:text-3xl" : "text-xl",
        )}
      >
        <p>{testimonial.quote}</p>
      </blockquote>
      <figcaption className="mt-auto flex items-center gap-4 border-t border-line pt-6">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-lg font-bold text-primary-foreground"
        >
          {initial}
        </span>
        <span>
          <span className="block font-heading font-semibold text-ink">{testimonial.name}</span>
          <span className="block text-sm text-ink/80">{testimonial.role}</span>
          <span className="block text-sm text-ink/80">{testimonial.client}</span>
        </span>
      </figcaption>
    </figure>
  );
}
