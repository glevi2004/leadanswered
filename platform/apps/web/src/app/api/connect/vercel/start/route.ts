import { redirect } from "next/navigation";
import { currentOrgId } from "@/lib/dock/backend";

/**
 * GET /api/connect/vercel/start — send the signed-in owner to the "Lu Computer" Vercel
 * Integration's install screen (byo-connect Phase 2). Vercel handles team + project scope,
 * then redirects to our Redirect URL (/api/connect/vercel/callback) with a code.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await currentOrgId();
  if (!orgId) redirect("/sign-in");
  const slug = (process.env.VERCEL_INTEGRATION_SLUG ?? "").trim();
  if (!slug) redirect("/canvas"); // integration not registered yet — nothing to install
  redirect(`https://vercel.com/integrations/${slug}/new`);
}
