import type { Metadata } from "next";
import { BioTemplate } from "@/components/templates/BioTemplate";
import { bio } from "@/content/bio";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: bio.meta.title,
  description: bio.meta.description,
  alternates: { canonical: `${site.url}/bio` },
  openGraph: {
    title: bio.meta.title,
    description: bio.meta.description,
    url: `${site.url}/bio`,
    siteName: site.name,
    locale: site.locale,
    type: "website",
  },
};

export default function BioPage() {
  return <BioTemplate />;
}
