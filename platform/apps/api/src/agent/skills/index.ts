import type { Skill } from "./types.js";
import { onboardingSkill } from "./onboarding.js";

// ─────────────────────────────────────────────────────────────────────────────
// Skill registry (docs/product.md �5). The reusable-procedure system: any agent can
// LOAD a skill by name and follow its `procedure`. Onboarding is the first skill;
// add more by writing a module and registering it here.
// ─────────────────────────────────────────────────────────────────────────────

const SKILLS: Record<string, Skill> = {
  [onboardingSkill.name]: onboardingSkill,
};

/** Load a skill by name, or null if there is none. */
export function getSkill(name: string): Skill | null {
  return SKILLS[name] ?? null;
}

/** All registered skills (for listings / debugging). */
export function listSkills(): Skill[] {
  return Object.values(SKILLS);
}

export type { Skill } from "./types.js";
