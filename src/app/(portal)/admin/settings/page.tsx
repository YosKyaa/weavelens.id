import { SettingsForm } from "@/components/organisms/SettingsForm";
import { invoiceText } from "@/content/invoice";
import { requireAdmin } from "@/lib/auth";
import { loadCompany } from "@/lib/invoice-data";

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const company = await loadCompany(supabase);

  return (
    <>
      <p className="mb-5 max-w-2xl text-ink/75">{invoiceText.settings.description}</p>
      <SettingsForm initial={company} />
    </>
  );
}
