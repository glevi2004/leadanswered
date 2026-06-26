import { redirect } from "next/navigation";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { getContractorByOwnerEmail } from "@/lib/contractors";

/**
 * Resolve the signed-in owner's contractor for the dashboard, or redirect:
 * no user → sign-in, admin → /admin, no/unfinished contractor → /onboarding.
 * Returns the full contractor row (loosely typed — it's a supabase-js result).
 */
export async function requireContractor(): Promise<Record<string, any>> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (isAdminEmail(user.email)) redirect("/admin");

  const contractor = await getContractorByOwnerEmail(user.email ?? "");
  if (!contractor || !contractor.onboardingComplete) redirect("/onboarding");
  return contractor as Record<string, any>;
}

/** The contractor's configured timezone (falls back to ET). */
export const contractorTz = (c: Record<string, any>): string =>
  c?.standingAvailability?.timezone ?? "America/New_York";
