import type { CreateProjectOpts, Deploy, PreviewDeployment } from "./types.js";

/**
 * Vercel adapter for the `Deploy` port (AGENTS-BACKEND §11 — Vercel is the LOCKED host).
 *
 * Talks to the Vercel REST API (https://api.vercel.com) with GLOBAL `fetch` (no SDK / no new
 * dependency). Auth = `Authorization: Bearer ${VERCEL_TOKEN}`; every request is team-scoped by
 * appending `?teamId=${VERCEL_TEAM_ID}` (the "grantware" team). Both env vars are read at call
 * time so dotenv (env.ts) has loaded them by boot, and so a missing token fails loudly rather
 * than silently hitting the personal scope.
 *
 * Endpoints used (verify against a live run — see the module notes returned with this port):
 *   - create project     POST /v11/projects            { name, gitRepository:{type,repo} }
 *   - find PR preview     GET  /v6/deployments          ?projectId&meta-githubPrId&limit
 *   - read project        GET  /v9/projects/{id}        (to resolve name + linked repo for promote)
 *   - promote to prod     POST /v13/deployments         { name, project, target, gitSource }
 *   - add domain          POST /v10/projects/{id}/domains  { name }
 */

const VERCEL_API = "https://api.vercel.com";

/** The subset of the global `RequestInit` we ever send — keeps header/body typing simple. */
interface VfetchInit {
  method?: string;
  /** Pre-stringified JSON body. Presence flips on the JSON `Content-Type`. */
  body?: string;
  headers?: Record<string, string>;
}

// ── Minimal shapes of the Vercel responses we read (internal — not part of the port) ──────────

interface VercelProjectLink {
  type?: string;
  repo?: string;
  repoId?: number;
  org?: string;
}
interface VercelProject {
  id: string;
  name: string;
  /** Git connection for the project — present once a repo is linked. */
  link?: VercelProjectLink;
}
interface VercelDeployment {
  uid: string;
  /** Bare host, no scheme (e.g. "my-site-abc123.vercel.app"). */
  url: string;
  /** State on the list endpoint (v6). */
  state?: string;
  /** State on the single-deployment / create endpoints. */
  readyState?: string;
  created?: number;
  target?: string | null;
  /** Git-integration metadata; `githubPrId` = the PR number (as a string). */
  meta?: Record<string, string>;
}
interface DeploymentsList {
  deployments?: VercelDeployment[];
}
interface CreatedDeployment {
  id: string;
  url: string;
  readyState?: string;
  alias?: string[];
}
interface VercelErrorBody {
  error?: { code?: string; message?: string };
}

/** Prefix a bare Vercel host with https:// (deployment `url`s come back without a scheme). */
function toUrl(host: string): string {
  return /^https?:\/\//.test(host) ? host : `https://${host}`;
}

export class VercelDeploy implements Deploy {
  /**
   * Per-org token + team scope (BYO connect). When set, they OVERRIDE the env
   * (`VERCEL_TOKEN` / `VERCEL_TEAM_ID`) so a build deploys into the ORG's own
   * Vercel account. Left undefined for the env-based dogfood instance (getDeploy()),
   * which keeps reading env at call time — unchanged behavior.
   */
  private readonly token?: string;
  private readonly teamId?: string;

  constructor(opts: { token?: string; teamId?: string } = {}) {
    this.token = opts.token;
    this.teamId = opts.teamId;
  }

  /**
   * Base fetch wrapper: prepends the API host, attaches the Bearer token, appends the team
   * scope, sets JSON `Content-Type` on writes, and turns any non-2xx response into a thrown
   * Error carrying Vercel's own error message.
   */
  private async vfetch<T>(path: string, init: VfetchInit = {}): Promise<T> {
    const token = this.token ?? process.env.VERCEL_TOKEN;
    if (!token) {
      throw new Error("VERCEL_TOKEN is not set — cannot reach the Vercel API.");
    }

    // `path` may already carry a query string; `URL` merges it, and we add `teamId` on top.
    const url = new URL(path, VERCEL_API);
    const teamId = this.teamId ?? process.env.VERCEL_TEAM_ID;
    if (teamId && !url.searchParams.has("teamId")) {
      url.searchParams.set("teamId", teamId);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    };

    const res = await fetch(url, { method: init.method, headers, body: init.body });

    // Some endpoints (e.g. add-domain) may return an empty or non-JSON body.
    const raw = await res.text();
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : undefined;
    } catch {
      data = raw;
    }

    if (!res.ok) {
      const message =
        (data as VercelErrorBody | undefined)?.error?.message ??
        (typeof data === "string" && data ? data : res.statusText);
      throw new Error(
        `Vercel API ${init.method ?? "GET"} ${url.pathname} failed (${res.status}): ${message}`,
      );
    }

    return data as T;
  }

  /** Link a GitHub repo → a new Vercel project. POST /v11/projects. */
  async createProject(opts: CreateProjectOpts): Promise<{ projectId: string }> {
    const project = await this.vfetch<VercelProject>("/v11/projects", {
      method: "POST",
      body: JSON.stringify({
        name: opts.name,
        gitRepository: { type: "github", repo: opts.repoFullName },
      }),
    });
    return { projectId: project.id };
  }

  /**
   * Find the current preview deployment for a PR. GET /v6/deployments, filtered by the project
   * and the Git-integration meta key `githubPrId` (the PR number). The list is newest-first, so
   * we return the newest deployment whose meta actually matches the PR — or `null` if Vercel
   * hasn't built one yet. The code-side meta check guards against the server ignoring the
   * `meta-` filter (it would otherwise hand back the newest unrelated deploy).
   */
  async getPreviewForPr(
    projectId: string,
    prNumber: number,
  ): Promise<PreviewDeployment | null> {
    const params = new URLSearchParams({
      projectId,
      limit: "20",
      "meta-githubPrId": String(prNumber),
    });
    const { deployments = [] } = await this.vfetch<DeploymentsList>(
      `/v6/deployments?${params.toString()}`,
    );

    const match = deployments.find((d) => d.meta?.githubPrId === String(prNumber));
    if (!match) return null;

    return {
      url: toUrl(match.url),
      status: match.state ?? match.readyState ?? "UNKNOWN",
    };
  }

  /**
   * Promote a specific commit to PRODUCTION by creating a production deployment from it.
   * POST /v13/deployments. We first read the project (GET /v9/projects/{id}) to recover its
   * `name` and linked GitHub repo — both of which the create-deployment `gitSource` needs and
   * which the port's (projectId, sha) signature doesn't carry.
   */
  async promoteToProd(projectId: string, sha: string): Promise<{ url: string }> {
    const project = await this.vfetch<VercelProject>(
      `/v9/projects/${encodeURIComponent(projectId)}`,
    );
    const link = project.link ?? {};

    // `gitSource` for a GitHub deploy wants the numeric repoId; fall back to org/repo names.
    const gitSource: Record<string, unknown> = { type: "github", ref: sha };
    if (typeof link.repoId === "number") {
      gitSource.repoId = link.repoId;
    } else {
      gitSource.repo = link.repo;
      gitSource.org = link.org;
    }

    const dep = await this.vfetch<CreatedDeployment>("/v13/deployments", {
      method: "POST",
      body: JSON.stringify({
        name: project.name,
        project: projectId,
        target: "production",
        gitSource,
      }),
    });

    return { url: toUrl(dep.url) };
  }

  /** Attach a domain (e.g. `{slug}.lu.computer`) to the project. POST /v10/projects/{id}/domains. */
  async addDomain(projectId: string, domain: string): Promise<void> {
    await this.vfetch<unknown>(
      `/v10/projects/${encodeURIComponent(projectId)}/domains`,
      {
        method: "POST",
        body: JSON.stringify({ name: domain }),
      },
    );
  }

  async findProject(nameOrId: string): Promise<{ projectId: string; name: string } | null> {
    try {
      const p = await this.vfetch<{ id?: string; name?: string }>(
        `/v9/projects/${encodeURIComponent(nameOrId)}`,
      );
      return p?.id ? { projectId: p.id, name: p.name ?? nameOrId } : null;
    } catch {
      return null; // 404 → no such project (the import path treats this as "none linked yet")
    }
  }
}
