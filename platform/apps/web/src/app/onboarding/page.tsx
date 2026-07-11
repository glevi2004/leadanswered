import { redirect } from "next/navigation";

/**
 * Onboarding is ADMIN-LED now — the wizard lives at /admin/[organizationId]/onboard and is run by the
 * admin. This organization-facing route is retired; anyone who lands here (a stale link/bookmark) is
 * sent home to be role-routed. The OnboardingWizard component + actions in this folder are still used
 * by the admin route and by Settings.
 */
export default function OnboardingPage() {
  redirect("/");
}
