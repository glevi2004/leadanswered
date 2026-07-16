import { API_BASE, currentOrgId } from "@/lib/dock/backend";

/**
 * BYO connect — Vercel (token-paste MVP). Same-origin proxy so the browser never hits
 * Railway and never passes an orgId (see `apps/api/.../lu/chat` for the pattern). We
 * resolve the session org here and forward it to apps/api:
 *   POST   /api/connect/vercel  body { token, teamId? } → apps/api POST /api/connect/vercel
 *                                                          { orgId, token, teamId? } → { ok }
 *   DELETE /api/connect/vercel                           → apps/api DELETE /api/connect/vercel
 *                                                          { orgId } → { ok }
 * The owner pastes a Vercel access token (+ optional team id); the Engineer then deploys
 * into THEIR Vercel account. On an invalid token apps/api answers non-2xx with an
 * `{ error }` message which we pass straight through so the UI can surface it inline.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });

  let token: string;
  let teamId: string | undefined;
  try {
    const body = (await req.json()) as { token?: string; teamId?: string };
    token = String(body.token ?? "").trim();
    teamId = body.teamId ? String(body.teamId).trim() : undefined;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!token) return Response.json({ error: "A Vercel token is required." }, { status: 400 });

  try {
    const res = await fetch(`${API_BASE}/api/connect/vercel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId, token, ...(teamId ? { teamId } : {}) }),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/connect/vercel] POST error:", err);
    return Response.json({ error: "connect_failed" }, { status: 502 });
  }
}

export async function DELETE() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });

  try {
    const res = await fetch(`${API_BASE}/api/connect/vercel`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/connect/vercel] DELETE error:", err);
    return Response.json({ error: "disconnect_failed" }, { status: 502 });
  }
}
