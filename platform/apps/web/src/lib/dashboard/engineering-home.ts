import "server-only";
import { proxyGet } from "@/lib/dock/backend";
import type { DockApproval, DockSite, DockTask } from "@/lib/dock/live";
import { ENGINEERING_DEPT, type EngineeringHomeData } from "./engineering-home-view";

/**
 * REAL data loader for the dashboard home (`/home`) — Engineering only.
 *
 * The reality-check audit found the home rendering Apex fixtures + eight fake agents to
 * real orgs. This loader replaces that: it reads the org's REAL work off the same seam the
 * Lu dock uses — the same-origin `/api/dock/*` proxies, which resolve the session org and
 * forward to apps/api (`/api/tasks`, `/api/approvals`, `/api/sites`). Engineering is the
 * only active agent, so the home is honest-empty until the Engineer actually has work.
 *
 * Server-only: it calls `proxyGet` (the dock backend seam) directly rather than round-
 * tripping through the browser, so the async home server component can render real data
 * on first paint. Any hiccup degrades to empty — never throws. The client-safe identity
 * + format helpers + the `EngineeringHomeData` type live in `./engineering-home-view` (no
 * `server-only`); re-exported here so server contexts can import the whole API from one place.
 */
export * from "./engineering-home-view";

const EMPTY: EngineeringHomeData = {
  resolved: false,
  inProgress: [],
  needsApproval: [],
  queued: [],
  approvals: [],
  sites: [],
  needsYouCount: 0,
  isWorking: false,
  isEmpty: true,
};

/** Newest-first by updatedAt (falling back to createdAt). */
function byRecency(a: DockTask, b: DockTask): number {
  const ka = a.updatedAt ?? a.createdAt ?? "";
  const kb = b.updatedAt ?? b.createdAt ?? "";
  return kb.localeCompare(ka);
}

/**
 * Load the real Engineering home for an org. Reads tasks / approvals / sites off the dock
 * seam, keeps only Engineering-department tasks, and buckets them by status. Returns a
 * fully-empty snapshot when there's no org or the reads fail (honest-empty, never throws).
 */
export async function loadEngineeringHome(
  orgId: string | null | undefined,
): Promise<EngineeringHomeData> {
  if (!orgId) return EMPTY;

  const [t, ap, si] = await Promise.all([
    proxyGet<{ tasks?: DockTask[] }>("/api/tasks", orgId, { tasks: [] }),
    proxyGet<{ approvals?: DockApproval[] }>("/api/approvals", orgId, { approvals: [] }),
    proxyGet<{ sites?: DockSite[] }>("/api/sites", orgId, { sites: [] }),
  ]);

  const engTasks = (t.tasks ?? []).filter((task) => task.departmentKey === ENGINEERING_DEPT);
  const inProgress = engTasks.filter((task) => task.status === "in_progress").sort(byRecency);
  const needsApproval = engTasks.filter((task) => task.status === "needs_approval").sort(byRecency);
  const queued = engTasks.filter((task) => task.status === "agent_can_do").sort(byRecency);
  const approvals = ap.approvals ?? [];
  const sites = si.sites ?? [];

  const needsYouCount = needsApproval.length + approvals.length;
  const isEmpty =
    inProgress.length === 0 &&
    needsApproval.length === 0 &&
    queued.length === 0 &&
    approvals.length === 0 &&
    sites.length === 0;

  return {
    resolved: true,
    inProgress,
    needsApproval,
    queued,
    approvals,
    sites,
    needsYouCount,
    isWorking: inProgress.length > 0,
    isEmpty,
  };
}
