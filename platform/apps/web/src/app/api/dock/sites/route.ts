import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/dock/sites — same-origin proxy to apps/api `GET /api/sites?orgId=`.
 * Resolves the session org server-side (the client never passes an orgId) and returns the
 * org's sites, each with its latest deployment (preview/production url + status), so the
 * canvas can render a live SITE-PREVIEW frame per Site the Engineer builds. → { sites }.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ sites: [] });
  const data = await proxyGet<{ sites?: unknown[] }>("/api/sites", orgId, { sites: [] });
  return Response.json({ sites: data.sites ?? [] });
}
