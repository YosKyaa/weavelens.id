import { PageHeader } from "@/components/molecules/PageHeader";
import { SettingsForm } from "@/components/organisms/SettingsForm";
import { invoiceText } from "@/content/invoice";
import { requireAdmin } from "@/lib/auth";
import { loadCompany } from "@/lib/invoice-data";

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const company = await loadCompany(supabase);

  return (
    <>
      <PageHeader
        title={invoiceText.settings.title}
        description={invoiceText.settings.description}
      />
      <SettingsForm initial={company} />
    </>
  );
}
