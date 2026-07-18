import { tool } from "ai";
import { z } from "zod";
import type { Store } from "../store/types.js";

/**
 * Onboarding-mode tools (docs/onboarding.md Phase 2). Lu only gets these while a
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

/** The `doc` payload the dock reads for the decision cards. */
export const DECISIONS_DOC_TYPE = "onboarding_decisions";
/** The `doc` payload the dock reads for the Business Plan card. */
export const BUSINESS_PLAN_DOC_TYPE = "business_plan";
/** The approval action the "Accept & activate departments" button resolves. */
export const ACTIVATE_DEPARTMENTS_ACTION = "activate_departments";

export function onboardingTools(deps: OnboardingToolDeps, ctx: OnboardingToolContext) {
  return {
    propose_decisions: tool({
      description:
        "Put a small batch of multiple-choice decisions in front of the founder as cards, each with one Recommended option. Use this ONCE, early in onboarding, for the 3-5 choices that actually change how you'd frame the company (the core problem to solve first, the primary user, the wedge, the business model). Give each decision 3-4 concrete options and mark the single best one as `recommended` (its 0-based index). The founder answers the cards in the dock and their choices come back to you as a normal message; you do NOT wait here.",
      inputSchema: z.object({
        decisions: z
          .array(
            z.object({
              question: z.string().describe("The single decision, phrased as a question"),
              options: z
                .array(
                  z.object({
                    label: z.string().describe("The option, short"),
                    detail: z.string().optional().describe("One line explaining the option"),
                  }),
                )
                .min(2)
                .max(5)
                .describe("2-5 concrete options"),
              recommended: z
                .number()
                .int()
                .describe("0-based index of the single best option (badged Recommended)"),
            }),
          )
          .min(1)
          .max(6)
          .describe("3-5 crisp decisions that change how the company is framed"),
      }),
      execute: async ({ decisions }) => {
        const artifact = await deps.store.addArtifact({
          orgId: ctx.orgId,
          kind: "doc",
          title: "Decisions",
          payload: { type: DECISIONS_DOC_TYPE, decisions },
        });
        return { ok: true as const, artifactId: artifact.id, count: decisions.length };
      },
    }),

    draft_business_plan: tool({
      description:
        "Write the Business Plan and stage the final onboarding gate. Call this AFTER the founder has made the decisions (or told you to decide). Give a classification (companyType, industry, userType), 4-6 sharp company values, and a one-paragraph summary of the company. This writes the Business Plan the owner reviews and stages the 'Accept & activate departments' button. When they accept, their departments activate and onboarding is done. Keep everything specific to THIS company, never boilerplate.",
      inputSchema: z.object({
        classification: z
          .object({
            companyType: z.string().describe("e.g. 'B2B SaaS / developer tools'"),
            industry: z.string().describe("e.g. 'AI infrastructure / agent orchestration'"),
            userType: z.string().describe("e.g. 'Technical builders (founders and small eng teams)'"),
          })
          .describe("How the company is classified"),
        values: z.array(z.string()).min(2).max(8).describe("4-6 sharp, specific company values"),
        summary: z.string().optional().describe("One paragraph describing the company"),
      }),
      execute: async ({ classification, values, summary }) => {
        // Supersede any prior pending activate gate so exactly one is live (revise loop).
        const pending = await deps.store.listPendingApprovals(ctx.orgId);
        for (const a of pending) {
          if (a.action === ACTIVATE_DEPARTMENTS_ACTION) {
            await deps.store.resolveApproval(a.id, "rejected", "system");
          }
        }
        const artifact = await deps.store.addArtifact({
          orgId: ctx.orgId,
          kind: "doc",
          title: "Business Plan",
          payload: { type: BUSINESS_PLAN_DOC_TYPE, classification, values, ...(summary ? { summary } : {}) },
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
