import { redirect } from "next/navigation";
import { currentOrgId } from "@/lib/dock/backend";

/**
 * GET /api/connect/supabase/start — send the signed-in owner to the "Lu Computer" Supabase
 * OAuth authorize screen (byo-connect Phase 2). They approve org access; Supabase redirects
 * to our callback with a code.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) redirect("/sign-in");
  const clientId = (process.env.SUPABASE_OAUTH_CLIENT_ID ?? "").trim();
  if (!clientId) redirect("/canvas"); // OAuth app not registered yet — nothing to authorize
  const redirectUri =
    (process.env.SUPABASE_OAUTH_REDIRECT_URI ?? "https://app.lu.computer/api/connect/supabase/callback").trim();
  const u = new URL("https://api.supabase.com/v1/oauth/authorize");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", orgId); // session-resolved on callback; state guards CSRF
  redirect(u.toString());
}
