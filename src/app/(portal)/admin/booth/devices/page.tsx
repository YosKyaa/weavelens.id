import { PageHeader } from "@/components/molecules/PageHeader";
import { BoothDeviceManager } from "@/components/organisms/booth/BoothDeviceManager";
import { requirePermission } from "@/lib/auth";

export default async function BoothDevicesPage() {
  const { supabase } = await requirePermission("booth");
  const { data } = await supabase
    .from("booth_devices")
    .select("id, name, active, manage_vouchers, last_seen, app_version")
    .order("created_at");

  return (
    <>
      <PageHeader
        title="Perangkat"
        description="Tablet booth yang boleh mengirim sesi dan pembayaran. Cabut akses bila tablet hilang: tokennya langsung ditolak."
      />
      <BoothDeviceManager
        devices={(data ?? []).map((device) => ({
          id: device.id,
          name: device.name,
          active: device.active,
          manageVouchers: device.manage_vouchers,
          lastSeen: device.last_seen,
          appVersion: device.app_version,
        }))}
      />
    </>
  );
}
