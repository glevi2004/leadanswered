import type { Store } from "../store/types.js";
import { connectionStatus } from "../connect/status.js";

/**
 * COMPANY SETUP progress (the onboarding skill's five stages — skills/onboarding.md).
 * Derived entirely from state that already exists, so Lu resumes mid-setup after any
 * reload and the playbook stops applying the moment the company has shipped:
 *   1-2  interview + Business Plan  → done when a department is ACTIVE
 *   3    connect the stack          → done when GitHub + Vercel are connected
 *   4    architecture doc           → done when an `architecture` doc exists and
 *                                     no approve_doc approval is pending
 *   5    first build shipped        → done when an engineering task is `done`
 * Best-effort: on any failure reports setup complete so the playbook never wedges Lu.
 */

export interface SetupProgress {
  /** false until every stage is done — while false the orchestrator injects the playbook. */
  complete: boolean;
  /** true once departments are active (stages 1-2 behind us → normal toolkit). */
  activated: boolean;
  /** The one-line COMPANY SETUP block injected into Lu's prompt ("" once complete). */
  line: string;
}

export async function resolveSetupProgress(store: Store, orgId: string): Promise<SetupProgress> {
  try {
    const departments = await store.listDepartments(orgId);
    const activated = departments.some((d) => d.status === "active");
    if (!activated) {
      return {
        complete: false,
        activated: false,
        line: "COMPANY SETUP: stage 1-2 of 5 — interview the founder and draft the Business Plan. Departments are NOT active yet.",
      };
    }

    const [conn, artifacts, approvals, tasks] = await Promise.all([
      connectionStatus(store, orgId).catch(() => null),
      store.listArtifacts({ orgId }).catch(() => []),
      store.listPendingApprovals(orgId).catch(() => []),
      store.listTasks(orgId).catch(() => []),
    ]);

    const connected = Boolean(conn?.github && conn?.vercel);
    const archDoc = artifacts.some(
      (a) => a.kind === "doc" && (a.payload as { type?: unknown } | null)?.type === "architecture",
    );
    const docPending = approvals.some((a) => a.action === "approve_doc");
    const archDone = archDoc && !docPending;
    const shipped = tasks.some((t) => t.departmentKey === "engineering" && t.status === "done");

    if (connected && archDone && shipped) return { complete: true, activated, line: "" };

    let stage: string;
    let next: string;
    if (!connected) {
      stage = "3 of 5 (connect the stack)";
      next = `GitHub ${conn?.github ? "connected" : "MISSING"} · Vercel ${conn?.vercel ? "connected" : "MISSING"} — drive the connect form (show_connect_form).`;
    } else if (!archDone) {
      stage = "4 of 5 (system architecture)";
      next = docPending
        ? "The architecture doc is drafted and AWAITING the owner's approval — do not start a build yet."
        : "Draft the Architecture doc with draft_doc (docType architecture).";
    } else {
      stage = "5 of 5 (ship the first thing)";
      next = "Propose ONE small first build with propose_plan; setup ends when it publishes.";
    }
    return {
      complete: false,
      activated,
      line: `COMPANY SETUP: stage ${stage}. ${next}`,
    };
  } catch (err) {
    console.error("[setup] progress failed (treating as complete):", err);
    return { complete: true, activated: true, line: "" };
  }
}
