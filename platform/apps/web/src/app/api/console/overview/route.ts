import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/console/overview — same-origin proxy to apps/api `GET /api/console/overview?orgId=`.
 * Resolves the session org server-side (the client never passes an orgId) and returns whether
 * this org's shared Supabase project is connected + its ref/url, so the Database-view console
 * header can render connected / not-connected. → { connected, projectRef?, projectUrl? }.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = { connected: false } as const;

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json(EMPTY);
  const data = await proxyGet<{ connected?: boolean }>("/api/console/overview", orgId, EMPTY);
  return Response.json(data);
}
