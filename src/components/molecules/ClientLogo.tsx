import Image from "next/image";
import type { Client } from "@/types";

type ClientLogoProps = {
  client: Client;
};

export function ClientLogo({ client }: ClientLogoProps) {
  if (!client.logo) {
    return <span className="font-heading text-lg font-semibold text-ink/80">{client.name}</span>;
  }

  return (
    <Image
      src={client.logo}
      alt={client.name}
      width={160}
      height={64}
      className="h-10 w-auto opacity-70 grayscale md:h-12"
    />
  );
}
