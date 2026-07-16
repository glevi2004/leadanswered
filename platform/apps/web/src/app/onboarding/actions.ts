"use server";

import { organizationConfigSchema, type OrganizationConfigInput } from "@/lib/config";
import { getOrganizationByOwnerEmail, setOrganizationConfig } from "@/lib/organizations";
import { currentUser } from "@/lib/auth";

/**
 * API base for the apps/api backend (reuses the same env the calendar/schedule
 * actions read). Localhost default matches apps/api's dev PORT (3000).
 */
const API_BASE = (process.env.API_PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * Finish the self-serve Lu onboarding for the signed-in owner's REAL organization:
 * persist their config (which flips `onboardingComplete=true`) then boot up their
 * departments via the backend. The department provision is best-effort and idempotent
 * — a backend hiccup never blocks the owner from reaching their (now onboarded) workspace.
 *
 * NOTE: unlike `saveOnboardingAction` (the full self-serve settings form) this does NOT
 * re-run `organizationConfigSchema` — the Lu flow intentionally leaves service area /
 * project types empty (honest-empty), which the strict schema would reject. It reuses
 * the same `OrganizationConfigInput` shape, built by the client.
 */
export async function completeOnboarding(
  config: OrganizationConfigInput,
  business?: string,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await currentUser();
  if (!user?.email) return { error: "You're not signed in." };

  const organization = await getOrganizationByOwnerEmail(user.email);
  if (!organization) return { error: "No organization is linked to your account yet." };

  try {
    await setOrganizationConfig(organization.id, config);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save your setup." };
  }

  // Boot the org's 8 departments (Engineering active). Best-effort: idempotent on the
  // backend, so a failure here just means it can be retried — onboarding still succeeded.
  try {
    const res = await fetch(`${API_BASE}/api/onboarding/provision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId: organization.id, business }),
    });
    if (!res.ok) console.error(`[completeOnboarding] provision failed: ${res.status}`);
  } catch (e) {
    console.error("[completeOnboarding] provision error:", e);
  }

  return { ok: true };
}

/** Validate + persist the client's self-serve config for their own organization. */
export async function saveOnboardingAction(raw: unknown): Promise<{ error?: string; ok?: boolean }> {
  const user = await currentUser();
  if (!user?.email) return { error: "You're not signed in." };

  const organization = await getOrganizationByOwnerEmail(user.email);
  if (!organization) return { error: "No organization is linked to your account yet." };

  const parsed = organizationConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first ? `${first.path.join(".")}: ${first.message}` : "Please check your entries." };
  }

  try {
    await setOrganizationConfig(organization.id, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save." };
  }
  return { ok: true };
}
