import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { API_BASE, PROXY_HEADERS, currentOrgId } from "@/lib/dock/backend";

/**
 * GET /api/connect/github/callback — the GitHub App's Setup URL (byo-connect Phase 2).
 * GitHub redirects here after install/update with ?installation_id=…; we resolve the
 * session org server-side, register the installation with apps/api (which verifies it by
 * minting a token), and land the owner back on the canvas — the dock's status poll flips
 * GitHub to Connected.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orgId = await currentOrgId();
  if (!orgId) redirect("/sign-in");

  const installationId = req.nextUrl.searchParams.get("installation_id");
  if (installationId) {
    try {
      await fetch(`${API_BASE}/api/connect/github`, {
        method: "POST",
        headers: { "content-type": "application/json", ...PROXY_HEADERS },
        body: JSON.stringify({ orgId, installationId }),
      });
    } catch (err) {
      console.warn("[connect/github/callback] failed to register installation:", err);
    }
  }
  redirect("/canvas");
}
