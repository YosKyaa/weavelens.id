import type { ReactNode } from "react";
import { TabNav } from "@/components/molecules/TabNav";
import { requirePermission } from "@/lib/auth";

export const metadata = { title: "Photobooth · WeaveLens" };

const TABS = [
  { href: "/admin/booth", label: "Transaksi & sesi" },
  { href: "/admin/booth/events", label: "Event & paket" },
  { href: "/admin/booth/frames", label: "Frame" },
  { href: "/admin/booth/vouchers", label: "Voucher" },
  { href: "/admin/booth/devices", label: "Perangkat" },
];

/** Menu Photobooth: data aplikasi tablet WeaveLens Booth. Admin, atau tim dengan izin "booth". */
export default async function BoothLayout({ children }: { children: ReactNode }) {
  await requirePermission("booth");
  return (
    <>
      <TabNav label="Menu photobooth" tabs={TABS} />
      {children}
    </>
  );
}
