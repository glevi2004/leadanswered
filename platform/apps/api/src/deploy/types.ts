/**
 * The Deploy PORT (Ports & Adapters) — hosting for the Engineering pipeline (surface B:
 * per-repo Vercel projects, preview-per-PR, promote-on-approve). The Engineering agent only
 * ever talks to this interface, never to Vercel directly, so the provider stays swappable and
 * a test double can stand in with ZERO caller changes.
 *
 * Scope note (AGENTS-BACKEND §7): this is the REPO-PER-PROJECT surface (B) — real software +
 * dogfooding. The mass CUSTOMER-site path (A) is a separate multi-tenant `*.lu.computer`
 * project and is NOT modelled here.
 *
 * Spec: AGENTS-BACKEND.md §6 (Engineering agent — PR + preview + publish) & §7 (two hosting
 * models), ENGINEERING-AGENT.md §4 (the ports) & §7 (the M2 pipeline milestone).
 */

/** Options for linking a GitHub repo to a new Vercel project. */
export interface CreateProjectOpts {
  /** Project name (Vercel-unique within the team; usually the repo/site slug). */
  name: string;
  /** The GitHub repo to connect, as `owner/name` (Vercel's `gitRepository.repo`). */
  repoFullName: string;
}

/** A preview deployment surfaced for a PR (the `site_preview` artifact on the canvas). */
export interface PreviewDeployment {
  /** Full https URL of the preview deployment. */
  url: string;
  /** Vercel deployment state — QUEUED | BUILDING | INITIALIZING | READY | ERROR | CANCELED. */
  status: string;
}

/**
 * Provider-agnostic deploy port. Implemented by `VercelDeploy` (Vercel is LOCKED,
 * AGENTS-BACKEND §11); a stub can implement it for tests without touching the network.
 */
export interface Deploy {
  /** Link a GitHub repo → a new Vercel project. Returns the created project's id. */
  createProject(opts: CreateProjectOpts): Promise<{ projectId: string }>;
  /**
   * Find the current preview deployment for a pull request, or `null` if Vercel hasn't built
   * one yet (the caller polls until non-null / `status === 'READY'`).
   */
  getPreviewForPr(projectId: string, prNumber: number): Promise<PreviewDeployment | null>;
  /** Promote a specific commit to production (the "Publish" action). Returns the prod URL. */
  promoteToProd(projectId: string, sha: string): Promise<{ url: string }>;
  /** Attach a domain (e.g. `{slug}.lu.computer`) to the project. */
  addDomain(projectId: string, domain: string): Promise<void>;
}
