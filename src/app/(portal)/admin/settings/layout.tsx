import type { ReactNode } from "react";
import { PageHeader } from "@/components/molecules/PageHeader";
import { TabNav } from "@/components/molecules/TabNav";
import { requireAdmin } from "@/lib/auth";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Pengaturan" />
      <TabNav
        label="Bagian pengaturan"
        tabs={[
          { href: "/admin/settings", label: "Perusahaan & invoice" },
          { href: "/admin/settings/system", label: "Sistem & keamanan" },
        ]}
      />
      {children}
    </>
  );
}
