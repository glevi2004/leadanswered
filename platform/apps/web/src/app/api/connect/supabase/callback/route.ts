import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { API_BASE, PROXY_HEADERS, currentOrgId } from "@/lib/dock/backend";

/**
 * GET /api/connect/supabase/callback — the Supabase OAuth redirect (byo-connect Phase 2).
 * Supabase redirects here with ?code=…; we resolve the session org and hand the code to
 * apps/api, which exchanges it for management + refresh tokens and (if there's exactly one
 * project) auto-selects it. Back to the canvas — the dock's status poll reflects the result;
 * if multiple projects, the connect card shows a picker.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orgId = await currentOrgId();
  if (!orgId) redirect("/sign-in");

  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    try {
      await fetch(`${API_BASE}/api/connect/supabase`, {
        method: "POST",
        headers: { "content-type": "application/json", ...PROXY_HEADERS },
        body: JSON.stringify({ orgId, code }),
      });
    } catch (err) {
      console.warn("[connect/supabase/callback] failed to complete OAuth:", err);
    }
  }
  redirect("/canvas");
}
