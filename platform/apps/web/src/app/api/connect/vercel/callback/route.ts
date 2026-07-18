import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { API_BASE, PROXY_HEADERS, currentOrgId } from "@/lib/dock/backend";

/**
 * GET /api/connect/vercel/callback — the Vercel Integration's Redirect URL (byo-connect
 * Phase 2). Vercel redirects here after install with ?code=…&teamId=…&configurationId=…;
 * we resolve the session org server-side and hand the code to apps/api, which exchanges it
 * (client id/secret) for the integration-scoped access token and stores it. Back to the
 * canvas — the dock's status poll flips Vercel to Connected.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orgId = await currentOrgId();
  if (!orgId) redirect("/sign-in");

  const code = req.nextUrl.searchParams.get("code");
  const teamId = req.nextUrl.searchParams.get("teamId");
  if (code) {
    try {
      await fetch(`${API_BASE}/api/connect/vercel`, {
        method: "POST",
        headers: { "content-type": "application/json", ...PROXY_HEADERS },
        body: JSON.stringify({ orgId, code, ...(teamId ? { teamId } : {}) }),
      });
    } catch (err) {
      console.warn("[connect/vercel/callback] failed to register install:", err);
    }
  }
  // Vercel also passes `next` — honoring our own surface is safer than an open redirect.
  redirect("/canvas");
}
