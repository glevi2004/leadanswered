import { tool } from "ai";
import { z } from "zod";
import type { Store } from "../store/types.js";

/**
 * Onboarding-mode tools (docs/product.md §5 Phase 2). Lu only gets these while a
 * company is being onboarded (no department active yet). They write ORG-LEVEL `doc`
 * artifacts the dock renders as cards, and stage the "Accept & activate departments"
 * gate. Same discipline as the orchestrator toolkit: the model chooses the tool, the
 * side effect is deterministic Store code, the result is authoritative.
 */

export interface OnboardingToolDeps {
  store: Store;
}
export interface OnboardingToolContext {
  orgId: string;
}

/** The Business Context doc (roadmap Ch.1) — grows as a DRAFT during the interview,
 *  finalized at convergence. One artifact, upserted in place. */
export const BUSINESS_CONTEXT_DOC_TYPE = "business_context";
/** The approval action the "Accept & activate departments" button resolves. */
export const ACTIVATE_DEPARTMENTS_ACTION = "activate_departments";

/** The latest business_context artifact for the org (draft or final), or null. */
async function latestBusinessContext(store: Store, orgId: string) {
  const arts = await store.listArtifacts({ orgId });
  return (
    arts
      .filter(
        (a) => a.kind === "doc" && (a.payload as { type?: unknown } | null)?.type === BUSINESS_CONTEXT_DOC_TYPE,
      )
      .at(-1) ?? null
  );
}

export function onboardingTools(deps: OnboardingToolDeps, ctx: OnboardingToolContext) {
  return {
    update_business_context: tool({
      description:
        "Record what you've learned into the GROWING Business Context draft — the doc builds live in the owner's Library as the interview progresses. Call this every 2-3 answers with ONLY the fields you newly learned or corrected (they merge into the draft; existing fields persist). Use short plain-English values. Suggested keys (use what applies, add others when needed): intent, wing (start|existing|project), archetype, b2x, dealSize, stage, level, trend, mode, yearsRunning, headcount, teamSize, payrollSafe, ownerDependence, companyName, product, icp, jtbd, problem, model, pricing, gtm, edge, assets, marketSize, ratioName, ratioValue, goalFork, outcome90, oneLiner, mission.",
      inputSchema: z.object({
        fields: z
          .record(z.string(), z.string())
          .describe("Only the newly learned/corrected fields, key → short plain value"),
      }),
      execute: async ({ fields }) => {
        const prior = await latestBusinessContext(deps.store, ctx.orgId);
        const priorPayload = (prior?.payload ?? {}) as { fields?: Record<string, string>; draft?: boolean };
        const merged = { ...(priorPayload.fields ?? {}), ...fields };
        const artifact = await deps.store.addArtifact({
          orgId: ctx.orgId,
          kind: "doc",
          title: "Business Context",
          payload: { type: BUSINESS_CONTEXT_DOC_TYPE, draft: true, fields: merged },
        });
        return { ok: true as const, artifactId: artifact.id, fieldCount: Object.keys(merged).length };
      },
    }),

    finalize_business_context: tool({
      description:
        "Finalize the Business Context and stage the last onboarding gate. Call this at CONVERGENCE — after the interview (or when the owner says to wrap up). Provide the classification, 4-6 sharp company values, and a one-paragraph summary; every field already recorded in the draft rides along automatically. This writes the final doc the owner reviews and stages the 'Accept & activate departments' button — accepting boots their departments and ends scoping. Specific to THIS company, never boilerplate. To revise after feedback, call again.",
      inputSchema: z.object({
        classification: z
          .object({
            companyType: z.string().describe("e.g. 'B2B SaaS / developer tools' or 'Local service business'"),
            industry: z.string().describe("e.g. 'AI infrastructure' or 'Hair & beauty'"),
            userType: z.string().describe("Who it serves, sharply"),
          })
          .describe("How the company is classified"),
        values: z.array(z.string()).min(2).max(8).describe("4-6 sharp, specific company values"),
        summary: z.string().describe("One paragraph describing the company"),
        fields: z
          .record(z.string(), z.string())
          .optional()
          .describe("Any final field corrections (merge into the draft's fields)"),
      }),
      execute: async ({ classification, values, summary, fields }) => {
        // Supersede any prior pending activate gate so exactly one is live (revise loop).
        const pending = await deps.store.listPendingApprovals(ctx.orgId);
        for (const a of pending) {
          if (a.action === ACTIVATE_DEPARTMENTS_ACTION) {
            await deps.store.resolveApproval(a.id, "rejected", "system");
          }
        }
        const prior = await latestBusinessContext(deps.store, ctx.orgId);
        const priorFields = ((prior?.payload ?? {}) as { fields?: Record<string, string> }).fields ?? {};
        const artifact = await deps.store.addArtifact({
          orgId: ctx.orgId,
          kind: "doc",
          title: "Business Context",
          payload: {
            type: BUSINESS_CONTEXT_DOC_TYPE,
            draft: false,
            classification,
            values,
            summary,
            fields: { ...priorFields, ...(fields ?? {}) },
          },
        });
        const approval = await deps.store.createApproval({
          orgId: ctx.orgId,
          action: ACTIVATE_DEPARTMENTS_ACTION,
        });
        return { ok: true as const, artifactId: artifact.id, approvalId: approval.id, staged: true };
      },
    }),
  };
}
