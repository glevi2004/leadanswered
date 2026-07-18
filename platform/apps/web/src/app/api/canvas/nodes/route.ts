import { API_BASE, currentOrgId, PROXY_HEADERS } from "@/lib/dock/backend";

/**
 * POST /api/canvas/nodes — same-origin proxy to apps/api `POST /api/canvas/nodes`.
 * The browser sends { type, x, y, w?, h?, refId? } (never an orgId); we resolve the
 * session org here and inject it, then forward. → the created node.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_BASE}/api/canvas/nodes`, {
      method: "POST",
      headers: { "content-type": "application/json", ...PROXY_HEADERS },
      body: JSON.stringify({ ...body, orgId }),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/canvas/nodes] POST error:", err);
    return Response.json({ error: "create_failed" }, { status: 502 });
  }
}
