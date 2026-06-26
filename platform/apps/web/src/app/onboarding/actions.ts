"use server";

import { contractorConfigSchema } from "@/lib/config";
import { getContractorByOwnerEmail, setContractorConfig } from "@/lib/contractors";
import { currentUser } from "@/lib/auth";

/** Validate + persist the client's self-serve config for their own contractor. */
export async function saveOnboardingAction(raw: unknown): Promise<{ error?: string; ok?: boolean }> {
  const user = await currentUser();
  if (!user?.email) return { error: "You're not signed in." };

  const contractor = await getContractorByOwnerEmail(user.email);
  if (!contractor) return { error: "No contractor is linked to your account yet." };

  const parsed = contractorConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first ? `${first.path.join(".")}: ${first.message}` : "Please check your entries." };
  }

  try {
    await setContractorConfig(contractor.id, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save." };
  }
  return { ok: true };
}
