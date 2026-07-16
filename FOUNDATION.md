# Lu Computer — Foundation

The system spec of record: vision → architecture → the agents → the data → the surfaces. If a decision
about how Lu Computer is built lives anywhere, it lives here. (The *why* is [MANIFESTO.md](./MANIFESTO.md);
the *money* is [BUSINESS.md](./BUSINESS.md); the *what next* is [ROADMAP.md](./ROADMAP.md); deep specs
live in [`docs/`](./docs/).)

## 1. The shape (what the owner experiences)

Lu Computer is a real computer for AI agents, and it puts together three things: **a body** (real
faculties + channels — a **screen**/the canvas, a **shell**/the cloud terminal, a **filesystem**/the
Library + Context, and real I/O: a **phone**, an **inbox**, and **Slack**), **a cloud that never sleeps**
(durable runs that work overnight, resume, and wait for approval — §4), and **a composable mind**
(multi-model agents that spawn and orchestrate each other — §3). Programs are agents; distros are presets;
permissions are approvals. Screen, shell, agents, and approvals are live today; phone, email, and Slack
are I/O channels on the roadmap. The kernel is general; **presets** boot it for a use — **Business**
(departments; the front door and the only preset provisioned in v0), **Studio/Dev**, **Personal**,
**Custom**.

1. **Boot up** — a waitlist-gated, self-serve **onboarding**: the owner meets Lu, describes their
   business, and their **company boots** — departments assemble, the Engineer comes online.
2. **The canvas is home** — a flat, pannable plane with **Lu at the center** and **department agents** on
   a ring around it. This is the operating surface; the owner watches work happen here, not across tabs.
3. **The Lu dock** — a chat/command surface (right side): talk to Lu, watch tasks stream, approve things.
4. **Departments** — each is an agent with a space, tasks, memory, and tools. **Engineering is live** (the
   flagship); the rest come online over time.

## 2. Architecture (the stack)

Monorepo under `platform/` (pnpm workspace):

| Package | Role | Runs on |
|---|---|---|
| `apps/web` | Next.js app — onboarding, the canvas, the dock, department surfaces | **Vercel** (project `leadanswered-web`) |
| `apps/api` | Express + TS (ESM/tsx) — the agent runtime, HTTP routes, the terminal websocket | **Railway** |
| `packages/db` | Prisma 7 schema + client → **Postgres (Supabase)** | — |
| `packages/core` | Shared: the multi-provider model gateway | — |
| `landing-page/` | The public marketing site (Astro) | Vercel (project `leadanswered`) |

- **Auth**: Supabase Auth (cookie sessions); a session maps to an `Organization` by `ownerEmail`.
- **The web ↔ api seam**: the browser calls same-origin Next routes that proxy to `apps/api`
  (`process.env.API_PUBLIC_URL`) and resolve the session org server-side. The **cloud terminal** is the one
  exception — the browser opens a `wss://` straight to the api (`NEXT_PUBLIC_API_URL`).

## 3. Orchestration — Lu, agents that conduct agents, the department model

**Lu** is the top conductor. Given a goal ("build my site, chase invoices"), Lu decomposes it into
**Tasks** and routes each to the right **agent** — it does not do the work itself. Lu asks the owner
clarifying questions and reports back like a chief of staff.

**Orchestration is recursive.** An agent is a program you compose on the fly: it runs **any model**
(`Agent.models` — Grok as the CFO, Claude for the Engineer, via the model gateway) and can itself **spawn
and orchestrate sub-agents** (a child `Task` via `parentTaskId`) — including attaching a live **cloud
terminal** and driving its pty (the CFO points a Claude terminal and directs it). Connections are drawn on
the canvas as **`Edge`s** between **`CanvasNode`s** — the who-conducts-whom graph, Maestri-style; no
middleware, no glue. Lu conducts the top; every agent can conduct beneath it.

**Departments** are the **Business preset's** unit — the company functions, each (agent + space + tasks +
memory + tools). v0 provisions **Engineering only** (active, with a real agent); the rest of the Business
preset, and the other presets (Studio/Dev, Personal, Custom), are the roadmap.

## 4. The agent runtime (how any agent works)

Every agent is a **`generateText` tool-loop** (Vercel AI SDK v6): a system prompt (its identity/contract),
a set of `tool()` definitions with deterministic, port-backed bodies, and `stopWhen: stepCountIs(N)`. The
model is chosen per-agent via the **model gateway** (`packages/core/models.ts` — multi-provider:
Anthropic / OpenAI / Google / **xAI (Grok)** for text, plus image models). Agents read/write through the
**`Store` port** (`apps/api/src/store/`, backed by Prisma in prod / in-memory for tests) — never the DB
directly.

**Runs are async and durable.** Work is dispatched off the request path against a durable **Task** and
executed by a background **worker** — a queue / durable-execution engine (Trigger.dev / Inngest;
Temporal if we go heavy), *not* an in-process handler, so a redeploy or crash can't kill an overnight run.
For long, compute-heavy work the worker **supervises rather than executes**: the marathon (a coding agent
building for hours) runs *inside the e2b sandbox* while the worker streams progress to the Store as
**Artifacts**, parks on **Approvals** (hibernating the sandbox, not billing idle), and resumes when
resolved. This is what lets the Engineer "work while you sleep" and still scale — persistent state is
cheap DB rows, heavy compute is ephemeral + hibernated + metered. *(Today's runs are in-process background
jobs; the durable worker is the key scale item — see the roadmap.)*

## 5. The Engineering agent (the flagship)

The Engineer turns "build me X" into a deployed thing. It runs **async** (`POST /api/engineering` returns
`202 {taskId}` and dispatches to the durable worker — §4 — writing progress to the Store) and drives four
**ports**:

- **Sandbox** (`sandbox/`, e2b): spawn an isolated cloud machine, clone the repo, `exec`, stream a **pty**.
- **Git** (`git/`, Octokit + `GITHUB_TOKEN`): create repo, open/merge PR, diff. (`gh` CLI is the local
  fallback.)
- **Deploy** (`deploy/`, Vercel REST): create project, get the PR preview, promote to prod, attach a domain.
- **Model gateway** for text (coding) + image (hero generation, `gpt-image-1`).

**The build pipeline** (the tools, in order): `create_site` (repo) → `run_coding_agent` (Claude Code /
Codex in the sandbox writes the code) → `generate_image` (hero) → `open_preview` (PR → Vercel preview,
artifacts land) → `request_publish` (an **Approval** gate) → `confirmPublish` (merge → promote →
`{slug}.lu.computer`). Every step emits an **Artifact** (agent_session transcript, pr_diff, site_preview,
image) that the canvas/dock render live.

**The cloud terminal** is the interactive door to the same runtime: a websocket (`/api/terminal`) bridges
an e2b **pty** to an **xterm.js** node on the canvas — the owner watches and types into a real Claude
Code / Codex / shell session.

## 6. The data model (`packages/db`)

The agent-OS tables (all additive, scalar `orgId`, no FK to `Organization`, so they compose freely):
`Department` (`status: active|in_development`) · `Agent` (`contract`, `models`) · `ContractRevision` ·
`Task` (`status`, `parentTaskId`) · `Artifact` (`agent_session|pr_diff|site_preview|image|…`) · `Site`
(`repoFullName`, `vercelProjectId`, `domain`) · `Deployment` · `Session` (the sandbox/terminal) ·
`Approval` · `CanvasNode` / `Edge` / `Collection` (the canvas). `Organization` + Supabase auth are the
shared foundation; a `Waitlist` table gates self-serve signup.

## 7. Hosting & compute

Lu is a **cloud computer**: a web experience over orchestrated managed infra — *not* a persistent VM per
user (think Replit / Codespaces). Three layers:

- **The Lu product** — multi-tenant SaaS: `apps/web` → Vercel, `apps/api` + the durable **worker** →
  Railway (or a durable-execution host), state → Supabase Postgres. Always-on but cheap; scales like any
  SaaS. No per-user machine here.
- **Agent compute** — real machines appear only when an agent works: **ephemeral e2b sandboxes**, spun up
  per task and torn down, or **hibernated** (pause/resume) between sessions and while awaiting approval.
  Never a 24/7 box; billed only while working (the metered agent-hour).
- **What agents build** — outputs go to managed hosting: **Vercel** for sites/apps
  (**repo-per-project** in v0 → **Vercel for Platforms**, one project × many tenants under
  `*.lu.computer`, at scale) and **Supabase** (serverless functions + DB) for a built app's own backend.
  Per-app always-on containers (Fly / Cloudflare / Railway) only when something truly must be always-on.

The rule: **rent the heavy stuff (compute, hosting, DB); build only the thin orchestration glue.** The
"computer" is orchestration over managed primitives, not a datacenter.

## 8. Onboarding, auth & command

- **Signup is waitlist-gated self-serve**: join → an admin accepts → shell org + invite → set password →
  the **Lu onboarding** ("boot up your company") → `completeOnboarding` writes the org config + provisions
  the Engineering department + agent → land on the canvas.
- **You stay in command**: agents propose, and anything irreversible (publishing a site, spending money,
  merging) is gated by an **Approval** the owner resolves (`POST /api/approvals/:id/resolve` →
  `confirmPublish`). Staged and legible by design.

## 9. Locked conventions

- Vocabulary is **vertical-neutral**: the tenant is an **Organization**, the person is the **owner**. Never
  reintroduce contractor/roofer/homeowner/lead framing.
- The assistant is **Lu**. (Legacy code still carries a `Sarah`/`sarahName` default and `leadanswered.com`
  strings — those are branding debt to clear, tracked in the roadmap, not the design.)
- Agents talk to the world only through **ports**; agents talk to data only through the **Store**.
- Additive migrations only against prod; dev-validate first (a local Docker Postgres).
