import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/dock/approvals — same-origin proxy to apps/api `GET /api/approvals?orgId=`.
 * Returns the org's PENDING approvals (the "Needs you" publish gates the Engineer opened)
 * so the dock can render a Publish / Reject card. → { approvals }.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ approvals: [] });
  const data = await proxyGet<{ approvals?: unknown[] }>("/api/approvals", orgId, { approvals: [] });
  return Response.json({ approvals: data.approvals ?? [] });
}
