import { API_BASE, currentOrgId, PROXY_HEADERS } from "@/lib/dock/backend";

/**
 * DELETE /api/canvas/edges/:id — same-origin proxy to apps/api `DELETE /api/canvas/edges/:id`.
 * Removes a capability-grant edge. We resolve the session org to gate the request
 * (a signed-out caller must not mutate the canvas); the browser never passes an orgId.
 * → { ok }.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });
  const { id } = await params;

  try {
    const res = await fetch(`${API_BASE}/api/canvas/edges/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "content-type": "application/json", ...PROXY_HEADERS },
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/canvas/edges/:id] DELETE error:", err);
    return Response.json({ error: "delete_failed" }, { status: 502 });
  }
}
