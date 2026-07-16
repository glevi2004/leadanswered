import { API_BASE, currentOrgId } from "@/lib/dock/backend";

/**
 * POST /api/dock/approvals/resolve  body { approvalId, decision: "approved"|"rejected" }
 * — the owner's Publish / Reject button. Same-origin proxy to apps/api
 * `POST /api/approvals/:id/resolve`. On "approved" the backend runs confirmPublish
 * (merge PR → promote to prod → attach domain → site live); on "rejected" it just
 * resolves the gate. We forward the session `orgId` so the backend can infer the siteId.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });

  let approvalId: string;
  let decision: string;
  try {
    const body = (await req.json()) as { approvalId?: string; decision?: string };
    approvalId = String(body.approvalId ?? "");
    decision = String(body.decision ?? "");
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!approvalId || (decision !== "approved" && decision !== "rejected")) {
    return Response.json({ error: "approvalId and a valid decision are required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_BASE}/api/approvals/${encodeURIComponent(approvalId)}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, orgId }),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/dock/approvals/resolve] error:", err);
    return Response.json({ error: "resolve_failed" }, { status: 502 });
  }
}
