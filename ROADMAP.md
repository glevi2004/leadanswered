# Lu Computer — Roadmap

A living, undated map of what's built and what's next. Order, not dates. (The *why*:
[MANIFESTO.md](./MANIFESTO.md). The *how*: [FOUNDATION.md](./FOUNDATION.md).)

## Shipped — live in prod

- **The agent-OS backbone** — schema, the multi-provider model gateway, the `Store` port, and **Lu the
  orchestrator** (a goal → real `Task` rows routed to departments).
- **Onboarding** — waitlist-gated self-serve; the owner boots up their company; provisions the Engineering
  department + agent.
- **The canvas (home)** — Lu + the real departments; hand-tool default; the terminal / text / draw / md
  tools; live **site-preview nodes**.
- **The Engineering agent, end-to-end** — async runs (dispatch → background), the pipeline (create repo →
  coding agent in a sandbox → preview → publish gate); the dock **watches** real tasks/artifacts and has a
  **Publish** button (→ `confirmPublish`).
- **The cloud terminal** — an e2b pty bridged to an xterm.js node on the canvas (real Claude Code / shell).
- **Infra** — Git via Octokit/PAT (Railway-safe); `gpt-image-1` hero images; web on Vercel, api on Railway.

## Next — the last mile of the Engineer

- **`GITHUB_TOKEN` on Railway** → real end-to-end site builds (the single infra gate left).
- **The `site` canvas tool** — create a site from the canvas → dispatch the Engineer.
- **CanvasNode persistence** — canvas elements (terminal/text/draw/md/site) persist to the DB; today they're
  local-only.
- A **starter template** (or scaffold-from-empty) + a prebuilt **e2b template** with the coding CLIs cached
  (speed).

## The department buildout — the rest of the company

Each new department follows the Engineer's pattern (agent + contract + tools + a canvas space + tasks). In
rough priority:

- **Support** — answer the owner's customers, rebuilt as an agent (including the new SMS/phone door: **Lu
  answers the *owner* by text and orchestrates the agents**, an inversion of the old "assistant answers
  your customers").
- **Finance** — invoicing, chasing money, reporting.
- **Sales · Marketing · Design · Operations · Legal** — in turn.

**Dogfood:** use the Engineering agent itself to help build each next department.

## Channels, orchestration & presets — the computer, filled out

**Channels (real I/O):**
- **The phone** — a real SMS/voice number: text or call Lu, Lu texts back and orchestrates (the owner's
  door). Then Support answers customers on the same line.
- **The inbox** — a real email address the computer sends and receives on: email it a task; its agents
  email your customers.
- **Slack** — connect Lu to your workspace: drive it from where you already work, and agents post updates
  and ask for approvals there.

**Composable, multi-model orchestration** (Maestri-in-the-cloud):
- **Any model per agent** — add **xAI/Grok** (and others) to the gateway; pick the model per agent (Grok
  CFO, Claude Engineer).
- **Agents orchestrate agents** — a `spawn_agent` / delegate tool + attach-and-drive-a-terminal (an agent
  on the pty write-end), wired as canvas **edges** (the who-conducts-whom graph).

**Presets:**
- **Beyond Business** — **Studio/Dev** (coding-agent fleet; our dogfood + the Cursor-competitor),
  **Personal**, **Custom**.
- **The preset Library** — presets (agents, spaces, roadmaps) become installable and shareable.

## Platform maturation

- **Durable agent-run worker** *(the key scale item)* — move runs off the in-process background onto a
  queue / durable-execution engine (Trigger.dev / Inngest; Temporal if heavy) so overnight work survives
  redeploys and crashes, resumes, and waits for approval. What makes "work while you sleep" real at scale.

- **Multi-tenant hosting** — `*.lu.computer` via Vercel-for-Platforms (one project, many tenants) for
  customer sites at scale, replacing the v0 repo-per-project model.
- **GitHub App** — installation tokens + a Lu-owned org, replacing the PAT.
- **Realtime** the canvas + dock (Supabase Realtime) — live progress without polling.
- **Agent memory + library** — layered memory + per-agent collections (RAG).
- **On-the-fly model choice** + recommendations, per agent / per task.

## Debt to clear ("we'll get there")

- **Branding** — ~59 hardcoded "Sarah" strings → `assistantName`; the `sarahName` default; `leadanswered.com`
  in env/cookies/page titles; the `/sarah` route; the Apex Roofing demo fixtures; the repo directory name.
- **Landing content** — the marketing site + blogs still carry old-product / "Sarah" positioning; it's
  published SEO, so a deliberate rewrite pass, not a delete.

## The operating principle

**Ship one department fully, then dogfood it to build the next.** The company assembles itself around the
owner — that's the product and the build strategy at once.
