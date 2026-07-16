import type { Request, Response } from "express";
import { confirmPublish, type EngineeringDeps } from "../agent/engineering.js";
import type { Store } from "../store/types.js";

/**
 * The approval-resolution endpoint (ENGINEER-ACTIVATION §B3) — the owner's Publish
 * button. It CLOSES the human-in-the-loop gate the Engineer opened with
 * `request_publish`:
 *   - "approved" for a publish_site approval → `confirmPublish` (merge the PR →
 *     promote the build to Vercel production → attach the domain → mark the Site
 *     live → resolve the Approval). This is the ONLY path that reaches production.
 *   - "rejected" → just resolve the Approval; nothing ships.
 *
 * Takes the full EngineeringDeps (store + the git/deploy/sandbox ports) because
 * `confirmPublish` drives those ports; app.ts's `{ store, now }` is structurally
 * compatible (the ports default to their factory getters).
 */

/**
 * Best-effort recovery of the Site id for a publish approval when the caller did
 * not pass it: the approval → its task → that task's artifacts (create_site records
 * a site_preview carrying `repoFullName`) → the org's site with that repo. Returns
 * undefined if the chain can't be resolved (the caller then gets a 400 asking for
 * an explicit siteId).
 */
async function inferSiteId(store: Store, orgId: string, approvalId: string): Promise<string | undefined> {
  const approval = (await store.listPendingApprovals(orgId)).find((a) => a.id === approvalId);
  if (!approval?.taskId) return undefined;
  const artifacts = await store.listArtifacts({ taskId: approval.taskId });
  let repoFullName: string | undefined;
  for (const a of artifacts) {
    const p = a.payload as { repoFullName?: unknown } | null;
    if (p && typeof p.repoFullName === "string") {
      repoFullName = p.repoFullName;
      break;
    }
  }
  if (!repoFullName) return undefined;
  const site = (await store.listSites(orgId)).find((s) => s.repoFullName === repoFullName);
  return site?.id;
}

/**
 * POST /api/approvals/:id/resolve  body { decision: "approved"|"rejected", decidedBy?, siteId?, orgId? }
 * → on approve: { decision, siteId, domain, url }; on reject: { decision, approval }.
 * 400 on a bad/missing decision (or an approve with no resolvable siteId).
 */
export function createResolveApprovalRoute(deps: EngineeringDeps) {
  return async function postResolveApproval(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const b = req.body ?? {};
    const decision = b.decision;
    const decidedBy = typeof b.decidedBy === "string" ? b.decidedBy : "owner";
    const orgId = typeof b.orgId === "string" ? b.orgId : b.org_id;

    if (decision !== "approved" && decision !== "rejected") {
      res.status(400).json({ error: "decision must be 'approved' or 'rejected'" });
      return;
    }

    try {
      if (decision === "rejected") {
        const approval = await deps.store.resolveApproval(id, "rejected", decidedBy);
        res.status(200).json({ decision, approval });
        return;
      }

      // Approved → publish. Resolve the Site id (explicit, else inferred from the approval).
      let siteId = typeof b.siteId === "string" ? b.siteId : undefined;
      if (!siteId && typeof orgId === "string" && orgId.trim() !== "") {
        siteId = await inferSiteId(deps.store, orgId, id);
      }
      if (!siteId) {
        res.status(400).json({ error: "siteId is required to approve a publish" });
        return;
      }

      const result = await confirmPublish(deps, { siteId, approvalId: id });
      res.status(200).json({ decision, ...result });
    } catch (err) {
      console.error("[/api/approvals/:id/resolve] error:", err);
      res.status(500).json({ error: "failed to resolve approval" });
    }
  };
}
