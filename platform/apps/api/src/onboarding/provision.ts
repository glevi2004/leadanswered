import type { AgentRecord, DepartmentWithAgent, Store } from "../store/types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding provisioning (ONBOARDING.md §8, AGENTS-BACKEND.md §2).
// "Boot up your company": create the Engineering department for a fresh org.
// v0: Engineering is the ONLY department — status `active` + a real Agent row.
// (The other keys in DEPARTMENT_KEYS come later.) Idempotent — re-running on an
// already-provisioned org is a no-op that just returns current state.
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
  reasoning: "claude-sonnet-5",
  generation: { image: "gpt-image-1" },
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
 * Create the Engineering department for `orgId` → `active` + a real Agent ("the Engineer").
 * v0: Engineering is the only department. Idempotent: if the org already has any
 * departments, returns the current state without creating duplicates.
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

  // v0: Engineering is the ONLY department. The other 7 (DEPARTMENT_KEYS) come later.
  await store.createDepartment({
    orgId,
    key: ENGINEERING_KEY,
    status: "active",
    context: business ? `Business: ${business}` : "",
  });
  const engineeringAgent = await store.createAgent({
    orgId,
    departmentKey: ENGINEERING_KEY,
    name: "the Engineer",
    role: "Engineering",
    contract: engineeringContract(business),
    models: { ...ENGINEERING_MODELS },
    status: "idle",
  });

  // Seed Lu's CORE memory (plan Pillar 3) so she knows the business from her very first turn —
  // not just the Engineering department/agent (which the orchestrator never reads).
  if (business) {
    await store.upsertMemory({
      orgId,
      tier: "core",
      key: "business",
      content: `Business: ${business}`,
      source: "onboarding",
    });
  }

  const departments = await store.listDepartments(orgId);
  return { departments, engineeringAgent };
}

export interface OnboardingContextInput {
  companyName?: string;
  ownerName?: string;
  role?: string;
  ideaStage?: string;
}

/**
 * Seed Lu's CORE memory from the Phase-1 sign-up answers WITHOUT activating any department
 * (docs/product.md �5 — provisioning is split: Phase 1 seeds context, "Accept & activate"
 * boots the departments). So Lu opens the in-workspace onboarding already knowing who the
 * founder is + the company name + stage, and learns what they're building in the conversation.
 */
export async function seedOnboardingContext(
  store: Store,
  orgId: string,
  input: OnboardingContextInput,
): Promise<void> {
  const parts = [
    input.ownerName?.trim()
      ? `Owner: ${input.ownerName.trim()}${input.role?.trim() ? ` (${input.role.trim()})` : ""}`
      : null,
    input.companyName?.trim() ? `Company: ${input.companyName.trim()}` : null,
    input.ideaStage?.trim() ? `Stage: ${input.ideaStage.trim()}` : null,
  ].filter(Boolean);
  if (parts.length === 0) return;
  const content = `${parts.join(". ")}. (Onboarding in progress — still learning what they're building.)`;
  await store.upsertMemory({ orgId, tier: "core", key: "business", content, source: "onboarding" });
}
