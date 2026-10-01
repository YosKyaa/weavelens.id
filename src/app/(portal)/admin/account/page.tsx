import { FormSection } from "@/components/molecules/FormSection";
import { PageHeader } from "@/components/molecules/PageHeader";
import { AccountForm } from "@/components/organisms/AccountForm";
import { teamText } from "@/content/team";
import { requireStaff } from "@/lib/auth";

export default async function AccountPage() {
  const { profile, user } = await requireStaff();

  return (
    <>
      <PageHeader title={teamText.account.title} description={teamText.account.description} />
      <FormSection title="Profil & password" className="max-w-2xl">
        <AccountForm fullName={profile.full_name ?? ""} email={user.email ?? ""} />
      </FormSection>
    </>
  );
}
