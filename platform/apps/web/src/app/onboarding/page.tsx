import { redirect } from "next/navigation";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { getOrganizationByOwnerEmail } from "@/lib/organizations";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

/**
 * Self-serve Lu onboarding (VISION-LU §3). The owner talks to Lu; on finish we persist their
 * config + boot their departments (see `completeOnboarding`) and open the real workspace.
 * Reachable only by a logged-in owner whose org exists but isn't onboarded yet:
 *   - no user → sign-in, admin → /admin, no linked org → "/", already onboarded → /home.
 * (The dev preview of this same flow — cookie mock, no real backend — lives at /dev/onboarding.)
 */
export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (isAdminEmail(user.email)) redirect("/admin");

  const organization = await getOrganizationByOwnerEmail(user.email ?? "");
  if (!organization) redirect("/"); // no org linked yet → "almost set" card
  if (organization.onboardingComplete) redirect("/canvas"); // already set up

  return (
    <div className="min-h-svh bg-sidebar">
      <OnboardingFlow />
    </div>
  );
}
