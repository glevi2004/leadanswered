# Build plan — the Engineering agent (the flagship, built first)

> Build plan (Levi + Claude, 2026-07-15). Companions: **`AGENTS-BACKEND.md`** (the runtime + data model + §6
> Engineering), **`CANVAS-TOOLS.md`** (the terminal tool). **Why first:** it's the flagship agent, the site
> pipeline the wedge (Marketing) reuses, AND our own dev accelerator — **we dogfood it to build the other
> departments** (`DOGFOOD.md`, customer #1). All decisions are LOCKED (`AGENTS-BACKEND §11`).

## 0. The end-to-end we're building

```
Lu / you: "build my marketing site"
  → Engineering AGENT (AI-SDK tool-loop, apps/api) creates a Task + a repo from a template (GitHub App)
  → run_coding_agent → e2b SANDBOX spawns, repo cloned, Claude Code OR Codex edits files (+ generate_image
     for the hero via gpt-image/Flux/Higgsfield), commits            ← transcript streams to an Artifact
  → open PR (GitHub API) → Vercel builds a PREVIEW deployment          ← preview URL + PR diff = Artifacts
  → Task → needs_approval → you click Publish → merge → Vercel PROD → Site.domain = {slug}.lu.computer  ✅
```
Same infra, two entry modes: **autonomous** (a Task, headless coding agent) and **interactive** (the canvas
**terminal** tool — the coding agent in a PTY you watch/drive, `CANVAS-TOOLS §4`).

## 1. Locked stack

- **Sandbox:** e2b (a `Sandbox` port; Daytona/Fly swappable). Prebuilt e2b template = node + git + **Claude Code**
  (`@anthropic-ai/claude-code`) + **Codex** (`@openai/codex`) + a starter web template cached.
- **Coding agent:** the user picks **Claude Code** (`claude -p`, headless / PTY) **or Codex** (`codex exec` /
  PTY) — the runtime wraps whichever.
- **Repos:** **Lu-owned** — a GitHub App on a Lu org creates one repo per site from a starter template (v0);
  connect-your-GitHub is v1.
- **Hosting:** Vercel API — project per repo, auto preview per PR, prod on merge, domain `{slug}.lu.computer`.
- **Reasoning models:** Anthropic + OpenAI + Google via AI SDK v6. **Image:** gpt-image / Flux / Higgsfield.
- **Where the code lives:** the Engineering AGENT + Sandbox/GitHub/Vercel ports in `apps/api` (+ the heavy runs
  on `apps/worker`); the terminal node + canvas elements in `apps/web`; shared types in `packages/core`; new
  tables in `packages/db`.

## 2. External setup Levi must provision (the real blockers)

I can build everything up to these seams; these need Levi's accounts/dashboards:
1. **GitHub App** — register a Lu-org GitHub App (repo + PR + contents scopes) → **App ID + private key**;
   install it on a **Lu-owned GitHub org** (holds the v0 site repos). Gives installation tokens.
2. **e2b** — account + **`E2B_API_KEY`**; I author the e2b template (Dockerfile with the CLIs) but the account/key are Levi's.
3. **Vercel** — account/team + **`VERCEL_TOKEN`**; add the domain **`lu.computer`** + wildcard `*.lu.computer`
   DNS to the Vercel team.
4. **Provider keys** (Railway env for `apps/api`/worker): `ANTHROPIC_API_KEY` (have), **`OPENAI_API_KEY`** (new —
   Codex + gpt-image + GPT), optional Google, **`BFL_API_KEY`** (Flux). Higgsfield = the connected MCP.

## 3. Data model (the migration — the subset needed now)

Add to `packages/db/prisma/schema.prisma` (per `AGENTS-BACKEND §2`, Engineering slice): **Department**, **Agent**
(+ `contract`, `models`), **ContractRevision**, **Task** (+ `status`, `parentTaskId`, `model`), **Artifact**
(`kind`: `agent_session|pr_diff|site_preview|image|file`), **Site** (`repoFullName`, `vercelProjectId`,
`domain`), **Deployment** (`env`, `url`, `sha`, `prNumber`), **GithubConnection** (`installationId`, `login`),
**Session** (the sandbox/terminal: `sandboxId`, `agentKind`, `repo`, `status`), **CanvasNode**/**Edge**
(`CANVAS-TOOLS §1`), **Approval**. Grow the `Store` port with the CRUD; web reads via `@supabase/ssr`.

## 4. The ports (clean seams, buildable before the keys land)

- **`Sandbox` port** (`apps/api/src/sandbox/`): `spawn(template, repo, token)` → id; `exec(cmd)`; `pty()` →
  a duplex stream; `writeFiles`/`readFiles`; `kill`. e2b impl behind it; a `LocalSandbox` stub for tests.
- **`Git` port** (`apps/api/src/git/`): via **GitHub App** — `createRepoFromTemplate`, `installationToken(org)`,
  `openPR`, `mergePR`, `getDiff`. (Octokit + App auth.)
- **`Deploy` port** (`apps/api/src/deploy/`): Vercel — `createProject(repo)`, `getPreviewFor(pr)`,
  `promoteToProd(sha)`, `addDomain(slug)`.
- **Model gateway** (`packages/core/models.ts`): the registry (provider · modality · tier · speed · cost ·
  best-for) + `getModel(id)` / `getImageModel(id)`; extends `agent/provider.ts` to multi-provider + image.

## 5. The Engineering agent (the tool-loop)

Same shape as the SMS agent (`agent/runner.ts`), stronger model (Opus/Sonnet), tools:
- `create_site(preset, brand)` → `Git.createRepoFromTemplate` + `Site` row.
- `run_coding_agent(repo, prompt, agentKind)` → `Sandbox.spawn` → run `claude -p`/`codex exec` with the task +
  the agent's `contract` + the repo's `AGENTS.md`; stream transcript → `agent_session` Artifact; commit.
- `generate_image(model, prompt)` → image model → asset into the repo + an `image` Artifact.
- `open_preview(repo)` → `Git.openPR` + `Deploy.getPreviewFor` → `pr_diff` + `site_preview` Artifacts;
  Task → `needs_approval`.
- `publish(site)` → gated by an **Approval** → `Git.mergePR` + `Deploy.promoteToProd` + `Deploy.addDomain`.
Discipline: deterministic tool bodies, idempotent (a Task/PR is created once), every action → activity log.

## 6. The terminal tool (interactive door — `CANVAS-TOOLS §4`)

Reuses §4's `Sandbox`: the canvas terminal node = **xterm.js** (`apps/web`) ⇄ a **websocket** on `apps/api` ⇄
`Sandbox.pty()`. Pick Claude Code/Codex/shell → spawn → attach the PTY → you watch + type; the session is a
`Session` + `agent_session` Artifact, Edge→ the Engineering agent. Same sandbox that autonomous Tasks use.

## 7. Milestones (each demoable; * = needs a Levi key from §2)

- **M0 — foundation (no keys):** the migration (§3) + `Store` CRUD + the model gateway (§4) + make `/canvas`
  read real Agent/Task/Artifact rows (delete `agent-work.ts`/`dept-roadmap.ts` fixtures) + the Lu orchestrator
  skeleton wired to `/api/lu`. *Demo: Lu creates real tasks; the dock shows them live.*
- **M1 — sandbox + coding agent\*** (e2b key): `Sandbox` e2b impl + the e2b template (Claude Code + Codex) +
  `run_coding_agent` headless on a scratch repo. *Demo: "edit this file" → the coding agent does it in a sandbox.*
- **M2 — GitHub + Vercel pipeline\*** (GitHub App + Vercel token): `Git` + `Deploy` ports + `create_site` +
  `open_preview` + `publish`. *Demo: `create_site` → repo → PR → Vercel preview → publish → `{slug}.lu.computer` live.*
- **M3 — the Engineering agent** ties M1+M2 into the tool-loop + Task/Artifact/Approval flow in the dock +
  `generate_image` heroes. *Demo: "Lu, build my marketing site" end-to-end, artifacts + approval in the dock.*
- **M4 — the terminal tool** (xterm.js + PTY ws) — interactive Claude Code/Codex on the canvas.
- **M5 — dogfood + onboarding-real:** point onboarding's site step at M3 (real DB org + a live site at the end);
  then **use the Engineering agent to build the next department** (Marketing) — the roadmap begins.

## 8. What I start now vs what waits on Levi

- **Start now (M0, no keys):** the Prisma migration, the `Store`/`Sandbox`/`Git`/`Deploy` port interfaces (+ e2b
  impl written but keyless), the model gateway, the canvas reading real rows, the Lu orchestrator skeleton, the
  terminal node UI shell.
- **Unblocks when Levi provisions §2:** live e2b runs (M1), GitHub App repos + Vercel deploys (M2), and thus the
  full end-to-end (M3+). I'll flag the exact env var / dashboard step at each seam.
