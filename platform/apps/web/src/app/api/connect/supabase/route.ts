import { API_BASE, currentOrgId, PROXY_HEADERS } from "@/lib/dock/backend";

/**
 * BYO connect — Supabase (project-ref + service-key paste MVP). Same-origin proxy so the
 * browser never hits Railway and never passes an orgId (mirrors `/api/connect/vercel`). We
 * resolve the session org here and forward it to apps/api:
 *   POST   /api/connect/supabase  body { projectRef, serviceKey } → apps/api POST
 *          /api/connect/supabase { orgId, projectRef, serviceKey } → { ok }
 *   DELETE /api/connect/supabase                                   → apps/api DELETE
 *          /api/connect/supabase { orgId } → { ok }
 * The owner pastes their project ref + a service-role key; the Engineer then builds every
 * department's sites into THAT one shared Supabase project (canvas.md "the backend"), and
 * the Database console mirrors it. On invalid creds apps/api answers non-2xx with an
 * `{ error }` message which we pass straight through so the UI can surface it inline.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });

  let projectRef: string;
  let serviceKey: string;
  try {
    const body = (await req.json()) as { projectRef?: string; serviceKey?: string };
    projectRef = String(body.projectRef ?? "").trim();
    serviceKey = String(body.serviceKey ?? "").trim();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!projectRef) return Response.json({ error: "A Supabase project ref is required." }, { status: 400 });
  if (!serviceKey) return Response.json({ error: "A Supabase service-role key is required." }, { status: 400 });

  try {
    const res = await fetch(`${API_BASE}/api/connect/supabase`, {
      method: "POST",
      headers: { "content-type": "application/json", ...PROXY_HEADERS },
      body: JSON.stringify({ orgId, projectRef, serviceKey }),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/connect/supabase] POST error:", err);
    return Response.json({ error: "connect_failed" }, { status: 502 });
  }
}

export async function DELETE() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });

  try {
    const res = await fetch(`${API_BASE}/api/connect/supabase`, {
      method: "DELETE",
      headers: { "content-type": "application/json", ...PROXY_HEADERS },
      body: JSON.stringify({ orgId }),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/connect/supabase] DELETE error:", err);
    return Response.json({ error: "disconnect_failed" }, { status: 502 });
  }
}
