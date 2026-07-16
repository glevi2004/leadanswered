# Lu Computer — the Engineering agent (build spec)

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md).

The flagship agent, built first: it's the site pipeline the wedge (Marketing) reuses and the dev accelerator
Lu dogfoods to build the other departments. Companions: [agent-backend.md](./agent-backend.md) (the runtime +
data model), [canvas-tools.md](./canvas-tools.md) (the terminal tool). For wiring it into the product surface,
see [engineer-activation.md](./engineer-activation.md).

## 0. The end-to-end

```
Lu / you: "build my marketing site"
  → the Engineering AGENT (AI-SDK tool-loop, apps/api) creates a Task + a repo from a template
  → run_coding_agent → e2b SANDBOX spawns, repo cloned, Claude Code or Codex edits files (+ generate_image
     for the hero via gpt-image/Flux/Higgsfield), commits           ← transcript streams to an Artifact
  → open PR (GitHub API) → Vercel builds a PREVIEW deployment         ← preview URL + PR diff = Artifacts
  → Task → needs_approval → you click Publish → merge → Vercel PROD → Site.domain = {slug}.lu.computer  ✅
```

Same infra, two entry modes: **autonomous** (a Task, headless coding agent) and **interactive** (the canvas
**terminal** tool — the coding agent in a PTY you watch/drive, [canvas-tools.md §4](./canvas-tools.md)).

## 1. The stack

- **Sandbox:** e2b (behind a `Sandbox` port; Daytona/Fly swappable). Prebuilt e2b template = node + git +
  **Claude Code** (`@anthropic-ai/claude-code`) + **Codex** (`@openai/codex`) + a starter web template cached.
- **Coding agent:** the owner picks **Claude Code** (`claude -p`, headless / PTY) **or Codex** (`codex exec` /
  PTY) — the runtime wraps whichever.
- **Repos: the customer's own GitHub, by default** — Lu OAuths / App-installs on the owner's account and creates
  the repo *there* (BYO — [agent-backend.md §7](./agent-backend.md) · [FOUNDATION.md §7](../FOUNDATION.md)); a
  Lu-owned org holding a v0 starter-template repo is only the wedge bootstrap.
- **Hosting:** Vercel API — deploy into the **customer's own** Vercel (BYO): project per repo, auto preview per
  PR, prod on merge. The free/preview default is `{slug}.lu.computer` on a Lu-managed surface; a real business
  runs on its own domain. A fully Lu-managed + metered tier is the later destination.
- **Reasoning models:** Anthropic + OpenAI + Google + **xAI/Grok** via AI SDK v6 (the model gateway —
  [agent-backend.md §5b](./agent-backend.md); any agent runs any model). **Image:** gpt-image / Flux / Higgsfield.
- **Where the code lives:** the Engineering AGENT + Sandbox/GitHub/Vercel ports in `apps/api` (heavy runs go
  async — v0 in-process, scaling to a **durable worker** that supervises the sandbox marathon;
  [agent-backend.md §3](./agent-backend.md) / [FOUNDATION.md §4](../FOUNDATION.md)); the terminal node + canvas
  elements in `apps/web`; shared types in `packages/core`; the tables in `packages/db`.

## 2. External setup (the real blockers)

Everything up to these seams is buildable; these need real accounts/dashboards:

1. **GitHub App** — a Lu **GitHub App** (repo + PR + contents scopes) → App ID + private key, **installed on the
   customer's own org** to provision into *their* account (BYO); installation tokens are scoped per install. A
   Lu-owned org holding v0 starter repos is the wedge bootstrap.
2. **e2b** — account + **`E2B_API_KEY`**; the e2b template (a Dockerfile with the CLIs) is authored against it.
3. **Vercel** — a **Vercel OAuth app** to deploy into the **customer's own** Vercel (BYO real deploys), plus a Lu
   account/team + **`VERCEL_TOKEN`** (+ `VERCEL_TEAM_ID`) for previews / dogfooding / the managed surface; add the
   domain **`lu.computer`** + wildcard `*.lu.computer` DNS to the Lu team (for `{slug}.lu.computer` free previews).
4. **Provider keys** (Railway env for `apps/api`): `ANTHROPIC_API_KEY`, **`OPENAI_API_KEY`** (Codex + gpt-image +
   GPT), optional Google, **`BFL_API_KEY`** (Flux). Higgsfield = the connected MCP.

## 3. Data model

Add the Engineering slice of the agent-OS tables (full schema in [agent-backend.md §2](./agent-backend.md)):
**Department**, **Agent** (+ `contract`, `models`), **ContractRevision**, **Task** (+ `status`, `parentTaskId`,
`model`), **Artifact** (`kind`: `agent_session|pr_diff|site_preview|image|file`), **Site** (`repoFullName`,
`vercelProjectId`, `domain`), **Deployment** (`env`, `url`, `sha`, `prNumber`), **GithubConnection**
(`installationId`, `login`), **Session** (`sandboxId`, `agentKind`, `repo`, `status`),
**CanvasNode**/**Edge** ([canvas-tools.md §1](./canvas-tools.md)), **Approval**. The `Store` port carries the
CRUD; web reads via `@supabase/ssr`.

## 4. The ports (clean seams)

- **`Sandbox` port** (`apps/api/src/sandbox/`): `spawn(template, repo, token)` → id; `exec(cmd)`; `pty()` → a
  duplex stream; `writeFiles`/`readFiles`; `kill`. e2b impl behind it; a `LocalSandbox` stub for tests.
- **`Git` port** (`apps/api/src/git/`): via **GitHub App** — `createRepoFromTemplate`, `installationToken(org)`,
  `openPR`, `mergePR`, `getDiff` (Octokit + App auth; the `gh` CLI is a local fallback).
- **`Deploy` port** (`apps/api/src/deploy/`): Vercel — `createProject(repo)`, `getPreviewFor(pr)`,
  `promoteToProd(sha)`, `addDomain(slug)`.
- **Model gateway** (`packages/core/models.ts`): the registry (provider · modality · tier · speed · cost ·
  best-for) + `getModel(id)` / `getImageModel(id)`; multi-provider text + image.

## 5. The Engineering agent (the tool-loop)

Same shape as any department agent (§3 of [agent-backend.md](./agent-backend.md)), on a stronger model
(Opus/Sonnet), with tools:

- `create_site(preset, brand)` → `Git.createRepoFromTemplate` + a `Site` row.
- `run_coding_agent(repo, prompt, agentKind)` → `Sandbox.spawn` → run `claude -p` / `codex exec` with the task +
  the agent's `contract` + the repo's `AGENTS.md`; stream the transcript → `agent_session` Artifact; commit.
- `generate_image(model, prompt)` → an image model → an asset into the repo + an `image` Artifact.
- `open_preview(repo)` → `Git.openPR` + `Deploy.getPreviewFor` → `pr_diff` + `site_preview` Artifacts;
  Task → `needs_approval`.
- `request_publish` / `confirmPublish(site)` → gated by an **Approval** → `Git.mergePR` +
  `Deploy.promoteToProd` + `Deploy.addDomain`.

Discipline: deterministic tool bodies, idempotent (a Task/PR is created once), every action → the activity log.

## 6. The terminal tool (the interactive door)

Reuses the `Sandbox` port ([canvas-tools.md §4](./canvas-tools.md)): the canvas terminal node = **xterm.js**
(`apps/web`) ⇄ a **websocket** on `apps/api` ⇄ `Sandbox.pty()`. Pick Claude Code / Codex / shell → spawn →
attach the PTY → you watch + type; the session is a `Session` + `agent_session` Artifact, Edge→ the Engineering
agent. The same sandbox that autonomous Tasks use.

## 7. Build sequence (each step demoable)

- **Foundation:** the migration (§3) + `Store` CRUD + the model gateway (§4) + make `/canvas` read real
  Agent/Task/Artifact rows + the Lu orchestrator wired to `/api/lu`. *Lu creates real tasks; the dock shows them
  live.*
- **Sandbox + coding agent** (e2b): the `Sandbox` e2b impl + the e2b template (Claude Code + Codex) +
  `run_coding_agent` headless on a scratch repo. *"Edit this file" → the coding agent does it in a sandbox.*
- **GitHub + Vercel pipeline** (GitHub App + Vercel token): the `Git` + `Deploy` ports + `create_site` +
  `open_preview` + `publish`. *`create_site` → repo → PR → Vercel preview → publish → `{slug}.lu.computer` live.*
- **The Engineering agent** ties the sandbox + pipeline into the tool-loop + the Task/Artifact/Approval flow in
  the dock + `generate_image` heroes. *"Lu, build my marketing site" end-to-end, artifacts + approval in the dock.*
- **The terminal tool** — xterm.js + PTY websocket — interactive Claude Code/Codex on the canvas.
- **Dogfood + onboarding-real:** onboarding ends on a real DB org + a live site; then the Engineering agent
  helps build the next department (Marketing). See [engineer-activation.md](./engineer-activation.md) for the
  in-product wiring.
