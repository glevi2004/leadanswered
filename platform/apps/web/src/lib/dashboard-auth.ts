import { redirect } from "next/navigation";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { getOrganizationByOwnerEmail } from "@/lib/organizations";
import { DEFAULT_TIMEZONE } from "@/lib/config";
import { resolveInjectedOrg } from "./data/org-profile";

/**
 * A real org that finished the self-serve Lu onboarding never configures a service area
 * (that flow is honest-empty). Such an org gets the same "all live, honest-empty" home the
 * onboarding preview showed by carrying `demoProfile: "new"` (drives gating.ts + isNewOrg).
 * The legacy admin-configured org HAS base locations, so it is left untouched — it keeps
 * rendering exactly as today.
 */
function decorateFreshOrg(organization: Record<string, any>): Record<string, any> {
  if (organization.demoProfile) return organization; // already an injected demo profile
  const baseLocations = organization.baseLocations;
  const hasServiceArea = Array.isArray(baseLocations) && baseLocations.length > 0;
  if (organization.onboardingComplete && !hasServiceArea) {
    return { ...organization, demoProfile: "new" };
  }
  return organization;
}

/**
 * Resolve the signed-in owner's organization for the dashboard, or redirect:
 * no user → sign-in, admin → /admin, no linked org → "/", org not yet onboarded → /onboarding
 * (the self-serve Lu onboarding). A real logged-in owner ALWAYS resolves their real org; the
 * injected demo/mock org (la_org cookie) is a dev/preview aid only and is consulted just in
 * development, so a stale cookie can never override a real user in production.
 * Returns the full organization row (loosely typed — it's a supabase-js result).
 */
export async function requireOrganization(): Promise<Record<string, any>> {
  if (process.env.NODE_ENV === "development") {
    const injected = await resolveInjectedOrg();
    if (injected) return injected;
  }

  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (isAdminEmail(user.email)) redirect("/admin");

  const organization = await getOrganizationByOwnerEmail(user.email ?? "");
  if (!organization) redirect("/"); // no org linked yet → "almost set" card
  if (!organization.onboardingComplete) redirect("/onboarding"); // finish self-serve setup
  return decorateFreshOrg(organization as Record<string, any>);
}

/** The organization's configured timezone (falls back to ET). */
export const organizationTz = (c: Record<string, any>): string =>
  c?.standingAvailability?.timezone ?? DEFAULT_TIMEZONE;
