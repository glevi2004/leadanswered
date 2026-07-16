import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/console/migrations — same-origin proxy to apps/api `GET /api/console/migrations?orgId=`.
 * Returns the shared Supabase project's applied migration history so the console's Migrations tab
 * can mirror it. Resolves the session org here; the browser never passes an orgId.
 *   → { migrations:[{version,name}] }
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = { migrations: [] as unknown[] };

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json(EMPTY);
  const data = await proxyGet<typeof EMPTY>("/api/console/migrations", orgId, EMPTY);
  return Response.json(data);
}
