import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/lu/history — same-origin proxy to apps/api `GET /api/lu/history?orgId=`.
 * The persisted Lu conversation (docs/product.md §4 — thread rehydration): the dock
 * reads this on load so a reload shows the real thread — including system report-back
 * messages (build finished, published, failed) — instead of a fresh greeting.
 * → { threadId, messages }.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ threadId: null, messages: [] });
  const data = await proxyGet<{ threadId?: string | null; messages?: unknown[] }>(
    "/api/lu/history",
    orgId,
    { threadId: null, messages: [] },
  );
  return Response.json({ threadId: data.threadId ?? null, messages: data.messages ?? [] });
}
