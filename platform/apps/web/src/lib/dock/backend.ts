import { currentUser, isAdminEmail } from "@/lib/auth";
import { getOrganizationByOwnerEmail } from "@/lib/organizations";

/**
 * SERVER-ONLY seam between the web app and the Lu Computer agent backend (apps/api).
 * The browser must NEVER call Railway directly (CORS) — every dock read/write goes
 * through a same-origin Next route that resolves the session org here and forwards
 * to `${API_PUBLIC_URL}/...`. So the client never has to know (or pass) an orgId.
 *
 * `API_PUBLIC_URL` is the same env the canvas/onboarding server actions already read;
 * localhost default matches apps/api's dev PORT (3000).
 */
export const API_BASE = (process.env.API_PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * Resolve the signed-in owner's organization id for a Next API route. Mirrors
 * `requireOrganization()` (dashboard-auth) but NON-redirecting: returns null instead
 * of throwing a redirect, so a dock proxy can answer with an empty payload rather than
 * bouncing an XHR to /sign-in.
 */
export async function currentOrgId(): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;
  if (isAdminEmail(user.email)) return null;
  const organization = await getOrganizationByOwnerEmail(user.email ?? "");
  return organization?.id ? String(organization.id) : null;
}

/**
 * Forward a GET to an apps/api read route for the current org, returning the parsed
 * JSON (or a supplied fallback on any failure — no-org, network error, non-2xx). The
 * dock polls these on an interval, so a hiccup must degrade to "no new data", never throw.
 */
export async function proxyGet<T>(
  path: string,
  orgId: string,
  fallback: T,
  extraParams?: Record<string, string>,
): Promise<T> {
  try {
    const qs = new URLSearchParams({ orgId, ...(extraParams ?? {}) });
    const res = await fetch(`${API_BASE}${path}?${qs.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[dock] GET ${path} failed: ${res.status}`);
      return fallback;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[dock] GET ${path} error:`, err);
    return fallback;
  }
}
