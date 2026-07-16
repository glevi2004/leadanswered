import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/console/secrets — same-origin proxy to apps/api `GET /api/console/secrets?orgId=`.
 * Returns the shared Supabase project's API surface — project URL + publishable (anon) key and
 * the secret-key state — so the console's Secrets tab can mirror them. The secret key itself is
 * brokered and never returned to the model/browser; only its state (set/unset) is. Resolves the
 * session org here; the browser never passes an orgId.
 *   → { projectUrl, publishableKey, secretKeyState }
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = {};

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json(EMPTY);
  const data = await proxyGet<Record<string, unknown>>("/api/console/secrets", orgId, EMPTY);
  return Response.json(data);
}
