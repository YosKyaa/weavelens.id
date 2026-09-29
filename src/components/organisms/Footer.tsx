import { AmbientGlow } from "@/components/atoms/AmbientGlow";
import { BatikPattern } from "@/components/atoms/BatikPattern";
import { Logo } from "@/components/atoms/Logo";
import { Ornament } from "@/components/atoms/Ornament";
import { WaLink } from "@/components/atoms/WaLink";
import { site } from "@/content/site";
import { getCms } from "@/lib/cms/data";
import { cn, container } from "@/lib/utils";

const headingClass = "font-heading text-sm font-semibold text-paper";
const linkClass =
  "text-paper/85 underline decoration-paper/30 underline-offset-4 transition-colors hover:text-paper hover:decoration-paper";

/** Footer gelap bergradasi dengan batik bergerak dan kartu admin glass. */
export async function Footer() {
  const { admins, contact } = await getCms();
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-[linear-gradient(160deg,#2b1a17_0%,#3d201b_55%,#5c2822_100%)] text-paper">
      <BatikPattern
        id="batik-footer"
        variant="kawung"
        tone="light"
        speed={100}
        className="opacity-[0.06]"
      />
      <BatikPattern
        id="batik-footer-band"
        variant="parang"
        tone="light"
        drift="x"
        speed={30}
        className="bottom-auto h-5 opacity-25"
      />
      <AmbientGlow tone="light" className="-top-40 left-1/3 size-[36rem]" />
      <Ornament className="spin-slow -right-28 -bottom-28 size-96 opacity-[0.08] brightness-[3] [--spin-speed:90s]" />

      <div className={cn(container, "relative grid gap-12 pt-20 pb-12 md:grid-cols-12")}>
        <div className="md:col-span-4">
          <Logo className="h-10 brightness-0 invert-[0.97]" />
          <p className="mt-5 max-w-xs font-heading text-lg font-semibold">{site.tagline}</p>
          <p className="mt-1 text-sm text-paper/70">{site.pillars}</p>
          <p className="mt-3 text-paper/80">{contact.address}</p>
        </div>

        <nav aria-label={site.footer.menuHeading} className="md:col-span-2">
          <p className={headingClass}>{site.footer.menuHeading}</p>
          <ul className="mt-4 space-y-3">
            {site.nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className={linkClass}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-3">
          <p className={headingClass}>{site.footer.contactHeading}</p>
          <ul className="mt-4 space-y-3">
            {admins.map((admin, index) => (
              <li key={admin.id}>
                <WaLink
                  section="footer"
                  variant="tile"
                  admin={admin}
                  label={site.wa.chooser.adminLabel(index)}
                  sub={admin.display}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-3">
          <p className={headingClass}>{site.footer.infoHeading}</p>
          <ul className="mt-4 space-y-3 text-paper/85">
            <li>{contact.area}</li>
            <li>{contact.responseHours}</li>
            <li>
              <span className="block text-sm text-paper/70">{site.footer.instagramLabel}</span>
              <a
                href={contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {contact.instagramHandle}
              </a>
            </li>
            <li>
              <span className="block text-sm text-paper/70">{site.footer.emailLabel}</span>
              <a href={`mailto:${contact.email}`} className={linkClass}>
                {contact.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="relative border-t border-paper/15">
        <p className={cn(container, "py-6 pb-24 text-sm text-paper/70 md:pb-6")}>
          {site.footer.copyright(year)}
        </p>
      </div>
    </footer>
  );
}
