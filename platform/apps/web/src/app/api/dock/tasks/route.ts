import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/dock/tasks — same-origin proxy to apps/api `GET /api/tasks?orgId=`.
 * Resolves the session org server-side (the client never passes an orgId) and returns
 * the org's tasks so the Lu dock can WATCH live status. → { tasks }.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ tasks: [] });
  const data = await proxyGet<{ tasks?: unknown[] }>("/api/tasks", orgId, { tasks: [] });
  return Response.json({ tasks: data.tasks ?? [] });
}
