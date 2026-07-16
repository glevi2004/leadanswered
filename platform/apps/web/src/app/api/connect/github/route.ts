import { API_BASE, currentOrgId } from "@/lib/dock/backend";

/**
 * BYO connect — GitHub (token-paste MVP). Same-origin proxy so the browser never hits
 * Railway and never passes an orgId (see `apps/api/.../lu/chat` for the pattern). We
 * resolve the session org here and forward it to apps/api:
 *   POST   /api/connect/github  body { token }        → apps/api POST /api/connect/github
 *                                                        { orgId, token } → { ok, login? }
 *   DELETE /api/connect/github                         → apps/api DELETE /api/connect/github
 *                                                        { orgId } → { ok }
 * The owner pastes a GitHub Personal Access Token (classic, `repo` scope); the Engineer
 * then builds into THEIR GitHub account. On an invalid token apps/api answers non-2xx with
 * an `{ error }` message which we pass straight through so the UI can surface it inline.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });

  let token: string;
  try {
    const body = (await req.json()) as { token?: string };
    token = String(body.token ?? "").trim();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!token) return Response.json({ error: "A GitHub token is required." }, { status: 400 });

  try {
    const res = await fetch(`${API_BASE}/api/connect/github`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId, token }),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/connect/github] POST error:", err);
    return Response.json({ error: "connect_failed" }, { status: 502 });
  }
}

export async function DELETE() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });

  try {
    const res = await fetch(`${API_BASE}/api/connect/github`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/connect/github] DELETE error:", err);
    return Response.json({ error: "disconnect_failed" }, { status: 502 });
  }
}
