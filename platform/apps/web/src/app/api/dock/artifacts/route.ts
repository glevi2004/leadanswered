import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/dock/artifacts?taskId= — same-origin proxy to apps/api
 * `GET /api/artifacts?orgId=&taskId=`. Returns the org's artifacts (optionally narrowed
 * to one task) so the dock can render the agent_session transcript, pr_diff summary, and
 * site_preview link as the Engineer works. → { artifacts }.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ artifacts: [] });
  const taskId = new URL(req.url).searchParams.get("taskId");
  const data = await proxyGet<{ artifacts?: unknown[] }>(
    "/api/artifacts",
    orgId,
    { artifacts: [] },
    taskId ? { taskId } : undefined,
  );
  return Response.json({ artifacts: data.artifacts ?? [] });
}
