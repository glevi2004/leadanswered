import { redirect } from "next/navigation";
import { currentOrgId } from "@/lib/dock/backend";

/**
 * GET /api/connect/github/start — send the signed-in owner to the "Lu Computer" GitHub App's
 * install screen (byo-connect Phase 2). GitHub handles account + repo selection, then
 * redirects to our Setup URL (/api/connect/github/callback) with the installation_id.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) redirect("/sign-in");
  const slug = (process.env.GITHUB_APP_SLUG ?? "lu-computer").trim();
  redirect(`https://github.com/apps/${slug}/installations/new`);
}
