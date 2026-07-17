import type { DockApproval, DockSite, DockTask } from "@/lib/dock/live";

/**
 * Client-safe view helpers + types for the Engineering home. Split out of
 * `engineering-home.ts` (which is `server-only` because it calls `proxyGet`) so the client
 * `EngineeringHome.tsx` component can import the identity/format helpers without pulling the
 * server-only data loader into the browser bundle.
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
