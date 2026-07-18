import type { Request, Response } from "express";
import { Octokit } from "@octokit/rest";
import type { Store } from "../store/types.js";
import { connectionStatus } from "../connect/status.js";
import { getInstallationAccount, githubAppConfigured, mintInstallationToken } from "../git/githubApp.js";
import {
  exchangeCode,
  expiryFromNow,
  fetchServiceKey,
  listProjects,
  supabaseOAuthConfigured,
  validManagementToken,
} from "../connect/supabaseOAuth.js";

/**
 * BYO connect — token-paste MVP (docs/system.md §6). Each org connects its OWN
 * GitHub + Vercel by pasting a personal access token; we VERIFY it against the
 * provider, then store it ENCRYPTED (the store getters decrypt on read). The
 * Engineer later builds into THEIR accounts using these per-org tokens.
 *
 *   POST   /api/connect/github    { orgId, token }                              → verify GET /user (Octokit) → { ok, login }
 *   POST   /api/connect/vercel    { orgId, token, teamId? }                     → verify GET /v2/user       → { ok }
 *   POST   /api/connect/supabase  { orgId, projectRef, serviceKey, managementToken? } → verify project/mgmt → { ok }
 *   DELETE /api/connect/github    { orgId }                                     → { ok }
 *   DELETE /api/connect/vercel    { orgId }                                     → { ok }
 *   DELETE /api/connect/supabase  { orgId }                                     → { ok }
 *   GET    /api/connect/status?orgId=                                           → { github, vercel, supabase }
 *
 * OAuth (GitHub App install / Vercel Integration) is the phase-2 upgrade; the
 * store shape + the org-scoped ports are identical, so only these routes change.
 */

export interface ConnectDeps {
  store: Store;
}

/** True for a present, non-blank string field. */
function isFilled(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

const VERCEL_USER_URL = "https://api.vercel.com/v2/user";
const SUPABASE_MGMT_API = "https://api.supabase.com";

/** The project's own REST base (https://{ref}.supabase.co) — bare project ref → URL. */
function supabaseProjectUrl(projectRef: string): string {
  return `https://${projectRef.trim()}.supabase.co`;
}

/**
 * POST /api/connect/github  { orgId, token }
 * Verify the pasted token by calling GitHub `GET /user` with it (Octokit); on
 * success upsert the GithubConnection (userToken encrypted + login). → 200
 * { ok:true, login } | 400 { ok:false, error }.
 */
export function createConnectGithubRoute(deps: ConnectDeps) {
  return async function postConnectGithub(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    const token = b.token;
    const installationId = b.installationId ?? b.installation_id;

    // GITHUB APP PATH (byo-connect Phase 2): the install callback posts { installationId }.
    // Verify by minting an installation token (proves the App really is installed there),
    // resolve the install's account, and store — no PAT involved, ever.
    if (isFilled(orgId) && isFilled(installationId)) {
      if (!githubAppConfigured()) {
        res.status(400).json({ ok: false, error: "GitHub App is not configured on the server" });
        return;
      }
      try {
        await mintInstallationToken(String(installationId).trim());
        const account = await getInstallationAccount(String(installationId).trim());
        await deps.store.upsertGithubConnection(orgId, {
          installationId: String(installationId).trim(),
          login: account?.login,
        });
        res.status(200).json({ ok: true, login: account?.login ?? null, via: "github_app" });
      } catch (err) {
        console.warn("[/api/connect/github] installation verification failed:", (err as Error).message);
        res.status(400).json({ ok: false, error: "GitHub App installation could not be verified" });
      }
      return;
    }

    if (!isFilled(orgId) || !isFilled(token)) {
      res.status(400).json({ ok: false, error: "orgId and token (or installationId) are required" });
      return;
    }

    // 1) Verify the token identifies a real GitHub user.
    let login: string;
    try {
      const octokit = new Octokit({ auth: token.trim() });
      const { data } = await octokit.rest.users.getAuthenticated();
      login = data.login;
    } catch (err) {
      console.warn("[/api/connect/github] token verification failed:", (err as Error).message);
      res.status(400).json({ ok: false, error: "GitHub token is invalid or lacks access" });
      return;
    }

    // 2) Store it encrypted.
    try {
      await deps.store.upsertGithubConnection(orgId, { userToken: token.trim(), login });
      res.status(200).json({ ok: true, login });
    } catch (err) {
      console.error("[/api/connect/github] failed to store connection:", err);
      res.status(500).json({ ok: false, error: "failed to store the GitHub connection" });
    }
  };
}

/**
 * POST /api/connect/vercel  { orgId, token, teamId? }
 * Verify via Vercel `GET /v2/user` (team-scoped if teamId given); on success
 * upsert the VercelConnection (accessToken encrypted + teamId + vercelUserId).
 * → 200 { ok:true } | 400 { ok:false, error }.
 */
/** Vercel Integration OAuth (byo-connect Phase 2) — configured when both env vars are set. */
const vercelIntegrationConfigured = () =>
  isFilled(process.env.VERCEL_INTEGRATION_CLIENT_ID) && isFilled(process.env.VERCEL_INTEGRATION_CLIENT_SECRET);

export function createConnectVercelRoute(deps: ConnectDeps) {
  return async function postConnectVercel(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    let token = b.token;
    let teamId = b.teamId ?? b.team_id;
    const code = b.code;

    // INTEGRATION PATH (byo-connect Phase 2): the install callback posts { code, teamId? } —
    // exchange it for an integration-scoped access token, then fall through to the shared
    // verify + store below. The token lives until the owner removes the integration.
    if (isFilled(orgId) && isFilled(code)) {
      if (!vercelIntegrationConfigured()) {
        res.status(400).json({ ok: false, error: "Vercel Integration is not configured on the server" });
        return;
      }
      try {
        const resp = await fetch("https://api.vercel.com/v2/oauth/access_token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.VERCEL_INTEGRATION_CLIENT_ID!.trim(),
            client_secret: process.env.VERCEL_INTEGRATION_CLIENT_SECRET!.trim(),
            code: String(code).trim(),
            redirect_uri:
              process.env.VERCEL_INTEGRATION_REDIRECT_URI?.trim() ||
              "https://app.lu.computer/api/connect/vercel/callback",
          }),
        });
        const data = (await resp.json().catch(() => ({}))) as {
          access_token?: string;
          team_id?: string | null;
          error?: string;
        };
        if (!resp.ok || !isFilled(data.access_token)) {
          console.warn(`[/api/connect/vercel] code exchange failed (HTTP ${resp.status}):`, data.error);
          res.status(400).json({ ok: false, error: "Vercel install could not be verified" });
          return;
        }
        token = data.access_token;
        teamId = isFilled(teamId) ? teamId : (data.team_id ?? undefined);
      } catch (err) {
        console.warn("[/api/connect/vercel] code exchange error:", (err as Error).message);
        res.status(400).json({ ok: false, error: "Vercel install could not be verified" });
        return;
      }
    }

    if (!isFilled(orgId) || !isFilled(token)) {
      res.status(400).json({ ok: false, error: "orgId and token (or code) are required" });
      return;
    }

    // 1) Verify the token against the Vercel API.
    let vercelUserId: string | undefined;
    try {
      const url = new URL(VERCEL_USER_URL);
      if (isFilled(teamId)) url.searchParams.set("teamId", teamId.trim());
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token.trim()}` } });
      if (!resp.ok) {
        console.warn(`[/api/connect/vercel] token verification failed (HTTP ${resp.status})`);
        res.status(400).json({ ok: false, error: "Vercel token is invalid or lacks access" });
        return;
      }
      const data = (await resp.json()) as { user?: { id?: string }; id?: string };
      vercelUserId = data.user?.id ?? data.id;
    } catch (err) {
      console.warn("[/api/connect/vercel] token verification error:", (err as Error).message);
      res.status(400).json({ ok: false, error: "could not verify the Vercel token" });
      return;
    }

    // 2) Store it encrypted.
    try {
      await deps.store.upsertVercelConnection(orgId, {
        accessToken: token.trim(),
        teamId: isFilled(teamId) ? teamId.trim() : undefined,
        vercelUserId,
      });
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[/api/connect/vercel] failed to store connection:", err);
      res.status(500).json({ ok: false, error: "failed to store the Vercel connection" });
    }
  };
}

/**
 * POST /api/connect/supabase  { orgId, projectRef, serviceKey, managementToken? }
 * The company's ONE shared, Engineering-anchored managed project (docs/product.md §4 §"the backend").
 * Verify the creds with a lightweight call, then upsert the SupabaseConnection (serviceKey +
 * managementToken encrypted at rest). Verification prefers the Management API (GET /v1/projects/{ref})
 * when a management token is supplied; otherwise it checks the service key against the project's
 * auth-admin endpoint. → 200 { ok:true } | 400 { ok:false, error }.
 */
export function createConnectSupabaseRoute(deps: ConnectDeps) {
  return async function postConnectSupabase(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    const projectRef = b.projectRef ?? b.project_ref;
    const serviceKey = b.serviceKey ?? b.service_key;
    const managementToken = b.managementToken ?? b.management_token ?? b.accessToken ?? b.access_token;
    const code = b.code;

    // OAUTH PATH (byo-connect Phase 2): the install callback posts { code }. Exchange it for a
    // management + refresh token, store them, list projects, and auto-select if there is exactly
    // one (fetch its service key). Multiple/zero → store the token and return the list for a picker.
    if (isFilled(orgId) && isFilled(code)) {
      if (!supabaseOAuthConfigured()) {
        res.status(400).json({ ok: false, error: "Supabase OAuth is not configured on the server" });
        return;
      }
      try {
        const t = await exchangeCode(String(code).trim());
        // Store the OAuth tokens first (projectRef "" placeholder until one is chosen).
        await deps.store.upsertSupabaseConnection(orgId, {
          projectRef: "",
          managementToken: t.access_token,
          refreshToken: t.refresh_token,
          expiresAt: expiryFromNow(t.expires_in),
        });
        const projects = await listProjects(t.access_token);
        if (projects.length === 1) {
          const key = await fetchServiceKey(t.access_token, projects[0].ref);
          await deps.store.upsertSupabaseConnection(orgId, {
            projectRef: projects[0].ref,
            ...(key ? { serviceKey: key } : {}),
          });
          res.status(200).json({ ok: true, connected: true, project: projects[0] });
          return;
        }
        res.status(200).json({ ok: true, connected: false, needsProject: true, projects });
      } catch (err) {
        console.warn("[/api/connect/supabase] OAuth exchange failed:", (err as Error).message);
        res.status(400).json({ ok: false, error: "Supabase authorization could not be completed" });
      }
      return;
    }

    // SELECT-PROJECT PATH: the org is already OAuth-connected (mgmt token stored) and the owner
    // picked a project — fetch its service key with the (refreshed) mgmt token and store both.
    if (isFilled(orgId) && isFilled(projectRef) && !isFilled(serviceKey)) {
      const mgmt = await validManagementToken(deps.store, orgId);
      if (mgmt) {
        try {
          const key = await fetchServiceKey(mgmt, projectRef.trim());
          await deps.store.upsertSupabaseConnection(orgId, {
            projectRef: projectRef.trim(),
            ...(key ? { serviceKey: key } : {}),
          });
          res.status(200).json({ ok: true, connected: Boolean(key), project: { ref: projectRef.trim() } });
        } catch (err) {
          console.warn("[/api/connect/supabase] select-project failed:", (err as Error).message);
          res.status(400).json({ ok: false, error: "could not read that project's keys" });
        }
        return;
      }
      // No mgmt token → fall through to the paste requirement below.
    }

    if (!isFilled(orgId) || !isFilled(projectRef) || !isFilled(serviceKey)) {
      res.status(400).json({ ok: false, error: "orgId, projectRef and serviceKey are required" });
      return;
    }

    // 1) Verify. Prefer the Management API (project-level) if a management token is present;
    //    else validate the service key against the project's own auth-admin API.
    try {
      if (isFilled(managementToken)) {
        const url = `${SUPABASE_MGMT_API}/v1/projects/${encodeURIComponent(projectRef.trim())}`;
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${managementToken.trim()}` },
        });
        if (!resp.ok) {
          console.warn(`[/api/connect/supabase] mgmt verification failed (HTTP ${resp.status})`);
          res.status(400).json({ ok: false, error: "Supabase management token or project ref is invalid" });
          return;
        }
      } else {
        const url = `${supabaseProjectUrl(projectRef)}/auth/v1/admin/users?page=1&per_page=1`;
        const resp = await fetch(url, {
          headers: { apikey: serviceKey.trim(), Authorization: `Bearer ${serviceKey.trim()}` },
        });
        if (!resp.ok) {
          console.warn(`[/api/connect/supabase] service-key verification failed (HTTP ${resp.status})`);
          res.status(400).json({ ok: false, error: "Supabase service key or project ref is invalid" });
          return;
        }
      }
    } catch (err) {
      console.warn("[/api/connect/supabase] verification error:", (err as Error).message);
      res.status(400).json({ ok: false, error: "could not verify the Supabase connection" });
      return;
    }

    // 2) Store it encrypted.
    try {
      await deps.store.upsertSupabaseConnection(orgId, {
        projectRef: projectRef.trim(),
        serviceKey: serviceKey.trim(),
        managementToken: isFilled(managementToken) ? managementToken.trim() : undefined,
      });
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[/api/connect/supabase] failed to store connection:", err);
      res.status(500).json({ ok: false, error: "failed to store the Supabase connection" });
    }
  };
}

/** DELETE /api/connect/github  { orgId } → { ok:true }. Idempotent. */
export function createDisconnectGithubRoute(deps: ConnectDeps) {
  return async function deleteConnectGithub(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    if (!isFilled(orgId)) {
      res.status(400).json({ ok: false, error: "orgId is required" });
      return;
    }
    try {
      await deps.store.deleteGithubConnection(orgId);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[/api/connect/github] failed to delete connection:", err);
      res.status(500).json({ ok: false, error: "failed to remove the GitHub connection" });
    }
  };
}

/** DELETE /api/connect/vercel  { orgId } → { ok:true }. Idempotent. */
export function createDisconnectVercelRoute(deps: ConnectDeps) {
  return async function deleteConnectVercel(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    if (!isFilled(orgId)) {
      res.status(400).json({ ok: false, error: "orgId is required" });
      return;
    }
    try {
      await deps.store.deleteVercelConnection(orgId);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[/api/connect/vercel] failed to delete connection:", err);
      res.status(500).json({ ok: false, error: "failed to remove the Vercel connection" });
    }
  };
}

/** DELETE /api/connect/supabase  { orgId } → { ok:true }. Idempotent. */
export function createDisconnectSupabaseRoute(deps: ConnectDeps) {
  return async function deleteConnectSupabase(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    if (!isFilled(orgId)) {
      res.status(400).json({ ok: false, error: "orgId is required" });
      return;
    }
    try {
      await deps.store.deleteSupabaseConnection(orgId);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[/api/connect/supabase] failed to delete connection:", err);
      res.status(500).json({ ok: false, error: "failed to remove the Supabase connection" });
    }
  };
}

/** GET /api/connect/status?orgId= → { github:boolean, vercel:boolean, supabase:boolean }. */
/** GET /api/connect/supabase/projects?orgId=  → { projects } for the OAuth project picker. */
export function createSupabaseProjectsRoute(deps: ConnectDeps) {
  return async function getSupabaseProjects(req: Request, res: Response): Promise<void> {
    const orgId = req.query.orgId ?? req.query.org_id;
    if (!isFilled(orgId)) {
      res.status(400).json({ error: "orgId is required" });
      return;
    }
    try {
      const mgmt = await validManagementToken(deps.store, orgId);
      if (!mgmt) {
        res.status(200).json({ projects: [] });
        return;
      }
      res.status(200).json({ projects: await listProjects(mgmt) });
    } catch (err) {
      console.error("[/api/connect/supabase/projects] error:", err);
      res.status(200).json({ projects: [] });
    }
  };
}

export function createConnectStatusRoute(deps: ConnectDeps) {
  return async function getConnectStatus(req: Request, res: Response): Promise<void> {
    const orgId = req.query.orgId ?? req.query.org_id;
    if (!isFilled(orgId)) {
      res.status(400).json({ error: "orgId is required" });
      return;
    }
    try {
      const status = await connectionStatus(deps.store, orgId);
      res.status(200).json(status);
    } catch (err) {
      console.error("[/api/connect/status] error:", err);
      res.status(500).json({ error: "failed to read connection status" });
    }
  };
}
