import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/dock/github-repos — the import picker's repo list (ladder step 2): the repos the
 * org's GitHub connection can see (App install → its granted repos; PAT → the user's own).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ repos: [] });
  const data = await proxyGet<{ repos?: unknown[] }>("/api/github/repos", orgId, { repos: [] });
  return Response.json({ repos: data.repos ?? [] });
}
