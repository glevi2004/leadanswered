import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/dock/events — same-origin proxy to apps/api `GET /api/events?orgId=`.
 * The org's journal (docs/system.md §2), newest-first — the chat derives its live
 * activity line and phase states from this. → { events }.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ events: [] });
  const data = await proxyGet<{ events?: unknown[] }>("/api/events", orgId, { events: [] });
  return Response.json({ events: data.events ?? [] });
}
