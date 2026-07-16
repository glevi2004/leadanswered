import type { Request, Response } from "express";
import { Octokit } from "@octokit/rest";
import type { Store } from "../store/types.js";
import { connectionStatus } from "../connect/status.js";

/**
 * BYO connect — token-paste MVP (docs/byo-connect.md). Each org connects its OWN
 * GitHub + Vercel by pasting a personal access token; we VERIFY it against the
 * provider, then store it ENCRYPTED (the store getters decrypt on read). The
 * Engineer later builds into THEIR accounts using these per-org tokens.
 *
 *   POST   /api/connect/github  { orgId, token }          → verify GET /user (Octokit) → { ok, login }
 *   POST   /api/connect/vercel  { orgId, token, teamId? } → verify GET /v2/user       → { ok }
 *   DELETE /api/connect/github  { orgId }                 → { ok }
 *   DELETE /api/connect/vercel  { orgId }                 → { ok }
 *   GET    /api/connect/status?orgId=                     → { github, vercel }
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

    if (!isFilled(orgId) || !isFilled(token)) {
      res.status(400).json({ ok: false, error: "orgId and token are required" });
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

/** GET /api/connect/status?orgId= → { github:boolean, vercel:boolean }. */
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
