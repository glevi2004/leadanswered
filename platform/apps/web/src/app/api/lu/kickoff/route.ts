import { API_BASE, currentOrgId, PROXY_HEADERS } from "@/lib/dock/backend";

/**
 * LU SPEAKS FIRST (roadmap Chapter 0 / P1). Fires the server-side kickoff turn for the
 * session org — the api only acts if the org's thread is EMPTY (idempotent), so this is
 * safe to call from both finishSignup and the dock's empty-thread fallback. The browser
 * never touches Railway and never handles an orgId.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const orgId = await currentOrgId();
  if (!orgId) return Response.json({ error: "no_org" }, { status: 401 });
  try {
    const res = await fetch(`${API_BASE}/api/lu/kickoff`, {
      method: "POST",
      headers: { "content-type": "application/json", ...PROXY_HEADERS },
      body: JSON.stringify({ orgId }),
    });
    if (!res.ok) throw new Error(`kickoff ${res.status}`);
    const data = (await res.json()) as { kicked?: boolean; reply?: string };
    return Response.json({ kicked: Boolean(data.kicked), reply: data.reply ?? "" });
  } catch (err) {
    console.error("[lu/kickoff] error:", err);
    return Response.json({ error: "kickoff_failed" }, { status: 502 });
  }
}
