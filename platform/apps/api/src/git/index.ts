import { GhCliGit } from "./github.js";
import type { Git } from "./types.js";

export type { Git, CreateRepoOpts, RepoRef, OpenPrOpts, PrRef } from "./types.js";
export { GhCliGit } from "./github.js";

/**
 * The Git factory. v0 = `GhCliGit` (the authed `gh` CLI, zero-dependency — AGENTS-BACKEND §6).
 * The port keeps a GitHub-App / Octokit impl swappable behind a future `GIT_PROVIDER` switch
 * (see the v1 sketch in `github.ts`) with no caller changes.
 *
 * One shared instance — `gh` is stateless, so callers (the Engineering agent's tasks and the
 * worker) reuse it freely.
 */
let instance: Git | undefined;

export function getGit(): Git {
  if (!instance) instance = new GhCliGit();
  return instance;
}
