import { GhCliGit } from "./github.js";
import { OctokitGit } from "./octokit.js";
import { githubAppConfigured, mintInstallationToken } from "./githubApp.js";
import type { Git } from "./types.js";
import type { Store } from "../store/types.js";

export type { Git, CreateRepoOpts, RepoRef, OpenPrOpts, PrRef } from "./types.js";
export { GhCliGit } from "./github.js";
export { OctokitGit } from "./octokit.js";

/**
 * The Git factory.
 *
 * - PROD (Railway / any container): `OctokitGit` — the GitHub REST API via Octokit, authed with a
 *   Personal Access Token. Selected whenever `process.env.GITHUB_TOKEN` is set. This is the path
 *   that works in prod, where the `gh` CLI is NOT installed/authed.
 * - LOCAL DEV: `GhCliGit` — the authed `gh` CLI (zero-dependency — AGENTS-BACKEND §6). The fallback
 *   when no `GITHUB_TOKEN` is present, so a developer's `gh login` keeps working unchanged.
 *
 * Both implement the same `Git` port, so callers (the Engineering agent's tasks and the worker)
 * are identical either way. One shared instance — both adapters are stateless.
 *
 * Env:
 *   - `GITHUB_TOKEN`  (required in prod) — the PAT; its presence flips this factory to `OctokitGit`.
 *   - `GITHUB_OWNER`  (optional)         — org/user that owns NEW repos; defaults to the token's own
 *                                          login (`GET /user`) when unset. See `octokit.ts`.
 */
let instance: Git | undefined;

export function getGit(): Git {
  if (!instance) {
    instance = process.env.GITHUB_TOKEN ? new OctokitGit() : new GhCliGit();
  }
  return instance;
}

/**
 * Org-scoped Git (BYO connect — docs/byo-connect.md). When `orgId` is given AND the
 * org has a stored GitHub connection with a usable token, return an `OctokitGit`
 * bound to THAT token, so the Engineer builds into the org's OWN GitHub. Otherwise
 * fall back to the env-based `getGit()` (the platform's dogfood path — unchanged).
 */
export async function getGitForOrg(store: Store, orgId?: string): Promise<Git> {
  if (orgId) {
    const conn = await store.getGithubConnection(orgId);
    // BEST: the GitHub App install (byo-connect Phase 2) — mint a 1-hour, repo-scoped
    // installation token per run. `defaultOwner` = the install's account (installation
    // tokens can't `GET /user`), so new repos land exactly where the owner installed.
    if (conn?.installationId && githubAppConfigured()) {
      try {
        const token = await mintInstallationToken(conn.installationId);
        return new OctokitGit(token, { ignoreEnvOwner: true, defaultOwner: conn.login ?? undefined });
      } catch (err) {
        console.error(`[git] installation-token mint failed for org ${orgId} (falling back):`, err);
      }
    }
    // FALLBACK: the pasted PAT. `ignoreEnvOwner` so the customer's repos land in the
    // CUSTOMER's own account — GITHUB_OWNER only ever applies to the dogfood token below.
    if (conn?.userToken) return new OctokitGit(conn.userToken, { ignoreEnvOwner: true });
  }
  return getGit();
}
