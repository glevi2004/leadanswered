import { cookies } from "next/headers";
import type { ModuleKey, ModuleStatus } from "./shared";
import type { AvailabilityWindow } from "@/lib/onboarding-state";
import type { Member } from "./team/types";
import { APEX } from "./fixtures/apex";

/**
 * Demo "org profiles" (VISION-LU): preview the app as one of two orgs.
 *
 * - **Mature** — the fully-populated Apex Roofing fixture (demo mode, Apex data).
 * - **New** — a freshly-onboarded, honest-empty org whose CONFIG is injected as
 *   the `organization` object while its DATA comes from the REAL Supabase path
 *   against a non-existent org id (so empty comes for free).
 *
 * Driven by two cookies:
 * - `la_org` — "off" | "mature" | "new" (absent = off): the profile selector.
 * - `la_org_profile` — a JSON-serialized `OrgProfile` (present only for "new").
 */

export const ORG_MODE_COOKIE = "la_org"; // "off" | "mature" | "new"
export const ORG_PROFILE_COOKIE = "la_org_profile"; // JSON OrgProfile

export type SetupStepKey =
  | "assistant"
  | "hours"
  | "google"
  | "team"
  | "website"
  | "reviews"
  | "import"
  | "domain";

export interface OrgProfile {
  id: string; // e.g. "org_new"
  companyName: string;
  ownerName?: string;
  sarahName: string; // the org's assistant name (default "Lu")
  personaNotes?: string | null;
  projectTypes?: string[];
  standingAvailability?: { timezone: string; windows: AvailabilityWindow[] };
  twilioNumber?: string; // the assistant line
  ownerCell?: string;
  siteHandle?: string; // "{handle}.lu.computer"
  assistantEmail?: string; // "{handle}@lu.computer"
  gcalConnected?: boolean;
  recipients?: Array<Record<string, unknown>>;
  modules: Partial<Record<ModuleKey, ModuleStatus>>; // per-org unlock overrides
  setupSteps: Partial<Record<SetupStepKey, boolean>>; // progress
  // Saved Dashboard layout (react-grid-layout item geometry). Absent = a later agent
  // provides the default layout; onboarding leaves this unset.
  dashboard?: { i: string; x: number; y: number; w: number; h: number }[];
  seedMembers?: Member[]; // team org chart, seeded on unlock
}

/** The spine every workspace starts with (WORKSPACE-ASSEMBLY §6) — CRM + Schedule. */
export const BASE_CAPABILITIES: Partial<Record<ModuleKey, ModuleStatus>> = { crm: "live", schedule: "live" };

/** A minimal default New org — used when la_org="new" but no profile cookie yet. */
export function emptyProfile(): OrgProfile {
  return {
    id: "org_new",
    companyName: "Your Company",
    sarahName: "Lu",
    modules: { ...BASE_CAPABILITIES },
    setupSteps: {},
  };
}

/** Shape a New org's injected config as the supabase-org-row the app pages read. */
export function buildOnboardedOrg(p: OrgProfile): Record<string, any> {
  return {
    id: p.id,
    name: p.ownerName || p.companyName, // pages use organization.name for the owner's first name
    companyName: p.companyName,
    sarahName: p.sarahName,
    sarahPersonaNotes: p.personaNotes ?? null,
    projectTypes: p.projectTypes ?? [],
    standingAvailability: p.standingAvailability ?? { timezone: "America/New_York", windows: [] },
    twilioNumber: p.twilioNumber,
    recipients: p.recipients ?? [],
    verificationStatus: "verified",
    onboardingComplete: true,
    modules: p.modules ?? {},
    demoProfile: "new",
    __profile: p, // stash the full profile so pages (team) can read seedMembers/setupSteps
  };
}

/** Shape the Mature (Apex) org config as the supabase-org-row the app pages read. */
export function buildApexOrg(): Record<string, any> {
  return {
    id: "org_apex",
    name: APEX.ownerName,
    companyName: APEX.companyName,
    sarahName: "Lu",
    twilioNumber: "(844) 415-7642",
    standingAvailability: {
      timezone: APEX.timezone,
      windows: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, start: "08:00", end: "17:00" })),
    },
    verificationStatus: "verified",
    onboardingComplete: true,
    modules: {},
    demoProfile: "mature",
    __profile: null,
  };
}

/** Read the active profile selector from the `la_org` cookie. Default "off". */
export async function readOrgMode(): Promise<"off" | "mature" | "new"> {
  const store = await cookies();
  const mode = store.get(ORG_MODE_COOKIE)?.value;
  if (mode === "mature" || mode === "new") return mode;
  return "off";
}

/** Read + parse the New org's injected profile (only when mode is "new"). */
export async function readOrgProfile(): Promise<OrgProfile | null> {
  const mode = await readOrgMode();
  if (mode !== "new") return null;
  const store = await cookies();
  const raw = store.get(ORG_PROFILE_COOKIE)?.value;
  if (!raw) return emptyProfile();
  try {
    return JSON.parse(decodeURIComponent(raw)) as OrgProfile;
  } catch {
    return emptyProfile();
  }
}

/** Resolve the injected org row for the active profile, or null when "off". */
export async function resolveInjectedOrg(): Promise<Record<string, any> | null> {
  const mode = await readOrgMode();
  if (mode === "mature") return buildApexOrg();
  if (mode === "new") return buildOnboardedOrg((await readOrgProfile()) ?? emptyProfile());
  return null;
}
