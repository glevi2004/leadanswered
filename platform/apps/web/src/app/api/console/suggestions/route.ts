import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/console/suggestions — same-origin proxy to apps/api `GET /api/console/suggestions?orgId=`.
 * Returns the shared Supabase project's advisors (security/performance findings — unused index,
 * RLS-with-no-policy, etc.) so the console's Suggestions tab can mirror them. Resolves the
 * session org here; the browser never passes an orgId.
 *   → { advisors:[{title,level,category,detail}] }
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = { advisors: [] as unknown[] };

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json(EMPTY);
  const data = await proxyGet<typeof EMPTY>("/api/console/suggestions", orgId, EMPTY);
  return Response.json(data);
}
