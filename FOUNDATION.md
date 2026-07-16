# Lu Computer — Foundation

The system spec of record: vision → architecture → the agents → the data → the surfaces. If a decision
about how Lu Computer is built lives anywhere, it lives here. (The *why* is [MANIFESTO.md](./MANIFESTO.md);
the *what next* is [ROADMAP.md](./ROADMAP.md); deep specs live in [`docs/`](./docs/).)

## 1. The shape (what the owner experiences)

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

## 3. Lu the orchestrator + the department model

**Lu** is the conductor. Given a goal ("build my site, chase invoices"), Lu decomposes it into **Tasks**
and routes each to the right **department** — it does not do the work itself. Lu also asks the owner
clarifying questions and reports back like a chief of staff.

**Departments** are the fixed set of company functions; each is (agent + space + tasks + memory + tools).
v0 provisions **Engineering only** (active, with a real agent); the rest exist as the roadmap.

## 4. The agent runtime (how any agent works)

Every agent is a **`generateText` tool-loop** (Vercel AI SDK v6): a system prompt (its identity/contract),
a set of `tool()` definitions with deterministic, port-backed bodies, and `stopWhen: stepCountIs(N)`. The
model is chosen per-role via the **model gateway** (`packages/core/models.ts` — multi-provider: Anthropic /
OpenAI / Google for text, plus image models). Agents read/write through the **`Store` port**
(`apps/api/src/store/`, backed by Prisma in prod / in-memory for tests) — never the DB directly.

## 5. The Engineering agent (the flagship)

The Engineer turns "build me X" into a deployed thing. It runs **async** (`POST /api/engineering` returns
`202 {taskId}` and works in the background, writing progress to the Store) and drives four **ports**:

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

## 7. Hosting

- **The app** (`apps/web`) → Vercel; **the api** (`apps/api`) → Railway; **the DB** → Supabase Postgres.
- **Sites the Engineer builds** → **repo-per-Vercel-project** (v0), served at `{slug}.lu.computer` (wildcard
  DNS on the Vercel team). A **multi-tenant `*.lu.computer`** model (one project, many tenants) is the
  scale path (see the roadmap) — not built yet.

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
