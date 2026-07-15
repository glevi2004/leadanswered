import { redirect } from "next/navigation";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { getOrganizationByOwnerEmail } from "@/lib/organizations";
import { DEFAULT_TIMEZONE } from "@/lib/config";
import { resolveInjectedOrg } from "./data/org-profile";

/**
 * Resolve the signed-in owner's organization for the dashboard, or redirect:
 * no user → sign-in, admin → /admin, no/unfinished organization → "/". Onboarding is admin-led now,
 * so a logged-in organization is normally already onboarded; the unfinished case is defensive and
 * routes home (which shows a "setup in progress" message), never the dead organization wizard.
 * Returns the full organization row (loosely typed — it's a supabase-js result).
 */
export async function requireOrganization(): Promise<Record<string, any>> {
  const injected = await resolveInjectedOrg();
  if (injected) return injected;

  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (isAdminEmail(user.email)) redirect("/admin");

  const organization = await getOrganizationByOwnerEmail(user.email ?? "");
  if (!organization || !organization.onboardingComplete) redirect("/");
  return organization as Record<string, any>;
}

/** The organization's configured timezone (falls back to ET). */
export const organizationTz = (c: Record<string, any>): string =>
  c?.standingAvailability?.timezone ?? DEFAULT_TIMEZONE;
