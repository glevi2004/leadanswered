import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/console/auth — same-origin proxy to apps/api `GET /api/console/auth?orgId=`.
 * Returns the shared Supabase project's auth config — signup/anon settings, redirect URLs, and
 * providers — so the console's Authentication tab can mirror it. Resolves the session org here;
 * the browser never passes an orgId.
 *   → { settings, redirectUrls, providers }
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = { settings: {}, redirectUrls: [] as unknown[], providers: [] as unknown[] };

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json(EMPTY);
  const data = await proxyGet<typeof EMPTY>("/api/console/auth", orgId, EMPTY);
  return Response.json(data);
}
