import { BatikPattern } from "@/components/atoms/BatikPattern";
import { ClientLogo } from "@/components/molecules/ClientLogo";
import { clientsLabel } from "@/content/clients";
import { site } from "@/content/site";
import { getCms } from "@/lib/cms/data";
import { cn, container } from "@/lib/utils";

type ClientStripProps = {
  className?: string;
};

/** Minimal jumlah logo dalam satu putaran marquee, supaya pita tidak kosong. */
const MIN_PER_LOOP = 8;

export async function ClientStrip({ className }: ClientStripProps) {
  const { clients } = await getCms();
  if (clients.length === 0) return null;

  const repeat = Math.max(1, Math.ceil(MIN_PER_LOOP / clients.length));
  const loop = Array.from({ length: repeat }, () => clients).flat();

  return (
    <section aria-label={site.a11y.clientList} className={cn("relative py-10", className)}>
      {/* Pita batik parang tipis di tepi atas, bergerak menyamping. */}
      <BatikPattern
        id="batik-client-band"
        variant="parang"
        drift="x"
        speed={30}
        className="bottom-auto h-5 opacity-20"
      />
      <div className={cn(container, "flex flex-col items-center gap-5 md:flex-row md:gap-10")}>
        <p className="shrink-0 text-sm text-ink/80">{clientsLabel}</p>
        {/* Daftar asli untuk pembaca layar; pita bergerak hanya visual. */}
        <ul className="sr-only">
          {clients.map((client) => (
            <li key={client.id}>{client.name}</li>
          ))}
        </ul>
        <div
          aria-hidden
          className="marquee relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
        >
          <div className="marquee-track flex w-max items-center gap-12">
            {[...loop, ...loop].map((client, index) => (
              <ClientLogo key={`${client.id}-${index}`} client={client} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
