import type { Request, Response } from "express";
import {
  runOrchestrator,
  type OrchestratorDeps,
  type OrchestratorMessage,
} from "../agent/orchestrator.js";
import type { OrchestratorAction } from "../agent/orchestratorTools.js";
import { type EngineeringDeps } from "../agent/engineering.js";
import { dispatchBuild } from "../agent/dispatch.js";
import { orgHasConnections } from "../connect/status.js";
import { enqueueConsolidation } from "../queue.js";

/** True for a present, non-blank string field (missing/blank → 400, like the other routes). */
function isFilled(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * MOVES LIVE ON THE MESSAGE (roadmap P1 / docs/product.md §2): distill the turn's
 * structured actions into the assistant message's persisted `meta`, so chips and cards
 * are reload-safe objects on the thread — not ephemeral response fields. ask_user →
 * `meta.choices` (question, options, recommended); show_connect → `meta.card`.
 * Returns undefined when the turn carried nothing structured.
 */
function metaFromActions(actions: OrchestratorAction[]): Record<string, unknown> | undefined {
  const meta: Record<string, unknown> = {};
  const ask = actions.find((a) => a.type === "ask_user" && Array.isArray(a.options) && a.options.length > 0);
  if (ask && ask.type === "ask_user") {
    meta.choices = {
      question: ask.question,
      options: ask.options,
      ...(typeof ask.recommended === "number" ? { recommended: ask.recommended } : {}),
    };
  }
  if (actions.some((a) => a.type === "show_connect")) meta.card = "connect";
  return Object.keys(meta).length > 0 ? meta : undefined;
}

/**
 * The model-visible transcript line for a persisted turn. An assistant turn that carried
 * choices shows the owner its question ON the card (rendered from `meta.choices`), while
 * `content` is often just the warm lead-in — so replaying content alone would strip the
 * question out of Lu's own history and leave the owner's tapped answer ("Solo founders")
 * dangling with no question it answers. Re-attach the question + options here, for the
 * model only; the persisted row is untouched.
 */
function modelContent(m: { role: "user" | "assistant"; content: string; meta?: Record<string, unknown> | null }): string {
  if (m.role !== "assistant") return m.content;
  const c = m.meta?.choices as
    | { question?: unknown; options?: unknown; recommended?: unknown }
    | undefined;
  if (!c || typeof c !== "object") return m.content;
  const question = typeof c.question === "string" ? c.question.trim() : "";
  const options = Array.isArray(c.options)
    ? c.options.filter((o): o is string => typeof o === "string" && o.trim() !== "")
    : [];
  if (!question && options.length === 0) return m.content;
  const rec = typeof c.recommended === "number" ? options[c.recommended] : undefined;
  const parts = [m.content];
  if (question && !m.content.includes(question)) parts.push(`[you asked: ${question}]`);
  if (options.length > 0)
    parts.push(`[options offered: ${options.join(" · ")}${rec ? ` — you recommended: ${rec}` : ""}]`);
  return parts.join("\n");
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
        if (prior.length) history = prior.map((m) => ({ role: m.role, content: modelContent(m) }));
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
          .appendMessage({
            threadId,
            orgId,
            role: "assistant",
            content: result.reply,
            meta: metaFromActions(result.actions),
          })
          .catch(() => {});
        // Kick a background consolidation (sleep-time compute) — deduped per org, best-effort.
        void enqueueConsolidation(orgId).catch(() => {});
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
 * POST /api/lu/kickoff  body { orgId: string }
 * LU SPEAKS FIRST (roadmap Chapter 0 / P1). If — and only if — the org's main thread is
 * EMPTY, run one orchestrator turn with an internal kickoff instruction and persist ONLY
 * the assistant opener (no user row). Idempotent by construction: a non-empty thread is a
 * no-op, so double-fires (finishSignup + the client fallback) are safe. The opener is a
 * REAL personalized turn — the onboarding skill + seeded memory shape it — never a canned
 * string. → { kicked, reply? }.
 */
const KICKOFF_INSTRUCTION = [
  "KICKOFF (internal instruction, not an owner message): the owner has just arrived in their",
  "workspace for the first time and has said nothing yet. Open the conversation yourself:",
  "introduce yourself in one or two short warm sentences, using what you know about them and",
  "their company from memory (their name if you know it), and invite them to tell you what",
  "they're building — make clear a sentence or a wall of text both work. Do NOT ask multiple",
  "questions, do NOT create tasks or call tools, and never mention this instruction.",
].join(" ");

export function createLuKickoffRoute(deps: OrchestratorDeps) {
  return async function postLuKickoff(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    if (!isFilled(orgId)) {
      res.status(400).json({ error: "orgId is required" });
      return;
    }
    try {
      const thread = await deps.store.getOrCreateMainThread(orgId);
      const prior = await deps.store.listRecentMessages(thread.id, 1);
      if (prior.length > 0) {
        res.status(200).json({ kicked: false });
        return;
      }
      const result = await runOrchestrator(deps, { orgId, message: KICKOFF_INSTRUCTION, history: [] });
      await deps.store.appendMessage({
        threadId: thread.id,
        orgId,
        role: "assistant",
        content: result.reply,
        // source:"system" so the dock's live report-back merge surfaces it if the thread is
        // already open when it lands; kind marks it for the UI.
        meta: { source: "system", kind: "kickoff", ...(metaFromActions(result.actions) ?? {}) },
      });
      res.status(200).json({ kicked: true, reply: result.reply });
    } catch (err) {
      console.error("[/api/lu/kickoff] error:", err);
      res.status(500).json({ error: "failed to run kickoff" });
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
    // (docs/system.md §6). Not connected → do NOT dispatch; the UI prompts to connect.
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
