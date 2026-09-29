import { AmbientGlow } from "@/components/atoms/AmbientGlow";
import { BatikPattern } from "@/components/atoms/BatikPattern";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { ServiceCard } from "@/components/molecules/ServiceCard";
import { servicesSection } from "@/content/services";
import { getCms } from "@/lib/cms/data";
import { reveal } from "@/lib/motion";
import { cn, container, sectionSpacing } from "@/lib/utils";

type ServicesProps = {
  className?: string;
};

/** Layanan pertama tampil besar (feature), sisanya kartu dengan foto yang menyembul. */
export async function Services({ className }: ServicesProps) {
  const { services } = await getCms();
  const available = services.filter((s) => s.status === "available");
  const comingSoon = services.filter((s) => s.status === "coming_soon");
  const [featured, ...rest] = available;
  const headingId = `${servicesSection.id}-heading`;

  return (
    <section
      id={servicesSection.id}
      aria-labelledby={headingId}
      className={cn("relative overflow-hidden", sectionSpacing, className)}
    >
      <BatikPattern
        id="batik-services"
        variant="truntum"
        speed={90}
        className="opacity-[0.06] [mask-image:linear-gradient(to_bottom,black,transparent_45%)]"
      />
      <AmbientGlow delay={-4} className="top-[18%] -left-32 size-[32rem]" />
      <AmbientGlow tone="rose" delay={-10} className="right-[-10rem] bottom-[20%] size-[30rem]" />
      <div className={cn(container, "relative")}>
        <SectionHeading
          id={headingId}
          heading={servicesSection.heading}
          sub={servicesSection.sub}
          rule
        />

        {featured && (
          <div {...reveal()} className="mb-32 md:mb-36">
            <ServiceCard service={featured} index={0} variant="feature" />
          </div>
        )}

        {rest.length > 0 && (
          <ul className="grid gap-x-6 gap-y-20 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((service, index) => (
              <li key={service.id} {...reveal(index)}>
                <ServiceCard service={service} index={index + 1} />
              </li>
            ))}
          </ul>
        )}

        {comingSoon.length > 0 && (
          <ul className="mt-12 grid gap-6">
            {comingSoon.map((service, index) => (
              <li key={service.id} {...reveal(index)}>
                <ServiceCard service={service} index={available.length + index} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
