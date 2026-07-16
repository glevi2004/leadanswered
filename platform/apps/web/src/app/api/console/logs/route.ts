import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/console/logs — same-origin proxy to apps/api `GET /api/console/logs?orgId=`.
 * Returns the shared Supabase project's function/edge logs so the console's Logs tab can mirror
 * them. Resolves the session org here; the browser never passes an orgId.
 *   → { logs }
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = { logs: [] as unknown[] };

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json(EMPTY);
  const data = await proxyGet<typeof EMPTY>("/api/console/logs", orgId, EMPTY);
  return Response.json(data);
}
