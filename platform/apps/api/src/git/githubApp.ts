import { createSign } from "node:crypto";

/**
 * GitHub App auth (docs/system.md �6 Phase 2 — "connect through THEIR apps"): the server
 * authenticates AS the "Lu Computer" App (an RS256 JWT from GITHUB_APP_PRIVATE_KEY) and mints
 * **installation access tokens** — 1-hour, scoped to the repos the owner chose at install.
 * This is what `installationToken()` was always named for: sandboxes stop receiving a
 * forever-PAT (harness-spec §3 secrets P1).
 *
 * Env: GITHUB_APP_ID (the numeric App ID) · GITHUB_APP_PRIVATE_KEY (the .pem, literal or
 * \n-escaped) · GITHUB_APP_SLUG (install URL, used by the web). App-mode is OFF until the
 * first two are set — token-paste keeps working unchanged.
 */

const GITHUB_API = "https://api.github.com";

const appId = () => (process.env.GITHUB_APP_ID ?? "").trim();
const privateKey = () => (process.env.GITHUB_APP_PRIVATE_KEY ?? "").replace(/\\n/g, "\n").trim();

export function githubAppConfigured(): boolean {
  return Boolean(appId() && privateKey());
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** A short-lived App JWT (iss = App ID; ±10 min window per GitHub's rules). */
function appJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId() }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  return `${header}.${payload}.${b64url(signer.sign(privateKey()))}`;
}

const HEADERS = () => ({
  authorization: `Bearer ${appJwt()}`,
  accept: "application/vnd.github+json",
  "user-agent": "lu-computer",
});

/** Per-installation+scope token cache — reminted when within 5 min of expiry. */
const tokenCache = new Map<string, { token: string; expiresAtMs: number }>();

export interface MintScope {
  /** Repo NAMES (no owner) to scope the token to — GitHub's `repositories` param. */
  repositories?: string[];
  /** Permission downscope, e.g. { contents: "write" } — GitHub's `permissions` param. */
  permissions?: Record<string, string>;
}

/**
 * Mint an installation access token, optionally DOWNSCOPED (harness-spec §3 / DEVELOPMENT
 * ladder step 1): pass `{ repositories: ["repo"], permissions: { contents: "write" } }` to get
 * a 1-hour token that can touch ONE repo's contents and nothing else — what sandboxes get.
 * Unscoped mints (server-side repo creation, gated merges) carry the App's full permissions.
 */
export async function mintInstallationToken(installationId: string, scope?: MintScope): Promise<string> {
  const cacheKey = `${installationId}:${JSON.stringify(scope ?? {})}`;
  const hit = tokenCache.get(cacheKey);
  if (hit && hit.expiresAtMs - Date.now() > 5 * 60_000) return hit.token;
  const res = await fetch(`${GITHUB_API}/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: { ...HEADERS(), "content-type": "application/json" },
    body: scope ? JSON.stringify(scope) : undefined,
  });
  if (!res.ok) {
    throw new Error(`GitHub App installation-token mint failed (HTTP ${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { token: string; expires_at: string };
  tokenCache.set(cacheKey, { token: data.token, expiresAtMs: new Date(data.expires_at).getTime() });
  return data.token;
}

/** The account (user/org) an installation lives on — stored as the connection's login. */
export async function getInstallationAccount(
  installationId: string,
): Promise<{ login: string; type: string } | null> {
  const res = await fetch(`${GITHUB_API}/app/installations/${installationId}`, { headers: HEADERS() });
  if (!res.ok) return null;
  const d = (await res.json()) as { account?: { login?: string; type?: string } };
  return d.account?.login ? { login: d.account.login, type: d.account.type ?? "User" } : null;
}
