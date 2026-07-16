import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/console/database — same-origin proxy to apps/api `GET /api/console/database?orgId=`.
 * Mirrors the shared Supabase project's schema: the list of schemas + tables (with row counts),
 * and — when `?table=` is passed — that table's rows (a read browse). `?query=` forwards a raw
 * read query for the query box (forward-compatible: degrades to no-results if apps/api can't run
 * it yet). Resolves the session org here; the browser never passes an orgId.
 *   → { schemas, tables:[{schema,name,rows}], rows? }
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = { schemas: [] as string[], tables: [] as unknown[] };

export async function GET(req: Request) {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json(EMPTY);
  const url = new URL(req.url);
  const extra: Record<string, string> = {};
  for (const key of ["table", "schema", "query"] as const) {
    const value = url.searchParams.get(key);
    if (value) extra[key] = value;
  }
  const data = await proxyGet<typeof EMPTY>("/api/console/database", orgId, EMPTY, extra);
  return Response.json(data);
}
