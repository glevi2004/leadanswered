import type { ComponentType } from "react";
import { Calendar, Users } from "lucide-react";
import type { OrgProfile, SetupStepKey } from "@/lib/data/org-profile";
import type { ModuleKey, ModuleStatus } from "@/lib/data/shared";
import { patchOnboardedProfile } from "@/lib/org-cookie";

/**
 * The in-app "continue onboarding" steps — surfaced as rows inside Home's
 * "Needs you" card (same UI as approvals/escalations). Each row expands to a
 * "Set up with {assistant}" action that marks the step done, unlocks the module
 * it fronts, and navigates so the server re-reads the cookie.
 */
export type SetupRung = {
  key: SetupStepKey;
  label: string;
  /** shown in the expanded row, in the assistant's voice */
  detail: string;
  icon: ComponentType<{ className?: string }>;
  route?: string; // full navigation target; absent ⇒ just reload
  moduleKey?: ModuleKey; // module to flip to "live" on completion
};

export const SETUP_RUNGS: SetupRung[] = [
  { key: "team", label: "Add your team", detail: "I'll add your crew and build an org chart — who can text me, and what each person's allowed to do.", icon: Users, route: "/team", moduleKey: "team" },
  { key: "google", label: "Connect Google Calendar", detail: "Connect your calendar so I book around what's already on it.", icon: Calendar },
];

/** Complete a rung: mark it done, unlock its module, then navigate to where you build it. */
export function runSetupRung(rung: SetupRung, _profile: OrgProfile): void {
  const modules: Partial<Record<ModuleKey, ModuleStatus>> = rung.moduleKey ? { [rung.moduleKey]: "live" } : {};
  const setupSteps: Partial<Record<SetupStepKey, boolean>> = { [rung.key]: true };
  patchOnboardedProfile({ setupSteps, modules });
  if (rung.route) window.location.href = rung.route;
  else window.location.reload();
}

/** How many setup rungs remain for this profile (0 ⇒ nothing to surface). */
export function pendingSetupCount(profile: OrgProfile): number {
  return SETUP_RUNGS.filter((r) => !profile.setupSteps[r.key]).length;
}

/**
 * Apps the owner installed but skipped first-run setup on. Per-app first-run gating
 * was removed with the fixed-nav cut-over, so there are none to surface — kept as a
 * stable no-op so the "Needs you" callers compile unchanged.
 */
export function skippedAppKeys(_profile: OrgProfile): ModuleKey[] {
  return [];
}
