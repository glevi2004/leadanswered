/**
 * The Git PORT (Ports & Adapters) — the source-control seam the Engineering agent drives to
 * stand up a site repo, branch it, open a PR, review the diff, and merge it. The agent + the
 * worker only ever talk to this interface, never a provider, so the v0 adapter (the authed `gh`
 * CLI, zero-dependency) can be swapped for a v1 GitHub-App / Octokit adapter with ZERO caller
 * changes — the same shape that lets `installationToken()` return a real App token later.
 *
 * Spec: AGENTS-BACKEND.md §6 (the Engineering agent — v0 Lu-owned repos → repo from template →
 * branch → PR → merge; v1 = connect the user's GitHub App), ENGINEERING-AGENT.md §1/§4/§6.
 */

/** Options for creating a repo from a starter template (v0: in a Lu-owned org). */
export interface CreateRepoOpts {
  /** The new repo's name (the `name` part of `owner/name`). */
  name: string;
  /** Template repo to seed from, as `owner/template`. Omit for an empty repo. */
  template?: string;
  /** Private repo? Defaults to `true` (v0 Lu-owned site repos are private until published). */
  private?: boolean;
  /** Owning org/user (`owner` in `owner/name`). Omit → the authenticated account (v0: Lu's). */
  org?: string;
}

/** A reference to a repo — everything a caller needs to clone it into a sandbox and link it. */
export interface RepoRef {
  /** `owner/name`. */
  fullName: string;
  /** HTTPS clone URL (`https://github.com/owner/name.git`) — what the Sandbox port clones. */
  cloneUrl: string;
  /** Browser URL (`https://github.com/owner/name`). */
  htmlUrl: string;
}

/** Options for opening a pull request from `head` into `base`. */
export interface OpenPrOpts {
  /** Target repo as `owner/name`. */
  repo: string;
  /** Head branch (the branch with the changes). Must already be pushed. */
  head: string;
  /** Base branch to merge into. Defaults to the repo's default branch (`main`). */
  base?: string;
  /** PR title. */
  title: string;
  /** PR body (markdown). */
  body?: string;
}

/** A reference to an opened pull request. */
export interface PrRef {
  /** The PR number (used to merge/diff it later). */
  number: number;
  /** The PR's browser URL. */
  url: string;
}

/**
 * Provider-agnostic Git port.
 *
 * - v0 adapter: `GhCliGit` — shells out to the authenticated `gh` CLI (no npm dependency).
 * - v1 adapter (drop-in): a GitHub-App / Octokit impl — `installationToken(org)` mints a scoped
 *   installation token and the same five methods hit the REST API instead of `gh`.
 */
export interface Git {
  /** Create a repo from a template (or empty). Returns its full name + clone/browser URLs. */
  createRepoFromTemplate(opts: CreateRepoOpts): Promise<RepoRef>;
  /** Open a PR from `head` → `base`. Returns the PR number + URL. */
  openPR(opts: OpenPrOpts): Promise<PrRef>;
  /** Merge a PR (squash). Resolves on success; throws if the merge is rejected. */
  mergePR(repo: string, number: number): Promise<void>;
  /** Get a PR's unified diff (for the `pr_diff` Artifact). */
  getDiff(repo: string, number: number): Promise<string>;
  /**
   * A token that authorizes clone/push for the given org's repos.
   * - v0 → `gh auth token` (the one authed CLI user; `org` is ignored).
   * - v1 → a GitHub-App installation token scoped to that org's installation.
   */
  installationToken(org?: string): Promise<string>;
  /**
   * THE SANDBOX'S token (DEVELOPMENT ladder step 1): the least-privileged credential that can
   * clone/push ONE repo. App-mode mints a per-task token — this repo only, `contents: write`
   * only, 1 hour — so a hijacked sandbox can't touch `main`-protection, other repos, or admin.
   * PAT/CLI modes can't downscope and return their full token (one more reason installs > paste).
   */
  sandboxToken(repoFullName: string): Promise<string>;
}
