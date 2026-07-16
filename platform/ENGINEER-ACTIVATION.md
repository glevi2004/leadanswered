# Build plan — activating the Engineer (make its tools actually work in the product)

> Levi + Claude, 2026-07-16. Companion to **`ENGINEERING-AGENT.md`** (the original build plan) and
> **`AGENTS-BACKEND.md`**. That plan built the backend; this one makes it **usable in the app** —
> a user clicks, the Engineer builds + ships, and you watch it happen.

## 0. Where we actually are (from the state review)

The **backend build pipeline is ~90% written and coherent** — the agent tool-loop, all six tools
(`create_site` → `run_coding_agent` → `generate_image` → `open_preview` → `request_publish` →
`confirmPublish`), and real port adapters (e2b sandbox, `gh`-CLI Git, Vercel REST) all exist, plus full
Store CRUD (sites/tasks/artifacts/approvals/sessions) in both Memory + Prisma. **We proved the core live**
(Claude Code building real code in an e2b sandbox; Lu decomposing a goal into real Task rows).

**The gap is everything *around* the agent:**
- It's a **headless, synchronous** `POST /api/engineering` that **nothing in the product calls**, and a real
  build runs for *minutes inside one HTTP request* (no job, no streaming).
- **Nothing dispatches** Lu's `createTask(engineering)` → `runEngineering`; the route even ignores `taskId`,
  so the `needs_approval` flips never fire via HTTP.
- The **publish gate can't be closed** — `confirmPublish` is dead code (no endpoint resolves an approval → it).
- **No read routes** expose tasks/artifacts/approvals/sites, and **the whole "watch the agent" UI is mocks**
  (`agent-work.ts`, `ArtifactsNav`, `APEX_*` approvals). The web `/api/lu/chat` is a **tool-less Haiku chat**,
  disconnected from the real orchestrator/Engineer.
- `generate_image` only works via `gpt-image-1`; the default hero model (Flux/Higgsfield) returns a placeholder.
- **External infra is unprovisioned:** GitHub home for repos, a starter template repo, a *stable* Vercel token
  (the CLI one just expired) + the Vercel↔GitHub integration, `lu.computer` wildcard DNS, an e2b template.

## 1. The activation plan (phased; each phase is demoable)

### Phase A — Provision the seams (owner tasks; unblocks everything)
- **GitHub home for repos** — v0: the authed `gh` user (`glevi2004`); v1: a Lu GitHub **App + org**. (Pick v0.)
- **Starter template repo** — create `glevi2004/lu-site-starter` (a minimal Next.js/static site), or let
  `run_coding_agent` scaffold from an empty repo (drop the template requirement for v0).
- **Stable Vercel token** — a real Vercel **API token** (dashboard, non-expiring) in `apps/api`'s Railway env
  as `VERCEL_TOKEN` + `VERCEL_TEAM_ID`; install the **Vercel↔GitHub** integration on the repo.
- **`lu.computer` DNS** — add `lu.computer` + wildcard `*.lu.computer` to the Vercel team (for
  `{slug}.lu.computer`). Until then, sites live at their `*.vercel.app` URL.
- **e2b** — key is set; the prebuilt template (CLIs cached) is a *perf* nicety, not required (runtime `npm i`).
- **Hero image** — default the hero model to **`gpt-image-1`** (works today, needs `OPENAI_API_KEY` on Railway);
  wire Flux/Higgsfield later.

### Phase B — Backend activation (make it runnable + closeable)
1. **Async run + dispatcher** — the Engineer must run in the background, not in one request. v0 (no new infra):
   run it as a **fire-and-forget background task inside `apps/api`** that writes progress (task status +
   artifacts) to the Store; the UI reads/streams the Store. A **dispatcher** consumes a `createTask(engineering)`
   → `runEngineering(deps, { orgId, taskId, message })` (wire `taskId` through the route + the orchestrator).
2. **Read routes** — `GET /api/tasks`, `/api/artifacts`, `/api/approvals`, `/api/sites` (scoped to `orgId`).
3. **Publish endpoint** — `POST /api/approvals/:id/resolve` → on approve, call `confirmPublish` (merge → promote
   → attach `{slug}.lu.computer`). Closes the gate.
4. **Assert infra env** at boot (`env.ts`) so a missing `VERCEL_TOKEN`/`E2B_API_KEY` fails fast, not mid-build.

### Phase C — Product UI (invoke + watch — the payoff)
1. **Invoke** — connect the web **Lu dock chat** to the *real* orchestrator (`apps/api` `POST /api/lu`) instead
   of the tool-less Haiku route, so "build me a site" → a real engineering Task → the dispatcher runs it.
2. **Watch** — replace the dock mocks (`agent-work.ts`, `ArtifactsNav`, `APEX_*` approvals) with **real Store
   reads** via the Phase-B routes: live task status, the `agent_session` transcript, the `pr_diff`, and the
   **`site_preview` rendered in a browser-frame node** on the canvas.
3. **Approve** — a **Publish** button on the approval → `POST /api/approvals/:id/resolve` → site goes live.

### Phase D — The terminal tool (the interactive door, CANVAS-TOOLS §4)
- The sandbox `pty()` + the `Session` table already exist. Add a **websocket PTY route** (`apps/api`) + an
  **xterm.js terminal node** on the canvas (the toolbar `terminal` button → spawn Claude Code/Codex/shell,
  stream the PTY, you watch + type). This is the "big one"; it rides the same sandbox the autonomous runs use.

### Phase E — generate_image + polish
- Wire the hero model beyond `gpt-image-1`: Flux via `@ai-sdk/replicate|fal`, or Higgsfield via the MCP client.
- Later: the **multi-tenant `*.lu.computer` (surface A)** hosting model for customer sites at scale (the deploy
  adapter models only repo-per-project today).

## 2. The v0 "watch the Engineer ship" demo (shortest end-to-end)

Phase A (v0 choices) + Phase B (1–3) + Phase C = a real loop: **you tell Lu "build my site" in the dock → an
engineering Task appears → the Engineer scaffolds it in a sandbox with Claude Code → opens a Vercel preview →
the preview + PR diff show on your canvas → you hit Publish → it's live at a URL.** That's the whole thesis,
real, and it's mostly *wiring* (the hard agent parts are done). The terminal (D) and multi-tenant hosting (E)
follow.

## 3. Decisions needed (v0 recommendations in **bold**)

- **GitHub home:** **`gh`-user (glevi2004) for v0** vs. a Lu GitHub App/org now.
- **Async model:** **background task in `apps/api` + Store progress** vs. reviving a BullMQ worker.
- **Hosting:** **repo-per-Vercel-project (surface B) for v0** vs. building multi-tenant now.
- **Hero image:** **default to `gpt-image-1`** vs. wiring Flux/Higgsfield first.
- **Invoke path:** **the Lu dock chat → real orchestrator** (vs. a dedicated "build" button on the dept).
- **Template:** **scaffold from an empty repo** (no template dependency) vs. authoring `lu-site-starter`.
