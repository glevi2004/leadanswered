# Lu Computer — Roadmap

A living, undated map — order, not dates. (Why: [MANIFESTO.md](./MANIFESTO.md) · How:
[FOUNDATION.md](./FOUNDATION.md).)

## Shipped — live in prod

- **The agent-OS backbone** — schema, the model gateway, the `Store` port, and **Lu the orchestrator**
  (a goal → real `Task` rows routed to agents).
- **Onboarding** — waitlist-gated self-serve; the owner boots their company; provisions Engineering.
- **The canvas (home)** — Lu + agents; hand-tool default; terminal / text / draw / md tools; live
  site-preview nodes.
- **The Engineering agent, end-to-end** — async runs, the build pipeline, a **Publish** approval gate; the
  dock watches real tasks/artifacts.
- **The cloud terminal** — an e2b pty bridged to an xterm.js node on the canvas.
- **Infra** — Git via Octokit/PAT; `gpt-image-1` hero images; web on Vercel, api on Railway.

## Next — the last mile of the Engineer

- **GitHub App / `GITHUB_TOKEN`** → real end-to-end builds.
- **Deploy into the customer's own accounts** — OAuth their GitHub + Vercel + Supabase and provision the
  repo/project/DB in *their* accounts (BYO — [FOUNDATION §7](./FOUNDATION.md)).
- **The durable agent-run worker** *(the key scale item)* — move runs off the in-process background onto a
  durable-execution engine (Trigger.dev / Inngest) so overnight work survives redeploys, resumes, and
  waits for approval. What makes "work while you sleep" real at scale.
- **The `site` canvas tool** + **CanvasNode persistence**.

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

- **Branding** — ~59 hardcoded "Sarah" strings → `assistantName`; `leadanswered.com` in env/cookies;
  the `/sarah` route; the Apex Roofing demo fixtures; the repo directory name.
- **Landing content** — the marketing site + blogs still carry old-product positioning; a rewrite pass.

## The operating principle

**Ship one department fully, then dogfood it to build the next.** The company assembles itself around the
owner — that's the product and the build strategy at once.
