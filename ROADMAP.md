# Lu Computer — Roadmap

A living, undated map — order, not dates. This doc owns the **product** order (departments, channels,
presets); the **infrastructure** order is owned by [docs/harness-spec.md](./docs/harness-spec.md) (phases
P0→P4, with checkboxes). (Theory: [paper.md](./paper.md) · Why: [MANIFESTO.md](./MANIFESTO.md) · How:
[FOUNDATION.md](./FOUNDATION.md) · Live status: [DEVELOPMENT.md](./DEVELOPMENT.md) · How we build agents:
[docs/building-agents.md](./docs/building-agents.md).)

## Shipped — live in prod

- **The agent-OS backbone** — schema, the model gateway, the `Store` port, and **Lu the orchestrator**
  (a goal → real `Task` rows routed to agents, incl. `dispatch_to_engineering` agent→agent).
- **Onboarding** — waitlist-gated self-serve; the owner boots their company; provisions Engineering.
- **The canvas (home)** — Lu + agents; hand-tool default; terminal / text / draw / md tools; live
  site-preview nodes; **nodes / edges / positions persist to the DB** (`CanvasNode`/`Edge`/`Collection`).
- **The Engineering agent, end-to-end** — async runs, the build pipeline, a **Publish** approval gate; the
  dock watches real tasks/artifacts. *(How it's built: [docs/building-agents.md](./docs/building-agents.md).)*
- **The durable worker** — BullMQ (`worker.ts`/`queue.ts`); runs in-process today, **crash-safe once
  `REDIS_URL` is set** — what makes "work while you sleep" real at scale.
- **BYO connect (token-paste)** — each org connects its own GitHub + Vercel + Supabase; verified + encrypted
  at rest; the Engineer builds into *their* accounts ([docs/byo-connect.md](./docs/byo-connect.md)).
- **The cloud terminal** — an e2b pty bridged to an xterm.js node on the canvas.
- **The plan gate + acceptance verification** *(2026-07-17)* — Lu plans first; the owner approves the plan
  before any build; `verify_acceptance` judges the build against the plan's criteria before publish.
- **Onboarding v2 + the skill system** *(2026-07-17)* — static sign-up, then Lu onboards you in-workspace
  (decision cards → Business Plan → activate departments), powered by the general skill system.
- **Metering + memory** — usage events + buckets; working/core memory + sleep-time consolidation
  *(consolidation activates with Redis — [harness-spec](./docs/harness-spec.md))*.
- **Infra** — Git via Octokit/PAT; `gpt-image-1` hero images; web on Vercel, api on Railway.

## Next — the last mile of the Engineer

The ordered infra items live in **[harness-spec.md](./docs/harness-spec.md) §6** (P0: publish code-gate ·
`REDIS_URL` on · terminal key-leak fix; then empirical verification, GitHub App tokens, …) and the
product-reliability items in **[DEVELOPMENT.md](./DEVELOPMENT.md) §4** (the critical path: api auth, public
starter template, real domains, wider preview poll). Between them: any owner builds a website, reliably —
then one-click OAuth connect ([byo-connect.md](./docs/byo-connect.md) Phase 2) makes it sing.

## The department buildout — the rest of the company

Each new department follows the Engineer's pattern (agent + contract + tools + space + tasks):

- **Support** — answer the owner's customers, including the SMS/phone door (**Lu answers the owner by text
  and orchestrates**).
- **Finance** — invoicing, chasing money, reporting.
- **Sales · Marketing · Design · Operations · Legal** — in turn.

**Dogfood:** use the Engineer itself to help build each next department.

## Channels, orchestration & presets

- **Channels** — **the phone** (SMS/voice; text Lu, Lu orchestrates), **the inbox** (email in + out), and
  **Slack** (drive Lu from your workspace; agents post updates + ask approvals there).
- **Composable, multi-model orchestration** — any model per agent (**add xAI/Grok** to the gateway);
  **agents orchestrate agents** (a `spawn_agent` / delegate tool + attach-and-drive-a-terminal), wired as
  canvas **edges**.
- **Presets** — **Studio/Dev**, **Personal**, **Custom**; the **preset Library** (installable + shareable).

## Platform maturation

- **Realtime** the canvas + dock (Supabase Realtime) — live progress without polling.
- **Agent memory + library** — layered memory + per-agent collections (RAG).
- **Managed hosting** *(the destination)* — an optional **Lu-managed + metered** hosting tier (we front
  the infra, bill via usage — the cofounder model), once metering + volume justify it. Until then: BYO.

## Debt to clear

The full branding-debt register is **canonical in [docs/design-system.md](./docs/design-system.md) §5**
(Sarah→Lu, `@leadanswered/*`, `leadanswered.com`, the `/sarah` route, the Apex fixtures). In brief: the
code-level rename + the old-product **landing content** rewrite (the pre-pivot drafts now live in
[archive/pre-pivot/](./archive/pre-pivot/)). Status per item: [DEVELOPMENT.md](./DEVELOPMENT.md) §"Debt & cleanup".

## The operating principle

**Ship one department fully, then dogfood it to build the next.** The company assembles itself around the
owner — that's the product and the build strategy at once.
