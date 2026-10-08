import { FormSection } from "@/components/molecules/FormSection";
import { PageHeader } from "@/components/molecules/PageHeader";
import { AccountForm } from "@/components/organisms/AccountForm";
import { MfaSettings } from "@/components/organisms/MfaSettings";
import { teamText } from "@/content/team";
import { requireStaff } from "@/lib/auth";

export default async function AccountPage() {
  const { profile, user, mfaEnabled } = await requireStaff();

  return (
    <>
      <PageHeader title={teamText.account.title} description={teamText.account.description} />
      <FormSection title="Profil & password" className="max-w-2xl">
        <AccountForm fullName={profile.full_name ?? ""} email={user.email ?? ""} />
      </FormSection>
      <FormSection title="Verifikasi 2 langkah" className="mt-5 max-w-2xl">
        <MfaSettings enabled={mfaEnabled} />
      </FormSection>
    </>
  );
}
