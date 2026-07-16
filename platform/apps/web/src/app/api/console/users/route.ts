import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/console/users — same-origin proxy to apps/api `GET /api/console/users?orgId=`.
 * Returns the shared Supabase project's auth users — total count, recent signups, and an
 * optional signups series — so the console's Users tab can mirror them. Resolves the session
 * org here; the browser never passes an orgId.
 *   → { count, recent, series? }
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = { count: 0, recent: [] as unknown[] };

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json(EMPTY);
  const data = await proxyGet<typeof EMPTY>("/api/console/users", orgId, EMPTY);
  return Response.json(data);
}
