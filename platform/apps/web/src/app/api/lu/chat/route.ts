import { API_BASE, currentOrgId } from "@/lib/dock/backend";

/**
 * INVOKE — the New org's ONE assistant, wired to the REAL Lu ORCHESTRATOR
 * (apps/api `POST /api/lu`). The global Lu widget/dock/`/sarah` POSTs the conversation
 * here; this route (server-side, so the browser never hits Railway and never passes an
 * orgId):
 *   1) resolves the session org,
 *   2) forwards { orgId, message, history } to the orchestrator, which understands the
 *      goal, decomposes it into Task rows, delegates to the owning department, AND
 *      dispatches engineering work itself (its `dispatch_to_engineering` tool → the
 *      durable build worker) — no hand-off glue here anymore,
 *   3) returns { reply, tasksCreated, actions } — the client keeps its existing chat UX.
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

  try {
    const res = await fetch(`${API_BASE}/api/lu`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId, message, history }),
    });
    if (!res.ok) throw new Error(`lu route ${res.status}`);
    const data = (await res.json()) as Partial<LuResult>;
    return Response.json({
      reply: data.reply ?? "",
      tasksCreated: Array.isArray(data.tasksCreated) ? data.tasksCreated : [],
      actions: Array.isArray(data.actions) ? data.actions : [],
    } satisfies LuResult);
  } catch (err) {
    console.error("[lu/chat] orchestrator error:", err);
    return Response.json({ error: "generation_failed" }, { status: 502 });
  }
}
