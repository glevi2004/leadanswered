import type { Request, Response } from "express";
import type { DeploymentRecord, SiteRecord, Store } from "../store/types.js";
import { usageThisPeriod } from "../billing/usage.js";
import { getDeployForOrg } from "../deploy/index.js";

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
 * Preview RECONCILIATION (BYO reliability — harness-spec §3): a preview that wasn't ready when
 * `open_preview` stopped polling used to stay empty forever. On the sites read path, if the
 * latest deployment is a recent preview with no URL (or still BUILDING), re-query Vercel for the
 * PR's preview and append the healed Deployment row (+ a healed `site_preview` artifact so the
 * chat card fills in too). Best-effort, bounded to deployments under 2h old.
 */
async function reconcilePreview(
  store: Store,
  site: SiteRecord,
  latest: DeploymentRecord | null,
): Promise<DeploymentRecord | null> {
  if (!latest || latest.env !== "preview" || latest.prNumber == null || !site.vercelProjectId) {
    return latest;
  }
  const terminal = latest.status === "READY" || latest.status === "ERROR" || latest.status === "CANCELED";
  if (latest.url && terminal) return latest;
  const ageMs = latest.createdAt ? Date.now() - new Date(latest.createdAt).getTime() : 0;
  if (ageMs > 2 * 3_600_000) return latest;
  try {
    const deploy = await getDeployForOrg(store, site.orgId);
    const fresh = await deploy.getPreviewForPr(site.vercelProjectId, latest.prNumber);
    if (!fresh?.url || (fresh.url === latest.url && fresh.status === latest.status)) return latest;
    const healed = await store.addDeployment({
      siteId: site.id,
      env: "preview",
      url: fresh.url,
      sha: latest.sha,
      prNumber: latest.prNumber,
      status: fresh.status ?? "READY",
    });
    // Heal the chat's site_preview artifact too (the tracker renders artifacts, not deployments).
    const arts = await store.listArtifacts({ orgId: site.orgId });
    const orig = arts
      .filter(
        (a) =>
          a.kind === "site_preview" &&
          (a.payload as { prNumber?: number } | null)?.prNumber === latest.prNumber,
      )
      .at(-1);
    const origUrl = (orig?.payload as { url?: string | null } | null)?.url;
    if (orig && !origUrl) {
      await store.addArtifact({
        orgId: site.orgId,
        taskId: orig.taskId,
        kind: "site_preview",
        title: orig.title,
        payload: { ...(orig.payload as Record<string, unknown>), url: fresh.url, status: fresh.status ?? "READY" },
      });
    }
    return healed;
  } catch {
    return latest; // best-effort — never fail the read
  }
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
 * GET /api/lu/history?orgId=...&limit=...
 * The persisted Lu conversation (docs/product.md §0 — thread rehydration): the org's main
 * thread + its most recent messages, oldest-first, including report-back messages' `meta`.
 * The web reads this on load so a reload shows the real conversation, not a fresh greeting.
 */
export function createLuHistoryRoute(deps: ReadRouteDeps) {
  return async function getLuHistory(req: Request, res: Response): Promise<void> {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50;
    try {
      const thread = await deps.store.getOrCreateMainThread(orgId);
      const messages = await deps.store.listRecentMessages(thread.id, limit);
      res.status(200).json({ threadId: thread.id, messages });
    } catch (err) {
      console.error("[/api/lu/history] error:", err);
      res.status(500).json({ error: "failed to read thread history" });
    }
  };
}

/**
 * GET /api/events?orgId=...&limit=...
 * The org's journal (docs/system.md §2), newest-first — what the chat derives its
 * phase states from and what activity feeds render. → { events }.
 */
export function createListEventsRoute(deps: ReadRouteDeps) {
  return async function getEvents(req: Request, res: Response): Promise<void> {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 30;
    try {
      const events = await deps.store.listAgentEvents(orgId, limit);
      res.status(200).json({ events });
    } catch (err) {
      console.error("[/api/events] error:", err);
      res.status(500).json({ error: "failed to list events" });
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
        sites.map(async (site) => {
          const latest = latestDeployment(await deps.store.listDeployments(site.id));
          return { ...site, latestDeployment: await reconcilePreview(deps.store, site, latest) };
        }),
      );
      res.status(200).json({ sites: withDeploys });
    } catch (err) {
      console.error("[/api/sites] error:", err);
      res.status(500).json({ error: "failed to list sites" });
    }
  };
}
