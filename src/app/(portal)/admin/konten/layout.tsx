import type { ReactNode } from "react";
import { CmsNav } from "@/components/molecules/CmsNav";
import { PageHeader } from "@/components/molecules/PageHeader";
import { portal } from "@/content/portal";

export default function CmsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title={portal.cms.heading} description={portal.cms.intro} />
      <div className="-mt-2 mb-8">
        <CmsNav />
      </div>
      {children}
    </>
  );
}
