import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/canvas — same-origin proxy to apps/api `GET /api/canvas?orgId=`.
 * Resolves the session org server-side (the client never passes an orgId) and returns
 * the whole persisted canvas so the composable-canvas UI can hydrate on load.
 * → { nodes, edges, collections }. Degrades to empty on no-org / failure.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = { nodes: [], edges: [], collections: [] };

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json(EMPTY);
  const data = await proxyGet<{ nodes?: unknown[]; edges?: unknown[]; collections?: unknown[] }>(
    "/api/canvas",
    orgId,
    EMPTY,
  );
  return Response.json({
    nodes: data.nodes ?? [],
    edges: data.edges ?? [],
    collections: data.collections ?? [],
  });
}
