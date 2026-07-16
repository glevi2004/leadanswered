# Lu Computer — activating the Engineer in the product

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md).

The build spec ([engineering-agent.md](./engineering-agent.md)) defines the Engineer's runtime and tools; this
spec makes it **usable in the app** — the owner clicks, the Engineer builds and ships, and you watch it happen.
Companion: [agent-backend.md](./agent-backend.md).

## 0. What activation connects

The build pipeline is the agent tool-loop and the six tools (`create_site` → `run_coding_agent` →
`generate_image` → `open_preview` → `request_publish` → `confirmPublish`) over real port adapters (e2b sandbox,
Git, Vercel REST), with full Store CRUD (sites/tasks/artifacts/approvals/sessions). Activation is everything
*around* the agent: a way to dispatch it, run it async, expose its progress, drive it from the UI, and close the
publish gate.

## 1. Provision the seams (external infra)

The same seams as [engineering-agent.md §2](./engineering-agent.md), with v0 choices:

- **GitHub home** — v0: an authed `gh` user; v1: a Lu GitHub **App + org**.
- **Starter template repo** — a minimal Next.js/static site, or let `run_coding_agent` scaffold from an empty
  repo (v0 drops the template requirement).
- **Stable Vercel token** — a non-expiring Vercel **API token** + `VERCEL_TEAM_ID` in `apps/api`'s Railway env;
  install the **Vercel↔GitHub** integration on the repo.
- **`lu.computer` DNS** — `lu.computer` + wildcard `*.lu.computer` on the Vercel team (for `{slug}.lu.computer`).
  Until then, sites live at their `*.vercel.app` URL.
- **e2b** — key set; a prebuilt template (CLIs cached) is a *perf* nicety, not required (runtime `npm i`).
- **Hero image** — default the hero model to **`gpt-image-1`** (`OPENAI_API_KEY` on Railway); wire Flux/
  Higgsfield later.

## 2. Backend activation (runnable + closeable)

1. **Async run + dispatcher** — the Engineer runs in the background, not in one HTTP request. v0 (no new infra):
   a **fire-and-forget background task inside `apps/api`** that writes progress (task status + artifacts) to the
   Store; the UI reads/streams the Store. A **dispatcher** consumes a `createTask(engineering)` →
   `runEngineering(deps, { orgId, taskId, message })` (wire `taskId` through the route + the orchestrator).
   *This v0 in-process model is deliberately demo-grade; the scale path — the key platform-maturation item — is
   a **durable worker** (Trigger.dev / Inngest) so overnight runs survive redeploys/crashes, supervise the
   sandbox marathon, and resume after Approvals ([FOUNDATION.md §4](../FOUNDATION.md) · [ROADMAP.md](../ROADMAP.md)).*
2. **Read routes** — `GET /api/tasks`, `/api/artifacts`, `/api/approvals`, `/api/sites` (scoped to `orgId`).
3. **Publish endpoint** — `POST /api/approvals/:id/resolve` → on approve, call `confirmPublish` (merge →
   promote → attach `{slug}.lu.computer`). Closes the gate.
4. **Assert infra env at boot** (`env.ts`) so a missing `VERCEL_TOKEN`/`E2B_API_KEY` fails fast, not mid-build.

## 3. Product UI (invoke · watch · approve)

1. **Invoke** — the web **Lu dock chat** talks to the *real* orchestrator (`apps/api` `POST /api/lu`), so
   "build me a site" → a real engineering Task → the dispatcher runs it.
2. **Watch** — the dock reads **real Store rows** via the §2 routes (not fixtures): live task status, the
   `agent_session` transcript, the `pr_diff`, and the **`site_preview` rendered in a browser-frame node** on the
   canvas.
3. **Approve** — a **Publish** button on the approval → `POST /api/approvals/:id/resolve` → the site goes live.

## 4. The terminal tool (the interactive door)

The sandbox `pty()` + the `Session` table back a **websocket PTY route** (`apps/api`) + an **xterm.js terminal
node** on the canvas: the toolbar `terminal` button spawns Claude Code/Codex/shell, streams the PTY, and you
watch + type. It rides the same sandbox the autonomous runs use ([canvas-tools.md §4](./canvas-tools.md)).

## 5. generate_image + the hosting scale path

- The hero model defaults to `gpt-image-1`; Flux (via `@ai-sdk/replicate|fal`) or Higgsfield (via the MCP
  client) extend it.
- The **multi-tenant `*.lu.computer`** hosting model (surface A, [agent-backend.md §7](./agent-backend.md)) is
  the scale path for customer sites; the deploy adapter starts repo-per-project.

## 6. The v0 loop (shortest end-to-end)

The v0 provisioning choices + backend activation (§2.1–3) + the product UI (§3) = a real loop: **you tell Lu
"build my site" in the dock → an engineering Task appears → the Engineer scaffolds it in a sandbox with the
coding agent → opens a Vercel preview → the preview + PR diff show on your canvas → you hit Publish → it's live
at a URL.** That's the whole thesis, real. The terminal (§4) and multi-tenant hosting (§5) follow.

## 7. v0 choices

- **GitHub home:** the `gh` user for v0; a Lu GitHub App/org for v1.
- **Async model:** a background task in `apps/api` writing Store progress.
- **Hosting:** repo-per-Vercel-project (surface B) for v0; multi-tenant later.
- **Hero image:** default to `gpt-image-1`; Flux/Higgsfield later.
- **Invoke path:** the Lu dock chat → the real orchestrator.
- **Template:** scaffold from an empty repo (no template dependency).
