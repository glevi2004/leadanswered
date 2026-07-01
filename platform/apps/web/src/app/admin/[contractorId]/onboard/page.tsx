import { notFound, redirect } from "next/navigation";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { getContractorConfigById } from "@/lib/contractors";
import { initialFromContractor } from "@/lib/onboarding-state";
import { OnboardingWizard } from "@/app/onboarding/OnboardingWizard";
import { saveOnboardingAdminAction } from "../../actions";

/**
 * Admin-led onboarding: the admin runs the SAME wizard on behalf of a target contractor (usually on a
 * call). Finishing saves the config AND sends the first invite (saveOnboardingAdminAction).
 */
export default async function AdminOnboardPage({
  params,
}: {
  params: Promise<{ contractorId: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!isAdminEmail(user.email)) redirect("/");

  const { contractorId } = await params;
  const contractor = await getContractorConfigById(contractorId);
  if (!contractor) notFound();

  return (
    <OnboardingWizard
      initial={initialFromContractor(contractor as Record<string, any>)}
      save={saveOnboardingAdminAction.bind(null, contractorId)}
      afterHref={`/admin/${contractorId}`}
      finishLabel="Finish & send invite"
    />
  );
}
