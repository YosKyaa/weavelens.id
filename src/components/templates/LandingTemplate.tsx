import { CursorLight } from "@/components/atoms/CursorLight";
import { ScrollProgress } from "@/components/atoms/ScrollProgress";
import { SectionTransition } from "@/components/atoms/SectionTransition";
import { WaLink } from "@/components/atoms/WaLink";
import { CaseStudies } from "@/components/organisms/CaseStudies";
import { ClientStrip } from "@/components/organisms/ClientStrip";
import { Faq } from "@/components/organisms/Faq";
import { FinalCta } from "@/components/organisms/FinalCta";
import { Footer } from "@/components/organisms/Footer";
import { Header } from "@/components/organisms/Header";
import { Hero } from "@/components/organisms/Hero";
import { HowItWorks } from "@/components/organisms/HowItWorks";
import { Portfolio } from "@/components/organisms/Portfolio";
import { Pricing } from "@/components/organisms/Pricing";
import { Services } from "@/components/organisms/Services";
import { StickyWa } from "@/components/organisms/StickyWa";
import { Testimonials } from "@/components/organisms/Testimonials";
import { getCms } from "@/lib/cms/data";

/**
 * Urutan AIDA. Latar bergantian netral (paper) / sekunder (sand),
 * disambung tepi organik bergradasi (SectionTransition).
 * Attention: Hero, ClientStrip · Interest: Services, Portfolio ·
 * Desire: HowItWorks, CaseStudies, Pricing, Faq · Action: FinalCta, StickyWa.
 */
export async function LandingTemplate() {
  const { testimonials } = await getCms();

  return (
    <>
      <ScrollProgress />
      <CursorLight />
      <Header />
      <main id="konten" tabIndex={-1} className="outline-none">
        <Hero className="bg-paper" />
        <SectionTransition from="paper" to="sand" />
        <ClientStrip className="bg-sand" />
        <SectionTransition from="sand" to="paper" flip />
        <Services className="bg-paper" />
        <SectionTransition from="paper" to="sand" />
        <Portfolio className="bg-sand" />
        <SectionTransition from="sand" to="paper" flip />
        <HowItWorks className="bg-paper" />
        <SectionTransition from="paper" to="sand" />
        {/* Testimoni asli menggantikan studi kasus begitu ada minimal satu kutipan. */}
        {testimonials.length > 0 ? (
          <Testimonials className="bg-sand" />
        ) : (
          <CaseStudies className="bg-sand" />
        )}
        <SectionTransition from="sand" to="paper" flip />
        <Pricing className="bg-paper" />
        <SectionTransition from="paper" to="sand" />
        <Faq className="bg-sand" />
        <SectionTransition from="sand" to="paper" flip />
        <FinalCta className="bg-paper" />
      </main>
      <Footer />
      <StickyWa targetId="hero">
        <WaLink section="sticky" variant="fab" />
      </StickyWa>
    </>
  );
}
