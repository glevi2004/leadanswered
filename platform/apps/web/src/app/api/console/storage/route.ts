import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/console/storage — same-origin proxy to apps/api `GET /api/console/storage?orgId=`.
 * Returns the shared Supabase project's storage buckets (+ files) so the console's Storage tab
 * can mirror them. Resolves the session org here; the browser never passes an orgId.
 *   → { buckets }
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = { buckets: [] as unknown[] };

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json(EMPTY);
  const data = await proxyGet<typeof EMPTY>("/api/console/storage", orgId, EMPTY);
  return Response.json(data);
}
