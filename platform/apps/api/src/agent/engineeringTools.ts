import { experimental_generateImage as generateImage, tool } from "ai";
import { z } from "zod";
import { getImageModel, recommendModel } from "@leadanswered/core";
import type { ArtifactRecord, Store } from "../store/types.js";
import { getSandbox, type Sandbox } from "../sandbox/index.js";
import { getGit, type Git } from "../git/index.js";
import { getDeploy, type Deploy, type PreviewDeployment } from "../deploy/index.js";

/**
 * The ENGINEERING agent's toolkit (AGENTS-BACKEND §6, ENGINEERING-AGENT §5). The
 * flagship department agent: it builds AND ships real software — it stands up a
 * repo from a template, runs a coding agent (Claude Code / Codex) inside an
 * ephemeral e2b sandbox, generates hero imagery, opens a PR with a live Vercel
 * preview, and (only behind an Approval) publishes to `{slug}.lu.computer`.
 *
 * Same discipline as the SMS agent's tools (`agent/tools.ts`) and the Lu
 * orchestrator (`orchestratorTools.ts`): the model CHOOSES tools; every
 * side-effect is deterministic CODE over the ports (Store / Sandbox / Git /
 * Deploy); the RESULT is authoritative; and each action records an Artifact /
 * Task-status / Approval so the dock is a live view. The tools only ever talk to
 * the ports — never to e2b / GitHub / Vercel / a model provider directly — so the
 * providers stay swappable.
 *
 * Publishing is a HARD GATE (mirrors the SMS owner-send gate): `request_publish`
 * only STAGES an Approval; nothing reaches production until the owner approves and
 * `confirmPublish` (a server action in `engineering.ts`, NOT a model tool) runs.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** Stable working dir the Sandbox port clones a repo into (see `sandbox/e2b.ts`). */
const REPO_DIR = "/home/user/repo";

/**
 * A file in the sandbox home we drop the provider keys into and `source` at run
 * time. We pass the keys to the coding agent through the sandbox ENVIRONMENT
 * (written via the port's `writeFiles`, then sourced), NEVER interpolated into the
 * command string — so the secret is never in the captured `agent_session`
 * transcript / Artifact. (The Sandbox port only injects `GITHUB_TOKEN` at spawn
 * and exposes no generic `envs` passthrough; when it grows one, move this to
 * spawn-time envs.)
 */
const ENV_FILE = "/home/user/.lu-agent.env";

/** The single build branch the coding agent commits to (idempotent — `checkout -B`). */
const BUILD_BRANCH = "lu/build";

/**
 * Default starter template the v0 "we build your site" flow seeds a repo from, as
 * `owner/template` in the Lu-owned GitHub org. Placeholder id — swap for the real
 * cached Lu starter once the GitHub App org is provisioned (ENGINEERING-AGENT §2).
 */
const DEFAULT_SITE_TEMPLATE = "lu-computer/site-starter";

// ── Deps / context ─────────────────────────────────────────────────────────────

/**
 * Dependencies the Engineering tools need. `store` is required; the three
 * infra ports default to their factory getters so callers may pass just
 * `{ store }` (tests inject stubs).
 */
export interface EngineeringToolDeps {
  store: Store;
  sandbox?: Sandbox;
  git?: Git;
  deploy?: Deploy;
}

/** All ports resolved (factory-getter defaults applied). */
export interface ResolvedEngineeringDeps {
  store: Store;
  sandbox: Sandbox;
  git: Git;
  deploy: Deploy;
}

/** Apply the factory-getter defaults for the optional infra ports. */
export function resolveEngineeringDeps(deps: EngineeringToolDeps): ResolvedEngineeringDeps {
  return {
    store: deps.store,
    sandbox: deps.sandbox ?? getSandbox(),
    git: deps.git ?? getGit(),
    deploy: deps.deploy ?? getDeploy(),
  };
}

/** A side-effect this run surfaced for the dock (mirrors the orchestrator's `actions[]`). */
export type EngineeringAction =
  | { type: "site_created"; siteId: string; repoFullName: string }
  | { type: "preview_ready"; siteId: string; prNumber: number; url: string }
  | { type: "needs_approval"; siteId: string; approvalId: string; action: string };

/**
 * Per-run context + collectors shared across tool calls (the ownerTools `draft` /
 * orchestrator `ctx` pattern). `orgId` scopes every read/write. `taskId` is the
 * Task this run is executing, if any — `open_preview` / `request_publish` flip it
 * to `needs_approval`. `artifacts` + `actions` are populated by the tools and read
 * back by `runEngineering` after the loop; both default here so callers may pass
 * just `{ orgId }`.
 */
export interface EngineeringContext {
  orgId: string;
  /** The Task this run executes, if any — flipped to `needs_approval` at the preview/publish gate. */
  taskId?: string;
  /** Collector — every tool that produces an Artifact pushes it here. */
  artifacts?: ArtifactRecord[];
  /** Collector — preview-ready + approval-needed events for the dock. */
  actions?: EngineeringAction[];
}

// ── Shell / slug helpers ───────────────────────────────────────────────────────

/** Escape a string for safe inclusion inside a DOUBLE-quoted shell context. */
function shDq(s: string): string {
  return s.replace(/[\\$`"]/g, (c) => "\\" + c);
}

/** Wrap a value in SINGLE quotes for a shell/env file (escapes embedded single quotes). */
function shSq(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

/** A DNS/label-safe slug (for the repo name + `{slug}.lu.computer`). */
export function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
  return s || "site";
}

/** The repo/site slug from an `owner/name` (or bare name). */
function slugFromRepo(repoFullName: string): string {
  return slugify(repoFullName.split("/").pop() ?? repoFullName);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Render the provider-keys env file (server-side `process.env`, single-quoted).
 * Empty if no keys are set — the coding agent then simply has no key and reports
 * that itself (we don't fabricate one).
 */
function renderEnvFile(): string {
  const lines: string[] = [];
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  if (anthropic) lines.push(`export ANTHROPIC_API_KEY=${shSq(anthropic)}`);
  if (openai) lines.push(`export OPENAI_API_KEY=${shSq(openai)}`);
  return lines.join("\n") + "\n";
}

/**
 * The EXACT command run inside the sandbox to drive the chosen coding agent. The
 * key is referenced as an env var (`$ANTHROPIC_API_KEY` — sourced from ENV_FILE),
 * never the literal secret, so nothing sensitive lands in the transcript.
 */
function buildAgentCommand(agentKind: "claude_code" | "codex" | "shell", prompt: string): string {
  const load = `set -a; . ${ENV_FILE} 2>/dev/null || true; set +a`;
  if (agentKind === "claude_code") {
    return [
      load,
      `command -v claude >/dev/null 2>&1 || npm i -g @anthropic-ai/claude-code`,
      `cd ${REPO_DIR} && ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" claude -p "${shDq(prompt)}" --permission-mode acceptEdits`,
    ].join("\n");
  }
  if (agentKind === "codex") {
    return [
      load,
      `command -v codex >/dev/null 2>&1 || npm i -g @openai/codex || true`,
      `cd ${REPO_DIR} && OPENAI_API_KEY="$OPENAI_API_KEY" codex exec "${shDq(prompt)}"`,
    ].join("\n");
  }
  // shell — the prompt IS the command.
  return `cd ${REPO_DIR} && ${prompt}`;
}

/** Idempotent commit + push of the build branch (subshell contains the "nothing to commit" case). */
function buildCommitCommand(prompt: string): string {
  const title = (prompt.split("\n")[0] ?? "").trim().slice(0, 72) || "update site";
  const msg = shDq(`Lu build: ${title}`);
  return [
    `cd ${REPO_DIR}`,
    `git config user.email "engineer@lu.computer"`,
    `git config user.name "Lu Engineer"`,
    `git checkout -B ${BUILD_BRANCH}`,
    `git add -A`,
    `(git commit -m "${msg}" || echo "lu: nothing to commit")`,
    `git push -u origin ${BUILD_BRANCH}`,
  ].join(" && ");
}

/** Poll Vercel for the PR's preview until READY / terminal, or attempts run out. */
async function pollPreview(
  deploy: Deploy,
  projectId: string,
  prNumber: number,
): Promise<PreviewDeployment | null> {
  const ATTEMPTS = 8;
  const DELAY_MS = 3000;
  let last: PreviewDeployment | null = null;
  for (let i = 0; i < ATTEMPTS; i++) {
    last = await deploy.getPreviewForPr(projectId, prNumber);
    if (last && (last.status === "READY" || last.status === "ERROR" || last.status === "CANCELED")) {
      return last;
    }
    await sleep(DELAY_MS);
  }
  return last;
}

// ── The toolkit ────────────────────────────────────────────────────────────────

export function engineeringTools(deps: EngineeringToolDeps, ctx: EngineeringContext) {
  const d = resolveEngineeringDeps(deps);
  const artifacts = (ctx.artifacts ??= []);
  const actions = (ctx.actions ??= []);
  const taskId = ctx.taskId ?? null;

  return {
    create_site: tool({
      description:
        "Stand up a NEW website: create a private repo from a starter template in the Lu-owned GitHub org and register a Site row (status 'building'). Call this first, before run_coding_agent, when there is no repo yet for what you are building. Returns the siteId and the repo's full name (owner/name) — pass repoFullName to run_coding_agent next.",
      inputSchema: z.object({
        name: z.string().describe("The site/business name, e.g. 'Ridgeline Roofing' — becomes the repo slug"),
        preset: z
          .string()
          .optional()
          .describe("Optional starter template as owner/template; omit for the default Lu starter"),
        brand: z
          .string()
          .optional()
          .describe("Optional brand notes (colors, tone, style) to carry into the build prompt later"),
      }),
      execute: async ({ name, preset, brand }) => {
        const repo = await d.git.createRepoFromTemplate({
          name: slugify(name),
          template: preset ?? DEFAULT_SITE_TEMPLATE,
          private: true,
        });
        const site = await d.store.createSite({
          orgId: ctx.orgId,
          departmentKey: "engineering",
          repoFullName: repo.fullName,
          status: "building",
        });
        // site_preview STUB — the browser tile shows "building" until open_preview fills the URL.
        const artifact = await d.store.addArtifact({
          orgId: ctx.orgId,
          taskId,
          kind: "site_preview",
          title: `${name} — preview`,
          payload: {
            status: "building",
            url: null,
            repoFullName: repo.fullName,
            htmlUrl: repo.htmlUrl,
            brand: brand ?? null,
          },
        });
        artifacts.push(artifact);
        actions.push({ type: "site_created", siteId: site.id, repoFullName: repo.fullName });
        return { siteId: site.id, repoFullName: repo.fullName, repoUrl: repo.htmlUrl };
      },
    }),

    run_coding_agent: tool({
      description:
        "Do the actual coding work: spin up an isolated e2b sandbox, clone the repo, and run a coding agent (Claude Code or Codex) with your instructions, then commit and push the 'lu/build' branch. Give a clear, specific prompt describing exactly what to build or change (sections, copy, brand, fixes). The full transcript is saved as an agent_session Artifact. Returns the branch, a short summary, and the pushed HEAD sha (pass sha to open_preview).",
      inputSchema: z.object({
        repoFullName: z.string().describe("The repo to work in, as owner/name (from create_site)"),
        prompt: z.string().describe("Exactly what the coding agent should build or change, in plain instructions"),
        agentKind: z
          .enum(["claude_code", "codex", "shell"])
          .default("claude_code")
          .describe("Which runtime to use: claude_code (default), codex, or a raw shell command"),
      }),
      execute: async ({ repoFullName, prompt, agentKind }) => {
        // Scoped clone/push token for this repo's org (v0: the authed gh user).
        const token = await d.git.installationToken();
        const { id } = await d.sandbox.spawn({ repo: repoFullName, token });
        try {
          // Keys reach the sandbox via a sourced env file (never inline in a command → never in the transcript).
          await d.sandbox.writeFiles(id, [{ path: ENV_FILE, content: renderEnvFile() }]);

          const runCmd = buildAgentCommand(agentKind, prompt);
          const run = await d.sandbox.exec(id, runCmd);

          // agent_session Artifact — `command` holds the ENV-VAR reference form, not the secret value.
          const session = await d.store.addArtifact({
            orgId: ctx.orgId,
            taskId,
            kind: "agent_session",
            title: `${agentKind} — ${repoFullName}`,
            payload: {
              agentKind,
              repoFullName,
              command: runCmd,
              exitCode: run.exitCode,
              stdout: run.stdout,
              stderr: run.stderr,
            },
          });
          artifacts.push(session);

          // Commit + push, then read the pushed HEAD sha (for the later promote-to-prod).
          const commit = await d.sandbox.exec(id, buildCommitCommand(prompt));
          const shaRes = await d.sandbox.exec(id, `cd ${REPO_DIR} && git rev-parse HEAD`);
          const sha = shaRes.exitCode === 0 ? shaRes.stdout.trim() : undefined;

          const raw = (run.stdout || run.stderr || "").trim();
          const summary = raw.length > 800 ? raw.slice(0, 800) + "…" : raw;
          return {
            branch: BUILD_BRANCH,
            summary: summary || `${agentKind} run finished (exit ${run.exitCode}).`,
            sha,
            ranOk: run.exitCode === 0,
            pushedOk: commit.exitCode === 0,
            artifactId: session.id,
          };
        } finally {
          // Ephemeral: release the sandbox after a headless run (isolation + cost). Best-effort.
          await d.sandbox.kill(id).catch(() => {});
        }
      },
    }),

    generate_image: tool({
      description:
        "Generate an image (a website hero, brand graphic, social asset) and save it as an image Artifact. Picks the recommended hero-image model unless you pass one. Reference the returned artifactId when you wire the image into the site. Note: some models (Flux, Higgsfield) are not wired yet and return a placeholder Artifact.",
      inputSchema: z.object({
        prompt: z.string().describe("What the image should depict (subject, style, mood, framing)"),
        model: z
          .string()
          .optional()
          .describe("Optional image-model id override, e.g. gpt-image-1; omit for the recommended hero model"),
      }),
      execute: async ({ prompt, model }) => {
        const modelId = model ?? recommendModel("hero-image", "image").id;
        const imageModel = getImageModel(modelId);

        if (!imageModel) {
          // TODO(models §5b): Flux (via @ai-sdk/replicate|fal) and Higgsfield (via the connected MCP
          // client) have no direct AI-SDK image model yet — getImageModel returns undefined. Route
          // those through the MCP / Replicate wiring once added. Until then, record a placeholder so
          // the pipeline stays deterministic and the dock still shows the requested asset.
          const artifact = await d.store.addArtifact({
            orgId: ctx.orgId,
            taskId,
            kind: "image",
            title: `Image (placeholder) — ${modelId}`,
            payload: { model: modelId, prompt, placeholder: true, reason: "model_not_wired" },
          });
          artifacts.push(artifact);
          return {
            ok: false as const,
            reason: "model_not_wired" as const,
            model: modelId,
            artifactId: artifact.id,
          };
        }

        const result = await generateImage({ model: imageModel, prompt });
        const { base64, mediaType } = result.image;
        const artifact = await d.store.addArtifact({
          orgId: ctx.orgId,
          taskId,
          kind: "image",
          title: `Image — ${modelId}`,
          payload: {
            model: modelId,
            prompt,
            mediaType,
            dataUrl: `data:${mediaType};base64,${base64}`,
          },
        });
        artifacts.push(artifact);
        return { ok: true as const, model: modelId, mediaType, artifactId: artifact.id };
      },
    }),

    open_preview: tool({
      description:
        "Open a pull request for the build branch and get a live Vercel preview deployment for the owner to review. Creates the Site's Vercel project on first use. Saves the PR diff and the preview URL as Artifacts and moves the current task to 'needs_approval'. This is NOT publishing — it is the review step. Returns the PR number and the preview URL.",
      inputSchema: z.object({
        siteId: z.string().describe("The Site (from create_site)"),
        repoFullName: z.string().describe("The repo, as owner/name"),
        branch: z.string().describe("The head branch with the changes (usually 'lu/build')"),
        sha: z
          .string()
          .optional()
          .describe("The head commit sha from run_coding_agent (used later to promote to prod)"),
      }),
      execute: async ({ siteId, repoFullName, branch, sha }) => {
        const site = await d.store.getSite(siteId);
        if (!site) return { ok: false as const, reason: "site_not_found" as const };

        const slug = slugFromRepo(repoFullName);
        const pr = await d.git.openPR({
          repo: repoFullName,
          head: branch,
          base: "main",
          title: `Lu build: ${slug}`,
          body: "Automated build by the Lu Engineering agent. Review the preview, then approve to publish.",
        });

        // Ensure the Site has a Vercel project (create on first preview).
        let projectId = site.vercelProjectId;
        if (!projectId) {
          const created = await d.deploy.createProject({ name: slug, repoFullName });
          projectId = created.projectId;
          await d.store.updateSite(siteId, { vercelProjectId: projectId });
        }

        const preview = await pollPreview(d.deploy, projectId, pr.number);
        const url = preview?.url ?? "";
        const status = preview?.status ?? "BUILDING";

        await d.store.addDeployment({
          siteId,
          env: "preview",
          url,
          sha: sha ?? null,
          prNumber: pr.number,
          status,
        });

        const diff = await d.git.getDiff(repoFullName, pr.number);
        const diffArtifact = await d.store.addArtifact({
          orgId: ctx.orgId,
          taskId,
          kind: "pr_diff",
          title: `PR #${pr.number} diff`,
          payload: { prNumber: pr.number, prUrl: pr.url, diff },
        });
        const previewArtifact = await d.store.addArtifact({
          orgId: ctx.orgId,
          taskId,
          kind: "site_preview",
          title: `Preview — ${slug}`,
          payload: { status, url, prNumber: pr.number, prUrl: pr.url },
        });
        artifacts.push(diffArtifact, previewArtifact);

        await d.store.updateSite(siteId, { status: "preview" });
        if (ctx.taskId) await d.store.updateTaskStatus(ctx.taskId, "needs_approval");
        actions.push({ type: "preview_ready", siteId, prNumber: pr.number, url });

        return { ok: true as const, prNumber: pr.number, prUrl: pr.url, previewUrl: url, status };
      },
    }),

    request_publish: tool({
      description:
        "Ask the owner to publish the reviewed preview to production. This does NOT publish — it stages an Approval and moves the task to 'needs_approval'. Publishing only happens after the owner approves (confirmPublish runs then). Call this once the owner has seen the preview and wants to go live.",
      inputSchema: z.object({
        siteId: z.string().describe("The Site to publish (from create_site)"),
      }),
      execute: async ({ siteId }) => {
        const site = await d.store.getSite(siteId);
        if (!site) return { status: "error" as const, reason: "site_not_found" as const };
        const approval = await d.store.createApproval({
          orgId: ctx.orgId,
          taskId,
          action: "publish_site",
        });
        if (ctx.taskId) await d.store.updateTaskStatus(ctx.taskId, "needs_approval");
        actions.push({ type: "needs_approval", siteId, approvalId: approval.id, action: "publish_site" });
        return { status: "needs_approval" as const, approvalId: approval.id };
      },
    }),
  };
}
