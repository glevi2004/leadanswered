"use server";

import { organizationConfigSchema } from "@/lib/config";
import { getOrganizationByOwnerEmail, setOrganizationConfig } from "@/lib/organizations";
import { currentUser } from "@/lib/auth";

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
