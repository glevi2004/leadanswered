import type { Request, Response } from "express";
import {
  runOrchestrator,
  type OrchestratorDeps,
  type OrchestratorMessage,
} from "../agent/orchestrator.js";
import { type EngineeringDeps } from "../agent/engineering.js";
import { dispatchBuild } from "../agent/dispatch.js";
import { orgHasConnections } from "../connect/status.js";

/** True for a present, non-blank string field (missing/blank → 400, like the other routes). */
function isFilled(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/** A short Task title from the owner's message (first line, trimmed to a sane length). */
function titleFromMessage(message: string): string {
  const firstLine = (message.split("\n")[0] ?? "").trim();
  const t = firstLine.length > 72 ? firstLine.slice(0, 71).trimEnd() + "…" : firstLine;
  return t || "Engineering task";
}

/**
 * POST /api/lu  body { orgId: string, message: string, history?: unknown }
 * One turn of the Lu ORCHESTRATOR (orchestrator.ts) — she understands the goal,
 * decomposes it into tasks, delegates to the owning department, and reports back.
 * → { reply, tasksCreated, actions }. 400 if orgId or message is missing/blank.
 */
export function createLuRoute(deps: OrchestratorDeps) {
  return async function postLu(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    const message = b.message;
    const modelId =
      typeof b.modelId === "string" && b.modelId.trim() ? b.modelId.trim() : undefined;

    if (!isFilled(orgId) || !isFilled(message)) {
      res.status(400).json({ error: "orgId and message are required" });
      return;
    }

    try {
      // Working memory (plan Pillar 3): Lu's history comes from the PERSISTED thread, not the
      // client — so she keeps context across sessions/reloads. Falls back to client history if the
      // store hiccups; persisting the reply is best-effort and never blocks the turn.
      let history = (b.history as OrchestratorMessage[] | undefined) ?? [];
      let threadId: string | null = null;
      try {
        const thread = await deps.store.getOrCreateMainThread(orgId);
        threadId = thread.id;
        const prior = await deps.store.listRecentMessages(thread.id, 20);
        if (prior.length) history = prior.map((m) => ({ role: m.role, content: m.content }));
        await deps.store.appendMessage({ threadId: thread.id, orgId, role: "user", content: message });
      } catch (memErr) {
        console.error("[/api/lu] thread memory unavailable, using client history:", memErr);
      }

      const result = await runOrchestrator(deps, {
        orgId,
        message,
        history,
        modelId,
      });

      if (threadId) {
        void deps.store
          .appendMessage({ threadId, orgId, role: "assistant", content: result.reply })
          .catch(() => {});
      }
      res.status(200).json({
        reply: result.reply,
        tasksCreated: result.tasksCreated,
        actions: result.actions,
      });
    } catch (err) {
      console.error("[/api/lu] error:", err);
      res.status(500).json({ error: "failed to run Lu orchestrator" });
    }
  };
}

/**
 * POST /api/engineering  body { orgId: string, message: string, taskId?: string }
 *
 * ASYNC dispatch (ENGINEER-ACTIVATION §B1). A real build runs for MINUTES inside a
 * sandbox, so we never hold the request open for it. Instead:
 *   1) Resolve the Task: use the passed `taskId` (e.g. one Lu's orchestrator created),
 *      or create a fresh engineering Task from the message.
 *   2) Respond IMMEDIATELY with 202 { taskId }.
 *   3) Run `runEngineering` in the BACKGROUND, threading the taskId through so the
 *      tools flip the task status (→ needs_approval) and land artifacts on it. On a
 *      thrown error, mark the task `failed`.
 *
 * DURABLE dispatch: when Redis is configured the build is ENQUEUED to the BullMQ
 * worker (worker.ts), so it survives a redeploy/crash — the run is re-delivered and
 * resumes (idempotent tools make that safe). Without Redis (local dev) it falls back to
 * an in-process fire-and-forget run. Either way the same task is never double-dispatched
 * (queue: jobId = taskId; fallback: an in-process registry). → 202 { taskId }.
 * 400 if orgId/message blank.
 */
export function createEngineeringRoute(deps: EngineeringDeps) {
  return async function postEngineering(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    const message = b.message;
    const passedTaskId = b.taskId ?? b.task_id;

    if (!isFilled(orgId) || !isFilled(message)) {
      res.status(400).json({ error: "orgId and message are required" });
      return;
    }

    // BYO connect gate: the customer build path requires the org's OWN GitHub + Vercel
    // (docs/byo-connect.md). Not connected → do NOT dispatch; the UI prompts to connect.
    // (The env-token fallback stays for platform dogfooding via non-gated internal calls.)
    if (!(await orgHasConnections(deps.store, orgId))) {
      res.status(412).json({ error: "connect GitHub and Vercel before building", needsConnect: true });
      return;
    }

    try {
      let taskId: string;
      if (isFilled(passedTaskId)) {
        // An existing task (e.g. from Lu's orchestrator). Verify it exists + is this org's.
        const existing = await deps.store.getTask(passedTaskId);
        if (!existing || existing.orgId !== orgId) {
          res.status(404).json({ error: "task not found for this org" });
          return;
        }
        taskId = existing.id;
      } else {
        // No task yet — create the engineering Task the build will report onto.
        const task = await deps.store.createTask({
          orgId,
          departmentKey: "engineering",
          title: titleFromMessage(message),
          body: message,
          status: "in_progress",
          assignedBy: "owner",
        });
        taskId = task.id;
      }

      // Durable dispatch (enqueue → worker; in-process fallback), then answer immediately.
      await dispatchBuild(deps, { orgId, taskId, message });
      res.status(202).json({ taskId });
    } catch (err) {
      console.error("[/api/engineering] error:", err);
      res.status(500).json({ error: "failed to start Engineering agent" });
    }
  };
}
