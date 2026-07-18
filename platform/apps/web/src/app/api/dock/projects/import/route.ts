import { API_BASE, PROXY_HEADERS, currentOrgId } from "@/lib/dock/backend";

/**
 * POST /api/dock/projects/import — import an existing repo as a Lu project (ladder step 2).
 * Body { repoFullName, setupCommand?, testCommand? }; the session org resolves server-side.
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
    const res = await fetch(`${API_BASE}/api/projects/import`, {
      method: "POST",
      headers: { "content-type": "application/json", ...PROXY_HEADERS },
      body: JSON.stringify({ orgId, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/dock/projects/import] error:", err);
    return Response.json({ error: "import_failed" }, { status: 502 });
  }
}
