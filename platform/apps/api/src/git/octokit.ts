import { Octokit } from "@octokit/rest";
import type { CreateRepoOpts, Git, OpenPrOpts, PrRef, RepoRef } from "./types.js";

/**
 * v1 adapter for the `Git` port — the GitHub REST API via Octokit, authed with a Personal Access
 * Token (`GITHUB_TOKEN`). No binary, no login step: works anywhere `process.env.GITHUB_TOKEN` is
 * set (Railway / any container), which the `gh`-CLI adapter (`GhCliGit`) cannot do in prod because
 * the CLI is not installed/authed there.
 *
 * This is the drop-in the port was designed for (see the v1 sketch in `github.ts`): SAME five
 * methods, SAME return shapes, so `engineeringTools.ts` is unchanged. `getGit()` (in `index.ts`)
 * selects this adapter whenever `GITHUB_TOKEN` is present, else falls back to `GhCliGit` for local
 * dev.
 *
 * ── Auth / scopes ─────────────────────────────────────────────────────────────────────────────
 *   The PAT needs the `repo` scope (classic) — or, for a fine-grained token, Contents +
 *   Administration + Pull requests read/write on the target owner. `installationToken()` returns
 *   this same PAT so the Sandbox port clones via `https://x-access-token:{token}@github.com/...`.
 *
 * ── Owner resolution (who owns a NEW repo) ────────────────────────────────────────────────────
 *   1. `opts.org` when a caller passes one explicitly (`owner` in `owner/name`);
 *   2. else `process.env.GITHUB_OWNER` (set this to the Lu-owned org on Railway);
 *   3. else the authenticated account from `GET /user` (the PAT's own login), cached per instance.
 *   For repos passed as `owner/name` (openPR / mergePR / getDiff), the owner is taken verbatim from
 *   the string — no resolution needed.
 */

/** Split an `owner/name` (repo or template) into its two parts; throws if malformed. */
function splitRepo(full: string): { owner: string; repo: string } {
  const [owner, repo] = full.split("/");
  if (!owner || !repo) {
    throw new Error(`expected a "owner/name" repository ref, got: ${JSON.stringify(full)}`);
  }
  return { owner, repo };
}

/** Normalise an Octokit error into a clear, single-line Error (keeps the HTTP status + message). */
function wrap(context: string, err: unknown): Error {
  const e = err as { status?: number; message?: string };
  const status = e?.status ? ` (HTTP ${e.status})` : "";
  const detail = (e?.message ?? String(err)).trim();
  return new Error(`${context}${status}: ${detail}`);
}

export class OctokitGit implements Git {
  private readonly octokit: Octokit;
  /** The PAT — returned verbatim by `installationToken()` for clone/push auth. */
  private readonly token: string;
  /** BYO mode: never consult GITHUB_OWNER — new repos belong to the token's own account. */
  private readonly ignoreEnvOwner: boolean;
  /** App-install mode: the installation's account owns new repos (installation tokens can't `GET /user`). */
  private readonly defaultOwner: string | undefined;
  /** Memoised authenticated login (`GET /user`) — only fetched when no owner is otherwise given. */
  private authLogin: string | undefined;

  constructor(
    token: string = process.env.GITHUB_TOKEN ?? "",
    opts?: { ignoreEnvOwner?: boolean; defaultOwner?: string },
  ) {
    if (!token) {
      throw new Error("GITHUB_TOKEN is not set — cannot use the Octokit Git adapter.");
    }
    this.token = token;
    this.ignoreEnvOwner = opts?.ignoreEnvOwner ?? false;
    this.defaultOwner = opts?.defaultOwner;
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Resolve the owner for a NEW repo: explicit `org` → `GITHUB_OWNER` (platform/dogfood mode
   * only — a BYO org-token adapter sets `ignoreEnvOwner` so the CUSTOMER's repos land in the
   * customer's own account, never the platform org) → the token's own login (`GET /user`,
   * memoised). Only the last branch makes a network call, and only once.
   */
  private async resolveOwner(org?: string): Promise<string> {
    if (org) return org;
    if (this.defaultOwner) return this.defaultOwner;
    if (!this.ignoreEnvOwner && process.env.GITHUB_OWNER) return process.env.GITHUB_OWNER;
    if (!this.authLogin) {
      try {
        const { data } = await this.octokit.rest.users.getAuthenticated();
        this.authLogin = data.login;
      } catch (err) {
        throw wrap("failed to resolve the authenticated GitHub user (GET /user)", err);
      }
    }
    return this.authLogin;
  }

  async createRepoFromTemplate(opts: CreateRepoOpts): Promise<RepoRef> {
    const { name, template, private: isPrivate = true, org } = opts;
    const owner = await this.resolveOwner(org);

    try {
      // WITH a template → POST /repos/{template_owner}/{template_repo}/generate (repos.createUsingTemplate).
      if (template) {
        const { owner: template_owner, repo: template_repo } = splitRepo(template);
        const { data } = await this.octokit.rest.repos.createUsingTemplate({
          template_owner,
          template_repo,
          owner,
          name,
          private: isPrivate,
        });
        // Ladder step 1: protect main (block force-pushes + deletion; NO required reviews, so the
        // human-gated squash-merge still works). Best-effort — template content lands async and
        // some plans 403 protection on private repos; a miss never fails repo creation.
        void this.protectMain(owner, data.name);
        return { fullName: data.full_name, cloneUrl: data.clone_url, htmlUrl: data.html_url };
      }

      // NO template → an empty repo. Try org creation first (POST /orgs/{org}/repos); if the owner
      // is actually the authenticated USER (not an org), GitHub 404s that route, so fall back to
      // POST /user/repos (repos.createForAuthenticatedUser).
      const isAuthedUser = !org && (this.ignoreEnvOwner || !process.env.GITHUB_OWNER);
      if (isAuthedUser) {
        const { data } = await this.octokit.rest.repos.createForAuthenticatedUser({
          name,
          private: isPrivate,
        });
        return { fullName: data.full_name, cloneUrl: data.clone_url, htmlUrl: data.html_url };
      }
      try {
        const { data } = await this.octokit.rest.repos.createInOrg({
          org: owner,
          name,
          private: isPrivate,
        });
        return { fullName: data.full_name, cloneUrl: data.clone_url, htmlUrl: data.html_url };
      } catch (err) {
        // Owner turned out to be a user account, not an org — create under the authed user instead.
        if ((err as { status?: number }).status === 404) {
          const { data } = await this.octokit.rest.repos.createForAuthenticatedUser({
            name,
            private: isPrivate,
          });
          return { fullName: data.full_name, cloneUrl: data.clone_url, htmlUrl: data.html_url };
        }
        throw err;
      }
    } catch (err) {
      throw wrap(`failed to create repo ${owner}/${name}`, err);
    }
  }

  async openPR(opts: OpenPrOpts): Promise<PrRef> {
    const { repo: repoFull, head, base = "main", title, body } = opts;
    const { owner, repo } = splitRepo(repoFull);
    try {
      const { data } = await this.octokit.rest.pulls.create({
        owner,
        repo,
        head,
        base,
        title,
        body: body ?? "",
      });
      return { number: data.number, url: data.html_url };
    } catch (err) {
      throw wrap(`failed to open PR on ${repoFull} (${head} → ${base})`, err);
    }
  }

  async mergePR(repoFull: string, number: number): Promise<void> {
    const { owner, repo } = splitRepo(repoFull);
    try {
      await this.octokit.rest.pulls.merge({
        owner,
        repo,
        pull_number: number,
        merge_method: "squash",
      });
    } catch (err) {
      throw wrap(`failed to merge PR #${number} on ${repoFull}`, err);
    }
  }

  async getDiff(repoFull: string, number: number): Promise<string> {
    const { owner, repo } = splitRepo(repoFull);
    try {
      // Same endpoint as pulls.get, but the `diff` media type makes GitHub return the unified diff
      // as a text body; the typed `data` is the PR object, so cast through `unknown` to string.
      const res = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: number,
        mediaType: { format: "diff" },
      });
      return res.data as unknown as string;
    } catch (err) {
      throw wrap(`failed to fetch the diff for PR #${number} on ${repoFull}`, err);
    }
  }

  async installationToken(_org?: string): Promise<string> {
    // The PAT authorises clone/push for every repo it can see, so `org` is ignored (as in the v0
    // adapter). The Sandbox port injects this as `GITHUB_TOKEN` and clones via `x-access-token:`.
    return this.token;
  }

  /** Minimal main-branch protection: no force-push, no deletion, PRs still auto-mergeable. */
  private async protectMain(owner: string, repo: string): Promise<void> {
    // The template's content lands asynchronously — give main a moment to exist first.
    await new Promise((r) => setTimeout(r, 5_000));
    try {
      await this.octokit.rest.repos.updateBranchProtection({
        owner,
        repo,
        branch: "main",
        required_status_checks: null,
        enforce_admins: false,
        required_pull_request_reviews: null,
        restrictions: null,
        allow_force_pushes: false,
        allow_deletions: false,
      });
    } catch (err) {
      console.warn(`[git] branch protection skipped for ${owner}/${repo}:`, (err as Error).message);
    }
  }

  async sandboxToken(repoFullName: string): Promise<string> {
    // App-mode (set via `sandboxTokenMinter` in getGitForOrg) mints a one-repo, contents-write,
    // 1-hour token. PAT/env mode can't downscope — full token, documented limitation.
    if (this.sandboxTokenMinter) {
      try {
        return await this.sandboxTokenMinter(repoFullName);
      } catch (err) {
        console.error(`[git] scoped sandbox-token mint failed for ${repoFullName} (falling back):`, err);
      }
    }
    return this.token;
  }

  /** Injected by getGitForOrg in App-install mode — mints the downscoped per-repo token. */
  sandboxTokenMinter?: (repoFullName: string) => Promise<string>;
}
