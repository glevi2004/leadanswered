import type { Request, Response } from "express";
import {
  runOrchestrator,
  type OrchestratorDeps,
  type OrchestratorMessage,
} from "../agent/orchestrator.js";
import { runEngineering, type EngineeringDeps } from "../agent/engineering.js";

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
    const history = b.history;

    if (!isFilled(orgId) || !isFilled(message)) {
      res.status(400).json({ error: "orgId and message are required" });
      return;
    }

    try {
      const result = await runOrchestrator(deps, {
        orgId,
        message,
        history: history as OrchestratorMessage[] | undefined,
      });
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
 * An in-process registry (taskId → running promise) prevents double-dispatch of the
 * same task if the route is hit twice. → 202 { taskId }. 400 if orgId/message blank.
 */
export function createEngineeringRoute(deps: EngineeringDeps) {
  // Persists across requests (the factory is called once in app.ts): one live run per task.
  const inflight = new Map<string, Promise<unknown>>();

  /** Fire-and-forget the Engineer for a task; owns the failure → `failed` transition + registry cleanup. */
  function dispatch(orgId: string, taskId: string, message: string): void {
    if (inflight.has(taskId)) return; // already running — do not double-dispatch
    const run = runEngineering(deps, { orgId, taskId, message })
      .catch(async (err) => {
        console.error(`[/api/engineering] task ${taskId} failed:`, err);
        await deps.store.updateTaskStatus(taskId, "failed").catch((e) => {
          console.error(`[/api/engineering] could not mark task ${taskId} failed:`, e);
        });
      })
      .finally(() => {
        inflight.delete(taskId);
      });
    inflight.set(taskId, run);
  }

  return async function postEngineering(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    const message = b.message;
    const passedTaskId = b.taskId ?? b.task_id;

    if (!isFilled(orgId) || !isFilled(message)) {
      res.status(400).json({ error: "orgId and message are required" });
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
        if (existing.status !== "in_progress" && existing.status !== "needs_approval") {
          await deps.store.updateTaskStatus(taskId, "in_progress");
        }
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

      // Kick off the build in the background, then answer immediately.
      dispatch(orgId, taskId, message);
      res.status(202).json({ taskId });
    } catch (err) {
      console.error("[/api/engineering] error:", err);
      res.status(500).json({ error: "failed to start Engineering agent" });
    }
  };
}
