import type { AgentRecord, DepartmentWithAgent, Store } from "../store/types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding provisioning (ONBOARDING.md §3/§4, AGENTS-BACKEND.md §2).
// "Boot up your company": create the 8 fixed Department rows for a fresh org.
// Engineering is the ONE real agent (status `active` + an Agent row); the other
// 7 land as `in_development` locked tiles with no agent. Idempotent — re-running
// on an already-provisioned org is a no-op that just returns current state.
// ─────────────────────────────────────────────────────────────────────────────

/** The 8 fixed departments, in canvas order. Engineering is the only real one (v0). */
export const DEPARTMENT_KEYS = [
  "support",
  "operations",
  "finance",
  "legal",
  "engineering",
  "design",
  "marketing",
  "sales",
] as const;

export type DepartmentKey = (typeof DEPARTMENT_KEYS)[number];

/** The one department that ships with a real, working agent at onboarding. */
export const ENGINEERING_KEY: DepartmentKey = "engineering";

/** Default reasoning + generation models for the Engineering agent (AGENTS-BACKEND §5b). */
const ENGINEERING_MODELS = {
  reasoning: "claude-sonnet-4-5",
  generation: { image: "higgsfield" },
} as const;

/** The Engineering agent's CONTRACT.md — its identity file (AGENTS-BACKEND §5a). */
export function engineeringContract(business?: string): string {
  const knows = business?.trim()
    ? `- The business: ${business.trim()}`
    : `- The business (filled in from onboarding — brand, voice, and offering).`;
  return `# the Engineer — Engineering

## Role
I'm your Engineering department. I build and ship your sites and software — I turn
"build me X" into a real, deployed thing on the web.

## Duties
- Build your marketing/booking site from your brand and generate its hero imagery.
- Ship changes to a preview, then publish approved work to production.
- Set up and maintain your \`{slug}.lu.computer\` site (and your own domain later).
- Work in a sandbox: clone the repo, edit, run tests, open a PR with a preview link.

## Boundaries
- **Always:** work on a branch, run the build/tests, open a PR with a preview URL first.
- **Ask first (→ approval):** publishing to production, merging a PR, spending money.
- **Never:** touch production without an approved change; delete work without a backup.

## Voice
Direct, concrete, low-ceremony. I report what I built and link the preview — no jargon.

## Knowledge
${knows}
- I read the repo's \`AGENTS.md\` for how that codebase works; this CONTRACT is who I am.

## Playbooks
- "Build my site" → scaffold from a starter → theme to your brand → preview → you approve → publish.

## Models
- Reasoning: ${ENGINEERING_MODELS.reasoning} (coding quality). Image generation: Higgsfield.
`;
}

export interface ProvisionResult {
  departments: DepartmentWithAgent[];
  engineeringAgent: AgentRecord | null;
}

export interface ProvisionOptions {
  /** Free-text business description from onboarding — woven into Engineering's context/contract. */
  business?: string;
}

/**
 * Create the 8 fixed departments for `orgId`. Engineering → `active` + a real Agent
 * ("the Engineer"); the other 7 → `in_development`, no agent. Idempotent: if the org
 * already has any departments, returns the current state without creating duplicates.
 */
export async function provisionDepartments(
  store: Store,
  orgId: string,
  opts: ProvisionOptions = {},
): Promise<ProvisionResult> {
  const existing = await store.listDepartments(orgId);
  if (existing.length > 0) {
    const engineeringAgent =
      existing.find((d) => d.key === ENGINEERING_KEY)?.agent ??
      (await store.getAgentByDepartment(orgId, ENGINEERING_KEY));
    return { departments: existing, engineeringAgent: engineeringAgent ?? null };
  }

  const business = opts.business?.trim() || undefined;
  let engineeringAgent: AgentRecord | null = null;

  for (const key of DEPARTMENT_KEYS) {
    if (key === ENGINEERING_KEY) {
      await store.createDepartment({
        orgId,
        key,
        status: "active",
        context: business ? `Business: ${business}` : "",
      });
      engineeringAgent = await store.createAgent({
        orgId,
        departmentKey: ENGINEERING_KEY,
        name: "the Engineer",
        role: "Engineering",
        contract: engineeringContract(business),
        models: { ...ENGINEERING_MODELS },
        status: "idle",
      });
    } else {
      await store.createDepartment({ orgId, key, status: "in_development" });
    }
  }

  const departments = await store.listDepartments(orgId);
  return { departments, engineeringAgent };
}
