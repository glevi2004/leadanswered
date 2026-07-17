import { redirect } from "next/navigation";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { getOrganizationByOwnerEmail } from "@/lib/organizations";
import { DEFAULT_TIMEZONE } from "@/lib/config";

/**
 * Resolve the signed-in owner's organization for the dashboard, or redirect:
 * no user → sign-in, admin → /admin, no linked org → "/", org not yet onboarded → /onboarding
 * (the self-serve Lu onboarding). Always the owner's REAL Supabase org — every surface renders
 * from real data (honest-empty until data lands).
 * Returns the full organization row (loosely typed — it's a supabase-js result).
 */
export async function requireOrganization(): Promise<Record<string, any>> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (isAdminEmail(user.email)) redirect("/admin");

  const organization = await getOrganizationByOwnerEmail(user.email ?? "");
  if (!organization) redirect("/"); // no org linked yet → "almost set" card
  if (!organization.onboardingComplete) redirect("/onboarding"); // finish self-serve setup
  return organization as Record<string, any>;
}

/** The organization's configured timezone (falls back to ET). */
export const organizationTz = (c: Record<string, any>): string =>
  c?.standingAvailability?.timezone ?? DEFAULT_TIMEZONE;
