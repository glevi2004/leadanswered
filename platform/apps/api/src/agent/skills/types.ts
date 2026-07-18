// ─────────────────────────────────────────────────────────────────────────────
// Skills — reusable procedures an agent can LOAD and follow (docs/onboarding.md).
// A skill is a named markdown procedure: when an agent is running a skill, its
// `procedure` is injected into that agent's system prompt so the model follows the
// steps. This is the general mechanism ("Lu's onboarding file" is the first skill);
// design/finance/etc. onboarding become skills later.
//
// Skills are plain TS modules (not .md files on disk) because apps/api builds with
// `tsc` and does not copy non-TS assets into dist/. Add a skill = add a module +
// register it in ./index.ts.
// ─────────────────────────────────────────────────────────────────────────────

export interface Skill {
  /** Stable id used to load the skill (e.g. "onboarding"). */
  name: string;
  /** One line: what this skill is for (surfaced in listings / logs). */
  description: string;
  /** The markdown procedure the agent follows while running this skill. */
  procedure: string;
}
