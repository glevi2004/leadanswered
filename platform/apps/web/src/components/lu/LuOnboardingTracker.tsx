"use client";

import * as React from "react";
import { useLu } from "./lu-context";
import { OnboardingDecisionsCard } from "./OnboardingDecisionsCard";
import { BusinessPlanCard } from "./BusinessPlanCard";
import {
  useOnboardingMode,
  useDockData,
  usePublishApprovals,
  decisionsFromArtifact,
  businessPlanFromArtifact,
} from "@/lib/dock/live";

/**
 * The Phase-2 onboarding wire, rendered INSIDE the thread beside LuBuildTracker. While the
 * org is mid-onboarding (GET /api/dock/onboarding → active), Lu produces org-level `doc`
 * artifacts the owner acts on right here in the conversation:
 *   decisions (onboarding_decisions) → owner decides → Lu drafts the plan (business_plan)
 *   → owner accepts → the activate_departments approval boots the company.
 * Once the business plan exists the decisions are done, so we hide them; once onboarding-mode
 * goes false (departments activated) this renders nothing at all.
 *
 * Gated on the same surface-active signal LuBuildTracker uses: the dock's Lu tab (dockOpen)
 *. Returns null unless onboarding-mode is active.
 */
export function LuOnboardingTracker() {
  const { dockOpen } = useLu();
  const surfaceActive = dockOpen;

  const onboarding = useOnboardingMode(surfaceActive);
  const dataActive = surfaceActive && onboarding;
  const { artifacts } = useDockData(dataActive);
  const { approvals, resolve, pending } = usePublishApprovals(dataActive);

  if (!onboarding) return null;

  const docs = artifacts.filter((a) => a.kind === "doc");
  // Latest of each doc type (artifacts arrive append-ordered; take the last match).
  const planDoc = [...docs].reverse().find((a) => businessPlanFromArtifact(a.payload) !== null);
  const decisionsDoc = [...docs].reverse().find((a) => decisionsFromArtifact(a.payload) !== null);

  const plan = planDoc ? businessPlanFromArtifact(planDoc.payload) : null;
  // Decisions only matter until the plan exists — once Lu drafts the plan they're done.
  const decisions = !plan && decisionsDoc ? decisionsFromArtifact(decisionsDoc.payload) : null;

  const activate = approvals.find((a) => a.action === "activate_departments") ?? null;

  if (!decisions && !plan) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {decisions && (
        <OnboardingDecisionsCard key={decisionsDoc?.id ?? "decisions"} decisions={decisions.decisions} />
      )}
      {plan && (
        <BusinessPlanCard
          key={planDoc?.id ?? "plan"}
          plan={plan}
          approvalId={activate?.id ?? null}
          busy={activate ? pending.has(activate.id) : false}
          onActivate={() => activate && resolve(activate.id, "approved")}
        />
      )}
    </div>
  );
}
