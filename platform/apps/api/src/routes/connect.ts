import type { Request, Response } from "express";
import { Octokit } from "@octokit/rest";
import type { Store } from "../store/types.js";
import { connectionStatus } from "../connect/status.js";
import { getInstallationAccount, githubAppConfigured, mintInstallationToken } from "../git/githubApp.js";

/**
 * BYO connect — token-paste MVP (docs/byo-connect.md). Each org connects its OWN
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
export function createConnectVercelRoute(deps: ConnectDeps) {
  return async function postConnectVercel(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    const token = b.token;
    const teamId = b.teamId ?? b.team_id;

    if (!isFilled(orgId) || !isFilled(token)) {
      res.status(400).json({ ok: false, error: "orgId and token are required" });
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
 * The company's ONE shared, Engineering-anchored managed project (docs/canvas.md §"the backend").
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
