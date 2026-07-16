import "server-only";
import { proxyGet } from "@/lib/dock/backend";
import type { DockApproval, DockSite, DockTask } from "@/lib/dock/live";

/**
 * REAL data for the dashboard home (`/home`) — Engineering only.
 *
 * The reality-check audit found the home rendering Apex fixtures + eight fake agents to
 * real orgs. This loader replaces that: it reads the org's REAL work off the same seam the
 * Lu dock uses — the same-origin `/api/dock/*` proxies, which resolve the session org and
 * forward to apps/api (`/api/tasks`, `/api/approvals`, `/api/sites`). Engineering is the
 * only active agent, so the home is honest-empty until the Engineer actually has work.
 *
 * Server-only: it calls `proxyGet` (the dock backend seam) directly rather than round-
 * tripping through the browser, so the async home server component can render real data
 * on first paint. Any hiccup degrades to empty — never throws.
 */

/** apps/api tags every Engineer task with this department key. */
export const ENGINEERING_DEPT = "engineering";

/**
 * The Engineering agent's identity on the home surface. Mirrors the `engineering`
 * AgentNode in `lib/canvas/graph.ts` (label / agentName / accent) so the home card reads
 * the same as the canvas — kept local so the home doesn't couple to the canvas graph.
 */
export const ENGINEER = {
  dept: ENGINEERING_DEPT,
  label: "Engineering",
  agentName: "Engineer",
  accent: "96,165,250", // blue-400 — matches graph.ts's engineering accent
} as const;

export interface EngineeringHomeData {
  /** an org was resolved (a signed-in owner / injected org); false → nothing to read. */
  resolved: boolean;
  /** tasks the Engineer is actively building (status `in_progress`). */
  inProgress: DockTask[];
  /** tasks flagged for the owner (status `needs_approval`). */
  needsApproval: DockTask[];
  /** tasks queued for the Engineer to pick up (status `agent_can_do`). */
  queued: DockTask[];
  /** pending publish gates the Engineer opened (the real "Publish / Reject" cards). */
  approvals: DockApproval[];
  /** the Engineer's sites, each with its latest deployment (deliverables). */
  sites: DockSite[];
  /** owner-facing items = needs-approval tasks + pending approvals (the header count). */
  needsYouCount: number;
  /** the Engineer is doing something right now (>= 1 in-progress task). */
  isWorking: boolean;
  /** nothing at all to show — the honest-empty case. */
  isEmpty: boolean;
}

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

/** Relative age of an ISO timestamp, computed at render ("just now" · "12m" · "3h" · "2d"). */
export function relativeAgo(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

/** The pretty host for a Site (domain wins, else the latest deploy host, else the repo). */
export function siteHostOf(site: DockSite): string {
  const domain = site.domain?.trim();
  if (domain) return domain.replace(/^https?:\/\//i, "");
  const url = site.latestDeployment?.url?.trim();
  if (url) {
    try {
      return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).host;
    } catch {
      return url.replace(/^https?:\/\//i, "");
    }
  }
  return site.repoFullName ?? "building";
}
