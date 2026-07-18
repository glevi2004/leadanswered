import { API_BASE, PROXY_HEADERS, currentOrgId } from "@/lib/dock/backend";

/**
 * POST /api/console/action — the console's WRITE proxy (§8b ladder 0b): the four key actions
 * whose api endpoints have existed since the audit finally get a web path. Allowlisted actions
 * only; the session org is resolved server-side like every other proxy.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS: Record<string, string> = {
  "rotate-secret": "/api/console/secrets/rotate",
  "add-redirect": "/api/console/auth/redirect",
  "create-bucket": "/api/console/storage/buckets",
  "add-user": "/api/console/users",
};

export async function POST(req: Request) {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const path = ACTIONS[String(body.action ?? "")];
  if (!path) return Response.json({ error: "unknown_action" }, { status: 400 });
  const { action: _action, ...params } = body;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...PROXY_HEADERS },
      body: JSON.stringify({ orgId, ...params }),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/console/action] error:", err);
    return Response.json({ error: "action_failed" }, { status: 502 });
  }
}
