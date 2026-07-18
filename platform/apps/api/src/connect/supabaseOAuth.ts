import type { Store } from "../store/types.js";

/**
 * Supabase Management-API OAuth (docs/byo-connect.md Phase 2 — "connect through THEIR apps").
 * The owner authorizes the "Lu Computer" OAuth app against their Supabase org; we exchange the
 * code for a management access token + refresh token (the mgmt token EXPIRES, unlike GitHub/
 * Vercel), list their projects, and fetch the chosen project's service_role key on demand.
 * `validManagementToken` transparently refreshes an expired token.
 *
 * Env: SUPABASE_OAUTH_CLIENT_ID · SUPABASE_OAUTH_CLIENT_SECRET · SUPABASE_OAUTH_REDIRECT_URI.
 * OAuth-mode is OFF until the first two are set — token-paste keeps working unchanged.
 */

const MGMT_API = "https://api.supabase.com";
const AUTHORIZE_URL = `${MGMT_API}/v1/oauth/authorize`;
const TOKEN_URL = `${MGMT_API}/v1/oauth/token`;

const clientId = () => (process.env.SUPABASE_OAUTH_CLIENT_ID ?? "").trim();
const clientSecret = () => (process.env.SUPABASE_OAUTH_CLIENT_SECRET ?? "").trim();
export const supabaseRedirectUri = () =>
  (process.env.SUPABASE_OAUTH_REDIRECT_URI ?? "https://app.lu.computer/api/connect/supabase/callback").trim();

export function supabaseOAuthConfigured(): boolean {
  return Boolean(clientId() && clientSecret());
}

export function supabaseAuthorizeUrl(state: string): string {
  const u = new URL(AUTHORIZE_URL);
  u.searchParams.set("client_id", clientId());
  u.searchParams.set("redirect_uri", supabaseRedirectUri());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", state);
  return u.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const basic = Buffer.from(`${clientId()}:${clientSecret()}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  if (!res.ok) {
    throw new Error(`Supabase OAuth token request failed (HTTP ${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

export function exchangeCode(code: string): Promise<TokenResponse> {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: supabaseRedirectUri(),
  });
}

export function refreshToken(token: string): Promise<TokenResponse> {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: token });
}

/** ISO expiry from an `expires_in` (seconds), minus a small safety margin. */
export function expiryFromNow(expiresInSeconds: number): string {
  return new Date(Date.now() + Math.max(0, expiresInSeconds - 60) * 1000).toISOString();
}

/**
 * A currently-valid management token for the org, refreshing (and persisting the new token +
 * refresh + expiry) if it's within 2 min of expiry. Returns null if the org isn't OAuth-connected.
 */
export async function validManagementToken(store: Store, orgId: string): Promise<string | null> {
  const conn = await store.getSupabaseConnection(orgId);
  if (!conn?.managementToken) return null;
  const expMs = conn.expiresAt ? new Date(conn.expiresAt).getTime() : 0;
  if (!conn.refreshToken || expMs - Date.now() > 2 * 60_000) return conn.managementToken;
  try {
    const t = await refreshToken(conn.refreshToken);
    await store.upsertSupabaseConnection(orgId, {
      managementToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt: expiryFromNow(t.expires_in),
    });
    return t.access_token;
  } catch (err) {
    console.error(`[supabase-oauth] refresh failed for org ${orgId}:`, err);
    return conn.managementToken; // stale, but let the caller try
  }
}

export interface SupabaseProject {
  ref: string;
  name: string;
  status: string;
}

export async function listProjects(mgmtToken: string): Promise<SupabaseProject[]> {
  const res = await fetch(`${MGMT_API}/v1/projects`, {
    headers: { authorization: `Bearer ${mgmtToken}` },
  });
  if (!res.ok) throw new Error(`Supabase list-projects failed (HTTP ${res.status})`);
  const data = (await res.json()) as Array<{ id?: string; ref?: string; name?: string; status?: string }>;
  return data
    .map((p) => ({ ref: p.ref ?? p.id ?? "", name: p.name ?? p.ref ?? "", status: p.status ?? "" }))
    .filter((p) => p.ref);
}

/** The project's service_role key via the Management API (byo-connect: no pasted key needed). */
export async function fetchServiceKey(mgmtToken: string, ref: string): Promise<string | null> {
  return (await fetchProjectKeys(mgmtToken, ref)).serviceKey;
}

/** Both project keys (anon + service_role) — provision_backend wires these into the app. */
export async function fetchProjectKeys(
  mgmtToken: string,
  ref: string,
): Promise<{ anonKey: string | null; serviceKey: string | null }> {
  const res = await fetch(`${MGMT_API}/v1/projects/${encodeURIComponent(ref)}/api-keys`, {
    headers: { authorization: `Bearer ${mgmtToken}` },
  });
  if (!res.ok) return { anonKey: null, serviceKey: null };
  const keys = (await res.json()) as Array<{ name?: string; api_key?: string }>;
  return {
    anonKey: keys.find((k) => k.name === "anon")?.api_key ?? null,
    serviceKey: keys.find((k) => k.name === "service_role")?.api_key ?? null,
  };
}

/** Run SQL against the project's database via the Management API — the MIGRATION GATE's
 * execute step (ladder step 5): called ONLY from the approval-resolution path, never by a
 * model tool directly. */
export async function runProjectQuery(
  mgmtToken: string,
  ref: string,
  query: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${MGMT_API}/v1/projects/${encodeURIComponent(ref)}/database/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${mgmtToken}`, "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 400)}` };
  return { ok: true };
}

/** Pick the best default project: the first ACTIVE_HEALTHY, else the first. */
export function preferredProject(projects: SupabaseProject[]): SupabaseProject | null {
  return projects.find((p) => p.status === "ACTIVE_HEALTHY") ?? projects[0] ?? null;
}
