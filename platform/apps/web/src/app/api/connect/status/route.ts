import { currentOrgId, proxyGet } from "@/lib/dock/backend";

/**
 * GET /api/connect/status — same-origin proxy to apps/api `GET /api/connect/status?orgId=`.
 * Resolves the session org server-side (the client never passes an orgId) and returns which
 * providers this org has connected, so the Connections panel + onboarding can render
 * connected / not-connected. → { github: boolean, vercel: boolean, supabase: boolean }.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface ConnectStatus {
  github: boolean;
  vercel: boolean;
  supabase: boolean;
}

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ github: false, vercel: false, supabase: false } satisfies ConnectStatus);
  const data = await proxyGet<Partial<ConnectStatus>>("/api/connect/status", orgId, {});
  return Response.json({
    github: Boolean(data.github),
    vercel: Boolean(data.vercel),
    supabase: Boolean(data.supabase),
  } satisfies ConnectStatus);
}
