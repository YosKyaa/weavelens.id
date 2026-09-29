import type { ReactNode } from "react";
import { CmsNav } from "@/components/molecules/CmsNav";
import { portal } from "@/content/portal";

export default function CmsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <h1 className="text-3xl">{portal.cms.heading}</h1>
      <div className="mt-5 mb-8">
        <CmsNav />
      </div>
      {children}
    </>
  );
}
