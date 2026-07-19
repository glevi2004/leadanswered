"use server";

import { type OrganizationConfigInput } from "@/lib/config";
import { getOrganizationByOwnerEmail, setOrganizationConfig } from "@/lib/organizations";
import { currentUser } from "@/lib/auth";
import { PROXY_HEADERS } from "@/lib/dock/backend";

/**
 * API base for the apps/api backend (reuses the same env the calendar/schedule
 * actions read). Localhost default matches apps/api's dev PORT (3000).
 */
const API_BASE = (process.env.API_PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * Finish sign-up (the static screens: name → role → idea stage → company). Persists a minimal
 * honest-empty config (which flips `onboardingComplete=true`), seeds Lu's memory with the sign-up
 * answers, then fires her kickoff so she opens the interview. No department is activated here — the
 * owner accepts activation later, in the workspace. On success the client redirects to /canvas.
 */
export async function finishSignup(input: {
  ownerName: string;
  role: string;
  ideaStage: string;
  companyName: string;
}): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user?.email) return { error: "You're not signed in." };

  const organization = await getOrganizationByOwnerEmail(user.email);
  if (!organization) return { error: "No organization is linked to your account yet." };

  const config: OrganizationConfigInput = {
    companyName: input.companyName?.trim() || "Your Company",
    assistantName: "Lu",
    personaNotes: null,
    projectTypes: [],
    serviceArea: { baseLocations: [], includeOverrides: [], excludeOverrides: [] },
    qualificationRules: { requireDecisionMaker: true },
    standingAvailability: { timezone: "America/New_York", windows: [] },
    escalationTopics: [],
    recipients: [],
  };

  try {
    await setOrganizationConfig(organization.id, config);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save your setup." };
  }

  // Seed Lu's memory from the sign-up answers. Best-effort: a backend hiccup never blocks
  // reaching the workspace.
  try {
    await fetch(`${API_BASE}/api/onboarding/context`, {
      method: "POST",
      headers: { "content-type": "application/json", ...PROXY_HEADERS },
      body: JSON.stringify({
        orgId: organization.id,
        companyName: input.companyName,
        ownerName: input.ownerName,
        role: input.role,
        ideaStage: input.ideaStage,
      }),
    });
  } catch (e) {
    console.error("[finishSignup] context seed error:", e);
  }

  // Lu speaks first: fire the kickoff turn so her opener is already in the thread when the
  // canvas loads. Idempotent server-side (empty-thread check) and best-effort — the dock's
  // empty-thread fallback re-fires it if this misses.
  try {
    await fetch(`${API_BASE}/api/lu/kickoff`, {
      method: "POST",
      headers: { "content-type": "application/json", ...PROXY_HEADERS },
      body: JSON.stringify({ orgId: organization.id }),
    });
  } catch (e) {
    console.error("[finishSignup] kickoff error:", e);
  }

  return {};
}
