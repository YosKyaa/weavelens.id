import type { ReactNode } from "react";
import { PageHeader } from "@/components/molecules/PageHeader";
import { portal } from "@/content/portal";

/** Pilihan koleksi ada di grup "Konten website (CMS)" pada menu samping. */
export default function CmsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title={portal.cms.heading} description={portal.cms.intro} />
      {children}
    </>
  );
}
