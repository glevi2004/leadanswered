import { GhCliGit } from "./github.js";
import { OctokitGit } from "./octokit.js";
import type { Git } from "./types.js";

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
