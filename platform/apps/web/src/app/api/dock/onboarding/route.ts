import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/dock/onboarding — same-origin proxy to apps/api `GET /api/onboarding/status?orgId=`.
 * `active:true` means the org is still in the in-workspace Lu onboarding (docs/product.md §5
 * Phase 2) — i.e. no department has been activated yet. The dock polls this to show the
 * onboarding conversation + cards and to auto-open on landing. → { active }.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ active: false });
  const data = await proxyGet<{ active?: boolean }>("/api/onboarding/status", orgId, { active: false });
  return Response.json({ active: data.active ?? false });
}
