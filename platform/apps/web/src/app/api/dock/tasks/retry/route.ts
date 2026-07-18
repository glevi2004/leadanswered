import { API_BASE, PROXY_HEADERS, currentOrgId } from "@/lib/dock/backend";

/**
 * POST /api/dock/tasks/retry — re-dispatch an existing task's build (the Task Detail's Retry;
 * DEVELOPMENT ladder step 0). Same-origin proxy → apps/api POST /api/engineering with the
 * session org + the task id + its brief. The api verifies org ownership of the task.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });

  let taskId: string;
  let message: string;
  try {
    const body = (await req.json()) as { taskId?: string; message?: string };
    taskId = String(body.taskId ?? "").trim();
    message = String(body.message ?? "").trim();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!taskId || !message) return Response.json({ error: "taskId and message required" }, { status: 400 });

  try {
    const res = await fetch(`${API_BASE}/api/engineering`, {
      method: "POST",
      headers: { "content-type": "application/json", ...PROXY_HEADERS },
      body: JSON.stringify({ orgId, taskId, message }),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/dock/tasks/retry] error:", err);
    return Response.json({ error: "retry_failed" }, { status: 502 });
  }
}
