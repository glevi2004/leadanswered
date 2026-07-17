import type { Request, Response } from "express";
import type { DeploymentRecord, Store } from "../store/types.js";
import { usageThisPeriod } from "../billing/usage.js";

/**
 * The Lu Computer READ routes (ENGINEER-ACTIVATION §B2) — GET endpoints the canvas
 * polls to WATCH the Engineer work: live task status, the artifacts it produced
 * (agent_session / pr_diff / site_preview / image), the approvals waiting on the
 * owner, and the org's sites with their latest deployment. All are org-scoped and
 * read-only; they only ever touch the Store port (structurally compatible with the
 * `{ store, now }` deps app.ts passes).
 */
export interface ReadRouteDeps {
  store: Store;
}

/** Read the (required) orgId query param; returns undefined + writes a 400 when missing/blank. */
function requireOrgId(req: Request, res: Response): string | undefined {
  const orgId = req.query.orgId;
  if (typeof orgId !== "string" || orgId.trim() === "") {
    res.status(400).json({ error: "orgId query param is required" });
    return undefined;
  }
  return orgId;
}

/** Pick the newest deployment (by createdAt) from a site's list, or null if it has none. */
function latestDeployment(deployments: DeploymentRecord[]): DeploymentRecord | null {
  if (deployments.length === 0) return null;
  return [...deployments].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];
}

/**
 * GET /api/tasks?orgId=...
 * The org's tasks (roadmap steps + delegated work), newest-of-record. → { tasks }.
 */
export function createListTasksRoute(deps: ReadRouteDeps) {
  return async function getTasks(req: Request, res: Response): Promise<void> {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    try {
      const tasks = await deps.store.listTasks(orgId);
      res.status(200).json({ tasks });
    } catch (err) {
      console.error("[/api/tasks] error:", err);
      res.status(500).json({ error: "failed to list tasks" });
    }
  };
}

/**
 * GET /api/usage?orgId=...
 * The org's metered agent-compute this period vs its bucket (plan Pillar 2). → UsageThisPeriod.
 */
export function createUsageRoute(deps: ReadRouteDeps) {
  return async function getUsage(req: Request, res: Response): Promise<void> {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    try {
      res.status(200).json(await usageThisPeriod(deps.store, orgId));
    } catch (err) {
      console.error("[/api/usage] error:", err);
      res.status(500).json({ error: "failed to read usage" });
    }
  };
}

/**
 * GET /api/artifacts?orgId=...&taskId=...
 * Artifacts for the org, optionally narrowed to one task. → { artifacts }.
 */
export function createListArtifactsRoute(deps: ReadRouteDeps) {
  return async function getArtifacts(req: Request, res: Response): Promise<void> {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const taskId = typeof req.query.taskId === "string" ? req.query.taskId : undefined;
    try {
      const artifacts = await deps.store.listArtifacts({ orgId, taskId });
      res.status(200).json({ artifacts });
    } catch (err) {
      console.error("[/api/artifacts] error:", err);
      res.status(500).json({ error: "failed to list artifacts" });
    }
  };
}

/**
 * GET /api/approvals?orgId=...
 * The org's PENDING approvals — the "Needs you" gate (e.g. publish_site). → { approvals }.
 */
export function createListApprovalsRoute(deps: ReadRouteDeps) {
  return async function getApprovals(req: Request, res: Response): Promise<void> {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    try {
      const approvals = await deps.store.listPendingApprovals(orgId);
      res.status(200).json({ approvals });
    } catch (err) {
      console.error("[/api/approvals] error:", err);
      res.status(500).json({ error: "failed to list approvals" });
    }
  };
}

/**
 * GET /api/sites?orgId=...
 * The org's sites, each with its latest deployment (preview/production). → { sites }.
 */
export function createListSitesRoute(deps: ReadRouteDeps) {
  return async function getSites(req: Request, res: Response): Promise<void> {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    try {
      const sites = await deps.store.listSites(orgId);
      const withDeploys = await Promise.all(
        sites.map(async (site) => ({
          ...site,
          latestDeployment: latestDeployment(await deps.store.listDeployments(site.id)),
        })),
      );
      res.status(200).json({ sites: withDeploys });
    } catch (err) {
      console.error("[/api/sites] error:", err);
      res.status(500).json({ error: "failed to list sites" });
    }
  };
}
