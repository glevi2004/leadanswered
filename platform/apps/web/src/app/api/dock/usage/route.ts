import { API_BASE, currentOrgId } from "@/lib/dock/backend";

/**
 * GET /api/dock/usage — the session org's metered agent-compute this period vs its bucket
 * (plan Pillar 2). Server-side proxy: resolves the org from the session, forwards to apps/api
 * `GET /api/usage`, so the browser never passes an orgId.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });
  try {
    const res = await fetch(`${API_BASE}/api/usage?orgId=${encodeURIComponent(orgId)}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`usage ${res.status}`);
    return Response.json(await res.json());
  } catch (err) {
    console.error("[dock/usage] error:", err);
    return Response.json({ error: "failed" }, { status: 502 });
  }
}
