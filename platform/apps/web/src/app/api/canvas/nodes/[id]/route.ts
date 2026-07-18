import { API_BASE, currentOrgId, PROXY_HEADERS } from "@/lib/dock/backend";

/**
 * PATCH  /api/canvas/nodes/:id — proxy to apps/api `PATCH /api/canvas/nodes/:id`
 *                                 body { x?, y?, w?, h?, refId? } (drag / resize) → node.
 * DELETE /api/canvas/nodes/:id — proxy to apps/api `DELETE /api/canvas/nodes/:id` → { ok }.
 * The node id is a session-scoped record; we still resolve the session org to gate
 * the request (a signed-out caller must not mutate the canvas). The browser never
 * passes an orgId.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_BASE}/api/canvas/nodes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...PROXY_HEADERS },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/canvas/nodes/:id] PATCH error:", err);
    return Response.json({ error: "update_failed" }, { status: 502 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });
  const { id } = await params;

  try {
    const res = await fetch(`${API_BASE}/api/canvas/nodes/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "content-type": "application/json", ...PROXY_HEADERS },
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/canvas/nodes/:id] DELETE error:", err);
    return Response.json({ error: "delete_failed" }, { status: 502 });
  }
}
