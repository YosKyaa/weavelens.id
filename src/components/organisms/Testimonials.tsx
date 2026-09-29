import { AmbientGlow } from "@/components/atoms/AmbientGlow";
import { BatikPattern } from "@/components/atoms/BatikPattern";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { TestimonialCard } from "@/components/molecules/TestimonialCard";
import { testimonialsSection } from "@/content/testimonials";
import { getCms } from "@/lib/cms/data";
import { reveal } from "@/lib/motion";
import { cn, container, sectionSpacing } from "@/lib/utils";

type TestimonialsProps = {
  className?: string;
};

/** Testimoni asli: kutipan pertama besar di kiri, sisanya bertumpuk di kanan. */
export async function Testimonials({ className }: TestimonialsProps) {
  const { testimonials } = await getCms();
  if (testimonials.length === 0) return null;

  const [first, ...rest] = testimonials;
  const headingId = `${testimonialsSection.id}-heading`;

  return (
    <section
      id={testimonialsSection.id}
      aria-labelledby={headingId}
      className={cn("relative overflow-hidden", sectionSpacing, className)}
    >
      <BatikPattern
        id="batik-testimonials"
        variant="parang"
        speed={80}
        className="opacity-[0.08] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <AmbientGlow className="top-1/4 -left-32 size-[30rem]" />
      <div className={cn(container, "relative")}>
        <SectionHeading
          id={headingId}
          heading={testimonialsSection.heading}
          sub={testimonialsSection.sub}
          rule
        />
        <div className={cn("grid gap-6", rest.length > 0 && "lg:grid-cols-5")}>
          <div {...reveal()} className="lg:col-span-3">
            <TestimonialCard testimonial={first} featured />
          </div>
          {rest.length > 0 && (
            <ul className="grid gap-6 lg:col-span-2">
              {rest.map((testimonial, index) => (
                <li key={testimonial.id} {...reveal(index + 1)}>
                  <TestimonialCard testimonial={testimonial} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
