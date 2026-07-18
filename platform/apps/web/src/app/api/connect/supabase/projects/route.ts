import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/connect/supabase/projects — same-origin proxy to apps/api. Lists the OAuth-connected
 * org's Supabase projects so the connect card can show a picker when more than one exists.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ projects: [] });
  const data = await proxyGet<{ projects?: unknown[] }>("/api/connect/supabase/projects", orgId, {
    projects: [],
  });
  return Response.json({ projects: data.projects ?? [] });
}
