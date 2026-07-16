import { API_BASE, currentOrgId } from "@/lib/dock/backend";

/**
 * INVOKE — the New org's ONE assistant, now wired to the REAL Lu ORCHESTRATOR
 * (apps/api `POST /api/lu`) instead of a tool-less Haiku chat. The global Lu
 * widget/dock/`/sarah` POSTs the conversation here; this route (server-side, so the
 * browser never hits Railway and never passes an orgId):
 *   1) resolves the session org,
 *   2) forwards { orgId, message, history } to the orchestrator, which understands the
 *      goal, decomposes it into Task rows, and delegates to the owning department,
 *   3) DISPATCHES every engineering Task it created to `POST /api/engineering` so the
 *      async build actually runs (fire-and-forget; the dock then WATCHes it), and
 *   4) returns { reply, tasksCreated, actions } — the client keeps its existing chat UX.
 *
 * The client speaks the same `{ messages }` shape it always has; we split the transcript
 * into the latest turn (`message`) + prior turns (`history`) the orchestrator expects.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface LuResult {
  reply: string;
  tasksCreated: string[];
  actions: unknown[];
}

interface TaskRow {
  id: string;
  departmentKey: string;
  title: string;
  body: string;
}

/**
 * Kick off the async Engineer build for a task the orchestrator just created (best-effort).
 * `runEngineering` treats the posted `message` as the build instruction, so we send the
 * Task's body (the detailed brief Lu wrote) and thread the taskId so it dispatches the
 * EXISTING task instead of minting a new one.
 */
async function dispatchEngineering(orgId: string, task: TaskRow): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/engineering`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId, taskId: task.id, message: task.body?.trim() || task.title }),
    });
    if (!res.ok) console.warn(`[lu/chat] engineering dispatch for ${task.id} → ${res.status}`);
  } catch (err) {
    console.warn(`[lu/chat] engineering dispatch for ${task.id} error:`, err);
  }
}

/** The subset of `tasksCreated` that belong to Engineering — those get an async build. */
async function engineeringTasks(orgId: string, createdIds: string[]): Promise<TaskRow[]> {
  if (createdIds.length === 0) return [];
  try {
    const res = await fetch(`${API_BASE}/api/tasks?orgId=${encodeURIComponent(orgId)}`, { cache: "no-store" });
    if (!res.ok) return [];
    const { tasks } = (await res.json()) as { tasks?: TaskRow[] };
    const created = new Set(createdIds);
    return (tasks ?? []).filter((t) => created.has(t.id) && t.departmentKey === "engineering");
  } catch (err) {
    console.warn("[lu/chat] could not resolve engineering tasks:", err);
    return [];
  }
}

export async function POST(req: Request) {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });

  let messages: ChatMessage[];
  try {
    ({ messages } = (await req.json()) as { messages: ChatMessage[] });
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  // Latest owner turn is the `message`; everything before it is `history`.
  const last = messages[messages.length - 1];
  const message = last?.content?.trim() ?? "";
  const history = messages.slice(0, -1);
  if (!message) return Response.json({ error: "empty_message" }, { status: 400 });

  let result: LuResult;
  try {
    const res = await fetch(`${API_BASE}/api/lu`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId, message, history }),
    });
    if (!res.ok) throw new Error(`lu route ${res.status}`);
    const data = (await res.json()) as Partial<LuResult>;
    result = {
      reply: data.reply ?? "",
      tasksCreated: Array.isArray(data.tasksCreated) ? data.tasksCreated : [],
      actions: Array.isArray(data.actions) ? data.actions : [],
    };
  } catch (err) {
    console.error("[lu/chat] orchestrator error:", err);
    return Response.json({ error: "generation_failed" }, { status: 502 });
  }

  // Dispatch the async build for every engineering Task Lu created this turn. Awaited
  // (each POST returns 202 immediately — the build runs in the background on apps/api),
  // so the serverless function isn't torn down before the kicks are sent.
  const engTasks = await engineeringTasks(orgId, result.tasksCreated);
  await Promise.allSettled(engTasks.map((task) => dispatchEngineering(orgId, task)));

  return Response.json(result);
}
