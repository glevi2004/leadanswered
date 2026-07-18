// ─────────────────────────────────────────────────────────────────────────────
// Skills — reusable procedures an agent can LOAD and follow (docs/system.md §1).
// A skill is a named markdown procedure: when an agent is running a skill, its
// `procedure` is injected into that agent's system prompt so the model follows
// the steps. Skills are REAL `.md` files in this directory (frontmatter
// name/description + the markdown body); ./index.ts loads them from disk.
// Add a skill = drop in a file — no code change.
// ─────────────────────────────────────────────────────────────────────────────

export interface Skill {
  /** Stable id used to load the skill (frontmatter `name`, else the filename). */
  name: string;
  /** One line: what this skill is for (surfaced in listings / logs). */
  description: string;
  /** The markdown procedure the agent follows while running this skill. */
  procedure: string;
}
