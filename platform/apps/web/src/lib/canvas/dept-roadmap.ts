import type { DeptId } from "./graph";

/**
 * Per-department onboarding roadmaps (Cofounder-style "Department Roadmap" card) —
 * pure mock data feeding <RoadmapStepper>. Each roadmap has a `setup` meter
 * ([completed, total] segments for the "n/7 Setup" pill in the header) and an
 * ordered list of milestone `steps`. Exactly one step is `in_progress`; everything
 * after it is `locked` until earlier steps land. A real setup-state store replaces
 * this later.
 */

export type RoadmapStepState = "done" | "in_progress" | "locked";

export interface RoadmapStep {
  title: string;
  state: RoadmapStepState;
  /** overrides the default status line for a locked step */
  note?: string;
}

export interface DeptRoadmap {
  /** [completed, total] segments for the header "n/7 Setup" meter */
  setup: [number, number];
  steps: RoadmapStep[];
}

/** Thin fallback for departments without a bespoke roadmap yet. */
const THIN: DeptRoadmap = {
  setup: [1, 7],
  steps: [
    { title: "Connect your tools", state: "in_progress" },
    { title: "Bring your data in", state: "locked" },
    { title: "Turn on the agent", state: "locked" },
  ],
};

export const DEPT_ROADMAP: Record<DeptId, DeptRoadmap> = {
  sales: {
    setup: [1, 7],
    steps: [
      { title: "Define positioning", state: "in_progress" },
      { title: "Gather prospects", state: "locked" },
      { title: "Setup outbound email", state: "locked" },
      { title: "Send cold outreach", state: "locked" },
    ],
  },
  finance: {
    setup: [1, 7],
    steps: [
      { title: "Connect a payout rail", state: "in_progress" },
      { title: "Import open invoices", state: "locked" },
      { title: "Turn on auto-reminders", state: "locked" },
      { title: "Reconcile", state: "locked" },
    ],
  },
  operations: THIN,
  legal: THIN,
  engineering: THIN,
  design: THIN,
  marketing: THIN,
  support: THIN,
};
