import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CreateRepoOpts, Git, OpenPrOpts, PrRef, RepoRef } from "./types.js";

/**
 * v0 adapter for the `Git` port — shells out to the authenticated GitHub CLI (`gh`).
 *
 * Why the CLI (AGENTS-BACKEND §6 / ENGINEERING-AGENT §4): v0 = Lu-owned repos, and the machine
 * running `apps/api` already has `gh` authenticated with the `repo` scope, so this needs ZERO npm
 * dependency and no key management — the CLI carries the auth. `gh` also honours `GH_TOKEN` /
 * `GITHUB_TOKEN` from the environment, so a container can supply a token without a login step.
 *
 * All shell-outs go through `execFile` (NOT `exec`) with an argv array — no shell is spawned, so
 * repo names, PR titles, and bodies are passed verbatim with zero quoting/injection risk. Outputs
 * are parsed robustly: `gh repo create` / `gh pr create` do NOT support `--json` (they print a URL
 * to stdout), so we extract the URL with a regex and derive the rest; where `--json` exists we'd
 * prefer it.
 *
 * ────────────────────────────────────────────────────────────────────────────────────────────────
 * v1 (GitHub App / Octokit) — the drop-in replacement, sketched so it lands without caller changes:
 *
 *   import { App } from "octokit";                    // add "octokit" to apps/api/package.json
 *   const app = new App({ appId: process.env.GITHUB_APP_ID!, privateKey: process.env.GITHUB_APP_PRIVATE_KEY! });
 *   // installationToken(org): find the org's installation, mint a scoped, ~1h token, cache till expiry:
 *   //   const { data } = await app.octokit.request("GET /orgs/{org}/installation", { org });
 *   //   const token = (await app.getInstallationOctokit(data.id)).auth... → POST /app/installations/{id}/access_tokens
 *   // Then each method is a REST call on the installation Octokit:
 *   //   createRepoFromTemplate → POST /repos/{tmplOwner}/{tmpl}/generate  (repos.createUsingTemplate)
 *   //   openPR                 → POST /repos/{owner}/{repo}/pulls          (pulls.create)
 *   //   mergePR                → PUT  /repos/{owner}/{repo}/pulls/{n}/merge (pulls.merge, { merge_method: "squash" })
 *   //   getDiff                → GET  /repos/{owner}/{repo}/pulls/{n}  with mediaType.format = "diff"
 *   // Same interface, same return shapes — swap `getGit()`'s impl (or a GIT_PROVIDER switch) and done.
 * ────────────────────────────────────────────────────────────────────────────────────────────────
 */

const pExecFile = promisify(execFile);

/** The `gh` binary — overridable for tests / non-standard installs. */
const GH = process.env.GH_PATH ?? "gh";

/** Diffs can be large; lift execFile's 1 MB default so `getDiff` doesn't truncate. */
const MAX_BUFFER = 64 * 1024 * 1024;

/** Matches a GitHub repo/PR URL and captures `owner/name(/pull/123)?` from the path. */
const GITHUB_URL = /https?:\/\/[^\s"']*?github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/pull\/\d+)?)/;

/**
 * Run a `gh` subcommand, returning stdout. `execFile` rejects on a non-zero exit or a spawn
 * failure; we normalise both into a clear Error (and detect a missing binary explicitly). Args are
 * safe to include in the message — no secrets are ever passed as `gh` arguments.
 */
async function gh(args: string[]): Promise<string> {
  try {
    const { stdout } = await pExecFile(GH, args, { maxBuffer: MAX_BUFFER, encoding: "utf8" });
    return stdout;
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
    if (e.code === "ENOENT") {
      throw new Error(`\`${GH}\` (GitHub CLI) not found on PATH — install it or set GH_PATH.`);
    }
    const detail = (e.stderr || e.stdout || e.message || "").toString().trim();
    throw new Error(`gh ${args.join(" ")} failed: ${detail}`);
  }
}

/** Pull the first GitHub URL out of `gh`'s output (it prints a bare URL on success). */
function findGithubUrl(out: string): string | undefined {
  return out.match(GITHUB_URL)?.[0];
}

export class GhCliGit implements Git {
  async createRepoFromTemplate(opts: CreateRepoOpts): Promise<RepoRef> {
    const { name, template, private: isPrivate = true, org } = opts;
    const repoArg = org ? `${org}/${name}` : name;

    // Non-interactive create requires an explicit visibility flag. We clone inside the sandbox
    // (via the Sandbox port), so no `--clone` here.
    const args = ["repo", "create", repoArg, isPrivate ? "--private" : "--public"];
    if (template) args.push("--template", template);

    const out = await gh(args);
    const url = findGithubUrl(out);

    // Prefer the URL gh prints; fall back to constructing it when an explicit org was given.
    const htmlUrl = url?.replace(/\.git$/, "") ?? (org ? `https://github.com/${repoArg}` : undefined);
    if (!htmlUrl) {
      throw new Error(`could not determine the created repo URL from gh output: ${out.trim()}`);
    }
    const fullName = htmlUrl.match(GITHUB_URL)?.[1] ?? repoArg;

    return { fullName, cloneUrl: `${htmlUrl}.git`, htmlUrl };
  }

  async openPR(opts: OpenPrOpts): Promise<PrRef> {
    const { repo, head, base = "main", title, body } = opts;

    // `--body` is passed even when empty so gh never drops into an interactive editor.
    const args = [
      "pr", "create",
      "--repo", repo,
      "--head", head,
      "--base", base,
      "--title", title,
      "--body", body ?? "",
    ];

    const out = await gh(args);
    const url = findGithubUrl(out);
    const number = Number(url?.match(/\/pull\/(\d+)/)?.[1]);
    if (!url || !Number.isFinite(number)) {
      throw new Error(`could not parse the PR URL from gh output: ${out.trim()}`);
    }
    return { number, url };
  }

  async mergePR(repo: string, number: number): Promise<void> {
    // Squash-merge, fully non-interactive (number + strategy are supplied).
    await gh(["pr", "merge", "--repo", repo, String(number), "--squash"]);
  }

  async getDiff(repo: string, number: number): Promise<string> {
    // Prints the unified diff to stdout — returned verbatim for the `pr_diff` Artifact.
    return gh(["pr", "diff", "--repo", repo, String(number)]);
  }

  async installationToken(_org?: string): Promise<string> {
    // v0: the single authed CLI user's token covers all Lu-owned repos, so `org` is ignored.
    // v1: mint a GitHub-App installation token scoped to `_org`'s installation (see header sketch).
    const out = await gh(["auth", "token"]);
    const token = out.trim();
    if (!token) throw new Error("`gh auth token` returned empty — is `gh` logged in?");
    return token;
  }
}
