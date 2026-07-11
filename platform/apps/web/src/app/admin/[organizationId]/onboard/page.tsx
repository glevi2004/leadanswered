import { notFound, redirect } from "next/navigation";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { getOrganizationConfigById } from "@/lib/organizations";
import { initialFromOrganization } from "@/lib/onboarding-state";
import { OnboardingWizard } from "@/app/onboarding/OnboardingWizard";
import { saveOnboardingAdminAction } from "../../actions";

/**
 * Admin-led onboarding: the admin runs the SAME wizard on behalf of a target organization (usually on a
 * call). Finishing saves the config AND sends the first invite (saveOnboardingAdminAction).
 */
export default async function AdminOnboardPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!isAdminEmail(user.email)) redirect("/");

  const { organizationId } = await params;
  const organization = await getOrganizationConfigById(organizationId);
  if (!organization) notFound();

  return (
    <OnboardingWizard
      initial={initialFromOrganization(organization as Record<string, any>)}
      save={saveOnboardingAdminAction.bind(null, organizationId)}
      afterHref={`/admin/${organizationId}`}
      finishLabel="Finish & send invite"
    />
  );
}
