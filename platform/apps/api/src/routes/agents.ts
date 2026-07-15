import type { Request, Response } from "express";
import {
  runOrchestrator,
  type OrchestratorDeps,
  type OrchestratorMessage,
} from "../agent/orchestrator.js";
import {
  runEngineering,
  type EngineeringDeps,
  type EngineeringMessage,
} from "../agent/engineering.js";

/** True for a present, non-blank string field (missing/blank → 400, like the other routes). */
function isFilled(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
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
 * POST /api/engineering  body { orgId: string, message: string, history?: unknown }
 * One turn of the ENGINEERING agent (engineering.ts) — it builds + ships real
 * software: stands up a repo, runs the coding agent in a sandbox, opens a preview,
 * and stages a publish approval. → { reply, artifacts, actions }.
 * 400 if orgId or message is missing/blank.
 */
export function createEngineeringRoute(deps: EngineeringDeps) {
  return async function postEngineering(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    const message = b.message;
    const history = b.history;

    if (!isFilled(orgId) || !isFilled(message)) {
      res.status(400).json({ error: "orgId and message are required" });
      return;
    }

    try {
      const result = await runEngineering(deps, {
        orgId,
        message,
        history: history as EngineeringMessage[] | undefined,
      });
      res.status(200).json({
        reply: result.reply,
        artifacts: result.artifacts,
        actions: result.actions,
      });
    } catch (err) {
      console.error("[/api/engineering] error:", err);
      res.status(500).json({ error: "failed to run Engineering agent" });
    }
  };
}
