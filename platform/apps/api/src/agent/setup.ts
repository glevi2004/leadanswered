import type { Store } from "../store/types.js";
import { connectionStatus } from "../connect/status.js";

/**
 * COMPANY SETUP progress (the onboarding skill's five stages — skills/onboarding.md).
 * Derived entirely from state that already exists, so Lu resumes mid-setup after any
 * reload and the playbook stops applying the moment the company has shipped:
 *   1-2  interview + activate departments  → done when a department is ACTIVE
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

/**
 * SCOPING STATE (roadmap Ch.1 / P2) — injected while the org is still being scoped
 * (onboarding-mode) so Lu always knows exactly what the interview has captured and
 * never re-asks. Derived from the GROWING Business Context draft (the artifact
 * `update_business_context` upserts) plus the live gate state. Best-effort: "" on any
 * failure — the skill still works, just without the memory of captured fields.
 */
export async function resolveScopingState(store: Store, orgId: string): Promise<string> {
  try {
    const [arts, approvals] = await Promise.all([
      store.listArtifacts({ orgId }).catch(() => []),
      store.listPendingApprovals(orgId).catch(() => []),
    ]);
    const ctxDoc = arts
      .filter((a) => a.kind === "doc" && (a.payload as { type?: unknown } | null)?.type === "business_context")
      .at(-1);
    const p = (ctxDoc?.payload ?? null) as { draft?: boolean; fields?: Record<string, string> } | null;
    const fields = p?.fields ?? {};
    const gateStaged = approvals.some((a) => a.action === "activate_departments");

    const lines: string[] = ["SCOPING STATE (live — never re-ask a captured field; correct it only if the owner contradicts it):"];
    const keys = Object.keys(fields);
    if (keys.length === 0) {
      lines.push("- Captured: nothing yet — the interview hasn't started or nothing has been recorded. Record with update_business_context as you learn.");
    } else {
      lines.push(`- Captured (${keys.length}): ${keys.map((k) => `${k}=${String(fields[k]).slice(0, 60)}`).join(" · ")}`);
    }
    lines.push(
      gateStaged
        ? "- The final doc is staged and AWAITING the owner's accept — do not re-finalize unless they ask for changes."
        : `- Final doc: ${p && p.draft === false ? "finalized" : "not finalized yet"}`,
    );
    const block = lines.join("\n");
    return block.length > 1_800 ? block.slice(0, 1_800) : block;
  } catch (err) {
    console.error("[setup] scoping state failed (continuing without):", err);
    return "";
  }
}

export async function resolveSetupProgress(store: Store, orgId: string): Promise<SetupProgress> {
  try {
    const departments = await store.listDepartments(orgId);
    const activated = departments.some((d) => d.status === "active");
    if (!activated) {
      return {
        complete: false,
        activated: false,
        line: "COMPANY SETUP: stage 1-2 of 5 — interview the founder and finalize the Business Context. Departments are NOT active yet.",
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
