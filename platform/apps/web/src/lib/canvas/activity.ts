"use client";

import * as React from "react";
import { useDockData, type DockTask } from "@/lib/dock/live";

/**
 * REAL canvas activity (COCKPIT Part A/C) — the drop-in replacement for the mock
 * `agent-work.ts` selectors the canvas used to import. It polls the same live dock proxy
 * the dock already uses (`/api/dock/tasks`) and derives, per department, the badge shown
 * above the agent pill ("working" spinner vs "pending" dot + a count) and whether the
 * agent is actively working (drives the animated spoke). No fixtures — an empty org reads
 * honest-empty (no badges), a busy org lights up its agents from real task status.
 *
 * Shapes MATCH the old `agentBadge` / `workingDepts` API so `CompanyCanvas` swaps the mock
 * import for this hook with almost no other change.
 */

export interface AgentBadge {
  kind: "working" | "pending";
  count: number;
}

/** A task still on the board (anything not finished) counts toward the badge. */
function isOpen(status: string): boolean {
  return status !== "done" && status !== "failed" && status !== "cancelled";
}

export interface CanvasActivity {
  /** Badge for a department's agent pill: an in-progress task beats merely-queued ones. */
  agentBadge: (dept: string) => AgentBadge | null;
  /** Departments with a task in progress right now — their spoke animates. */
  workingDepts: () => string[];
  /** True once the first poll has resolved (so callers can distinguish empty from loading). */
  loaded: boolean;
}

export function useCanvasActivity(active: boolean): CanvasActivity {
  const { tasks, loaded } = useDockData(active);

  // Group open tasks by department once per snapshot.
  const byDept = React.useMemo(() => {
    const map = new Map<string, DockTask[]>();
    for (const t of tasks) {
      if (!isOpen(t.status)) continue;
      const key = t.departmentKey || (t.agentId ?? "");
      if (!key) continue;
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    return map;
  }, [tasks]);

  const agentBadge = React.useCallback(
    (dept: string): AgentBadge | null => {
      const list = byDept.get(dept);
      if (!list || list.length === 0) return null;
      const working = list.some((t) => t.status === "in_progress");
      return { kind: working ? "working" : "pending", count: list.length };
    },
    [byDept],
  );

  const workingDepts = React.useCallback(
    (): string[] =>
      [...byDept.entries()]
        .filter(([, list]) => list.some((t) => t.status === "in_progress"))
        .map(([dept]) => dept),
    [byDept],
  );

  return { agentBadge, workingDepts, loaded };
}
