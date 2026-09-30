import Link from "next/link";
import { AmbientGlow } from "@/components/atoms/AmbientGlow";
import { BatikPattern } from "@/components/atoms/BatikPattern";
import { Logo } from "@/components/atoms/Logo";
import { Photo } from "@/components/atoms/Photo";
import { WaLink } from "@/components/atoms/WaLink";
import { BioLinkCard } from "@/components/molecules/BioLinkCard";
import { bio } from "@/content/bio";
import { site } from "@/content/site";
import { getCms } from "@/lib/cms/data";

/**
 * Halaman bio Instagram. Satu kolom selebar HP, tombol WhatsApp paling atas
 * karena itu tujuan utamanya; foto kecil sebagai bukti, lalu link pendukung.
 */
export async function BioTemplate() {
  const { contact, portfolioImages, pricingPlans } = await getCms();
  const photos = portfolioImages.filter((image) => image.src).slice(0, 3);
  const links = [
    ...bio.links(pricingPlans[0]?.price ?? null),
    {
      id: "email",
      href: `mailto:${contact.email}`,
      title: bio.emailTitle,
      sub: contact.email,
      icon: "mail" as const,
    },
  ];

  return (
    <main
      id="content"
      tabIndex={-1}
      className="relative min-h-dvh overflow-hidden bg-paper outline-none"
    >
      <BatikPattern
        id="batik-bio"
        variant="kawung"
        speed={90}
        className="opacity-[0.07] [mask-image:linear-gradient(to_bottom,black,transparent_60%)]"
      />
      <AmbientGlow className="-top-32 -left-32 size-[26rem]" />
      <AmbientGlow tone="rose" delay={-6} className="top-1/2 -right-40 size-[24rem]" />

      <div className="relative mx-auto flex w-full max-w-md flex-col items-center px-4 pt-14 pb-12">
        <Logo priority className="h-12 animate-hero-in" />
        <p className="mt-4 animate-hero-in text-center font-heading font-semibold text-ink [animation-delay:80ms]">
          {bio.intro}
        </p>
        <p className="mt-1 animate-hero-in text-center text-sm text-ink/75 [animation-delay:120ms]">
          {contact.address} · {contact.area}
        </p>

        <div className="mt-8 w-full animate-hero-in [animation-delay:180ms]">
          <WaLink section="bio" label={bio.primaryLabel} className="h-14 w-full text-base" />
          <p className="mt-2 text-center text-sm text-ink/75">{contact.responseHours}</p>
        </div>

        {photos.length > 0 && (
          <Link
            href="/?utm_source=instagram&utm_medium=bio#portfolio"
            aria-label={bio.photosLabel}
            className="mt-8 grid w-full animate-hero-in grid-cols-3 gap-2 [animation-delay:220ms]"
          >
            {photos.map((image, index) => (
              <span
                key={image.id}
                className={
                  index === 1
                    ? "overflow-hidden rounded-xl shadow-soft"
                    : "mt-3 overflow-hidden rounded-xl shadow-soft"
                }
              >
                <Photo
                  image={image}
                  sizes="(min-width: 448px) 140px, 33vw"
                  className="aspect-[4/5] transition-transform duration-500 hover:scale-105"
                />
              </span>
            ))}
          </Link>
        )}

        <ul className="mt-8 grid w-full gap-3">
          {links.map((link, index) => (
            <li key={link.id}>
              <BioLinkCard link={link} index={index} />
            </li>
          ))}
        </ul>

        <footer className="mt-10 text-center text-sm text-ink/70">
          <Link href="/" className="font-heading font-semibold text-ink hover:underline">
            {bio.footer}
          </Link>
          <p className="mt-1">{site.pillars}</p>
        </footer>
      </div>
    </main>
  );
}
