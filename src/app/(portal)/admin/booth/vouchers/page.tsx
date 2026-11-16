import { PageHeader } from "@/components/molecules/PageHeader";
import { BoothVoucherManager, type BoothVoucherView } from "@/components/organisms/booth/BoothVoucherManager";
import { requirePermission } from "@/lib/auth";

/** Paket bawaan tablet (DefaultData.packages), supaya voucher bisa dibatasi ke paket yang belum ada di portal. */
const TABLET_DEFAULT_PACKAGES = [
  { id: "digital", label: "Digital saja (bawaan tablet)" },
  { id: "strip", label: "2 strip cetak (bawaan tablet)" },
  { id: "cetak-digital", label: "Cetak + digital (bawaan tablet)" },
];

export default async function BoothVouchersPage() {
  const { supabase } = await requirePermission("booth");
  const [vouchers, packages, events] = await Promise.all([
    supabase
      .from("booth_vouchers")
      .select("code, kind, value, package_ids, max_uses, used, valid_until, active")
      .order("created_at", { ascending: false }),
    supabase.from("booth_packages").select("id, name, event_id").order("sort"),
    supabase.from("booth_events").select("id, name"),
  ]);
  const eventName = new Map((events.data ?? []).map((event) => [event.id, event.name]));

  return (
    <>
      <PageHeader
        title="Voucher"
        description="Potongan harga paket untuk semua booth. Butuh internet di booth saat kode diketik."
      />
      <BoothVoucherManager
        vouchers={(vouchers.data ?? []).map(
          (voucher): BoothVoucherView => ({
            code: voucher.code,
            kind: voucher.kind as BoothVoucherView["kind"],
            value: voucher.value,
            packageIds: voucher.package_ids,
            maxUses: voucher.max_uses,
            used: voucher.used,
            validUntil: voucher.valid_until,
            active: voucher.active,
          }),
        )}
        packages={[
          ...(packages.data ?? []).map((pkg) => ({
            id: pkg.id,
            label: `${pkg.name} (${eventName.get(pkg.event_id) ?? pkg.event_id})`,
          })),
          ...TABLET_DEFAULT_PACKAGES,
        ]}
      />
    </>
  );
}
