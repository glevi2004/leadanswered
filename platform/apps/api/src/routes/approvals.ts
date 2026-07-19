import type { Request, Response } from "express";
import { confirmPublish, type EngineeringDeps } from "../agent/engineering.js";
import { dispatchBuild } from "../agent/dispatch.js";
import { orgHasConnections } from "../connect/status.js";
import { provisionDepartments } from "../onboarding/provision.js";
import { postToThread, recordEvent } from "../agent/journal.js";
import { runProjectQuery, validManagementToken } from "../connect/supabaseOAuth.js";
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
      // The PLAN GATE: an "approve_plan" approval dispatches the build (or rejects the plan),
      // rather than publishing. Detect it from the approval's action (needs orgId to look it up).
      if (typeof orgId === "string" && orgId.trim() !== "") {
        const appr = (await deps.store.listPendingApprovals(orgId)).find((a) => a.id === id);
        if (appr?.action === "approve_plan") {
          if (decision === "rejected") {
            const approval = await deps.store.resolveApproval(id, "rejected", decidedBy);
            await recordEvent(deps.store, {
              orgId,
              taskId: appr.taskId,
              kind: "plan_rejected",
              message: "Plan rejected by the owner",
            });
            res.status(200).json({ decision, kind: "plan", approval });
            return;
          }
          const planTaskId = appr.taskId;
          if (!planTaskId) {
            res.status(400).json({ error: "plan approval has no task" });
            return;
          }
          // Can't build without the owner's GitHub + Vercel — leave the approval so they can
          // connect and approve again.
          if (!(await orgHasConnections(deps.store, orgId))) {
            res.status(200).json({ decision, kind: "plan", dispatched: false, needsConnect: true });
            return;
          }
          // Drive the Engineer from the APPROVED plan (objective + steps + acceptance).
          const task = await deps.store.getTask(planTaskId);
          const arts = await deps.store.listArtifacts({ taskId: planTaskId });
          const plan = arts.find(
            (a) => a.kind === "doc" && (a.payload as { type?: unknown } | null)?.type === "plan",
          )?.payload as { objective?: string; steps?: string[]; acceptance?: string[] } | undefined;
          const message = plan
            ? [
                plan.objective ?? "",
                plan.steps?.length ? `Approach:\n- ${plan.steps.join("\n- ")}` : "",
                plan.acceptance?.length ? `Done when:\n- ${plan.acceptance.join("\n- ")}` : "",
              ]
                .filter(Boolean)
                .join("\n\n")
            : task?.body?.trim() || task?.title || "";
          await deps.store.resolveApproval(id, "approved", decidedBy);
          await recordEvent(deps.store, {
            orgId,
            taskId: planTaskId,
            kind: "plan_approved",
            message: `Plan approved: ${task?.title ?? planTaskId}`,
          });
          await postToThread(
            deps.store,
            orgId,
            `Plan approved. I'm dispatching the Engineer on "${task?.title ?? "the build"}" now — I'll report back when the preview is up.`,
            { kind: "plan_approved", taskId: planTaskId },
          );
          await dispatchBuild({ store: deps.store }, { orgId, taskId: planTaskId, message });
          res.status(200).json({ decision, kind: "plan", dispatched: true, taskId: planTaskId });
          return;
        }

        // THE MIGRATION GATE (ladder step 5): SQL runs against the org's Supabase ONLY here —
        // after the owner approves — never from a model tool.
        if (appr?.action === "run_migration") {
          if (decision === "rejected") {
            const approval = await deps.store.resolveApproval(id, "rejected", decidedBy);
            await recordEvent(deps.store, {
              orgId,
              taskId: appr.taskId,
              kind: "migration_rejected",
              message: "Migration rejected by the owner — no SQL ran",
            });
            res.status(200).json({ decision, kind: "migration", approval });
            return;
          }
          const arts = appr.taskId ? await deps.store.listArtifacts({ taskId: appr.taskId }) : [];
          const mig = arts
            .filter((a) => a.kind === "doc" && (a.payload as { type?: string } | null)?.type === "migration")
            .at(-1);
          const migPayload = (mig?.payload ?? null) as
            | { sql?: string; projectRef?: string; title?: string }
            | null;
          if (!migPayload?.sql) {
            res.status(400).json({ error: "no staged migration found for this approval" });
            return;
          }
          const mgmt = await validManagementToken(deps.store, orgId);
          const conn = await deps.store.getSupabaseConnection(orgId);
          const ref = migPayload.projectRef || conn?.projectRef || "";
          if (!mgmt || !ref) {
            res.status(200).json({ decision, kind: "migration", applied: false, needsConnect: true });
            return;
          }
          const result = await runProjectQuery(mgmt, ref, migPayload.sql);
          if (!result.ok) {
            // Keep the approval pending so it can be retried after a fix; report the failure.
            await recordEvent(deps.store, {
              orgId,
              taskId: appr.taskId,
              kind: "migration_failed",
              message: `Migration "${migPayload.title ?? "untitled"}" failed`,
              payload: { error: result.error },
            });
            await postToThread(
              deps.store,
              orgId,
              `The migration "${migPayload.title ?? "untitled"}" failed to apply: ${result.error?.slice(0, 300)}. It's still staged — ask me to fix the SQL and try again.`,
              { kind: "migration_failed", taskId: appr.taskId ?? undefined },
            );
            res.status(200).json({ decision, kind: "migration", applied: false, error: result.error });
            return;
          }
          await deps.store.resolveApproval(id, "approved", decidedBy);
          await recordEvent(deps.store, {
            orgId,
            taskId: appr.taskId,
            kind: "migration_applied",
            message: `Migration applied: ${migPayload.title ?? "untitled"}`,
          });
          await postToThread(
            deps.store,
            orgId,
            `Migration "${migPayload.title ?? "untitled"}" is applied to your database.`,
            { kind: "migration_applied", taskId: appr.taskId ?? undefined },
          );
          res.status(200).json({ decision, kind: "migration", applied: true });
          return;
        }

        // The DOC gate (skills/onboarding.md stage 4): an `approve_doc` approval locks in a
        // gated company document (the architecture doc). No side effects beyond the journal —
        // approving it unblocks the playbook's next stage; rejecting sends Lu back to re-draft.
        if (appr?.action === "approve_doc") {
          const arts = await deps.store.listArtifacts({ orgId });
          const doc = arts
            .filter((a) => a.kind === "doc" && (a.payload as { gated?: unknown } | null)?.gated === true)
            .at(-1);
          const title = doc?.title ?? "the document";
          if (decision === "rejected") {
            const approval = await deps.store.resolveApproval(id, "rejected", decidedBy);
            await recordEvent(deps.store, {
              orgId,
              kind: "doc_rejected",
              message: `Doc rejected: ${title} — the owner wants changes`,
              payload: doc ? { artifactId: doc.id } : undefined,
            });
            res.status(200).json({ decision, kind: "doc", approval });
            return;
          }
          await deps.store.resolveApproval(id, "approved", decidedBy);
          await recordEvent(deps.store, {
            orgId,
            kind: "doc_approved",
            message: `Doc approved: ${title}`,
            payload: doc ? { artifactId: doc.id } : undefined,
          });
          await postToThread(
            deps.store,
            orgId,
            `"${title}" is locked in — it lives in your Library. Ask me any time and I'll revise it.`,
            { kind: "doc_approved", ...(doc ? { artifactId: doc.id } : {}) },
          );
          res.status(200).json({ decision, kind: "doc", approved: true, artifactId: doc?.id });
          return;
        }

        // The ACTIVATE gate: "Accept & activate departments". Approving boots the company's
        // departments (Engineering active + agent) and ends onboarding-mode; rejecting just
        // supersedes the gate.
        if (appr?.action === "activate_departments") {
          if (decision === "rejected") {
            const approval = await deps.store.resolveApproval(id, "rejected", decidedBy);
            res.status(200).json({ decision, kind: "activate", approval });
            return;
          }
          // Seed the business into Lu's memory from the final Business Context the owner accepted.
          const arts = await deps.store.listArtifacts({ orgId });
          const doc = arts
            .filter((a) => {
              const t = (a.payload as { type?: unknown } | null)?.type;
              return a.kind === "doc" && t === "business_context";
            })
            .at(-1);
          const plan = doc?.payload as
            | { classification?: { companyType?: string; industry?: string }; summary?: string }
            | undefined;
          const business =
            plan?.summary?.trim() ||
            [plan?.classification?.companyType, plan?.classification?.industry].filter(Boolean).join(" · ") ||
            undefined;
          await deps.store.resolveApproval(id, "approved", decidedBy);
          const result = await provisionDepartments(deps.store, orgId, { business });
          await recordEvent(deps.store, {
            orgId,
            kind: "departments_activated",
            message: `Departments activated (${result.departments.length})`,
          });
          res
            .status(200)
            .json({ decision, kind: "activate", activated: true, departments: result.departments.length });
          return;
        }
      }

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
