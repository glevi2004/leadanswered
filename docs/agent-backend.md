# Lu Computer — the agent backend

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md).

How Lu orchestrates department agents: the runtime, the data model, the Engineering agent, sites/hosting,
and how onboarding wires it all together. Lu is the conductor; each **department** is an agent with a space,
tasks, memory, and tools; the canvas is a **live view over real `Agent`/`Task`/`Artifact` rows**.

## 1. Architecture (one diagram)

```
                 ┌─────────────── apps/web (Vercel) — the canvas is a LIVE VIEW ───────────────┐
   you  ⇄  Lu dock ─────────────► POST /api/lu (orchestrator)      Tasks/Artifacts (poll/realtime)
                 └──────────────────────────────┬──────────────────────────────▲────────────────┘
                                                │ dispatch                      │ read
   apps/api (Railway) ── Lu orchestrator agent ─┤                               │
     • plans, asks (ask_user), delegates        │                     Postgres/Supabase (Prisma)
     • department agents (AI-SDK tool-loops):    ▼                      Organization · Department
        Engineering(flagship) Support Finance   async background runs    Agent · Task · Artifact
        Sales Marketing Design Operations Legal  • long tasks → Store     Site · Deployment · Context
                                             • Engineering → SANDBOX      GithubConnection · Approval
                                                    │
                              ┌─────────────────────┴──────────────────────┐
                              ▼                                             ▼
                     Sandbox (e2b) w/ a headless coding agent        GitHub + Vercel API
                     clones repo, edits, tests                       PR + preview URL, publish
```

## 2. Data model — the agent-OS tables (`packages/db/prisma/schema.prisma`)

All org-scoped and additive (scalar `orgId`, no FK to `Organization`, so they compose freely):

- **Department** — `orgId`, `key` (the fixed set: engineering/support/finance/sales/marketing/design/
  operations/legal), `status` (`active | in_development`, per-org), `context` (Json/text: facts + policy slice).
- **Agent** — `orgId`, `departmentKey`, `name`, `role`, `contract` (markdown — the identity file, §5a; subsumes
  voice/boundaries/context), `models` (reasoning + generation model ids — on-the-fly, §5b), `status`
  (idle/working). A default agent per active department, plus custom agents via ＋New Agent. **ContractRevision**
  — versioned history (diff/revert).
- **Task** — `orgId`, `departmentKey`, `agentId`, `title`, `body`, `status`
  (`agent_can_do | needs_input | needs_earlier | in_progress | needs_approval | done | failed`),
  `parentTaskId` (Lu's decomposition), `input`/`result` Json, `model` (per-task override), `assignedBy`
  (lu|user), timestamps. Roadmap steps *are* tasks with ordering + `needs_earlier`.
- **Artifact** — `orgId`, `taskId`, `agentId`, `kind` (`file | image | site_preview | pr_diff | doc |
  agent_session | invoice | post`), `title`, `payload` (url/json/text), `createdAt`. Powers the dock's
  Artifacts nav (browser = site_preview, images, publish-to-preview, PR diff, agent interaction = agent_session).
- **Site** — `orgId`, `departmentKey`, `repoFullName`, `vercelProjectId`, `domain` (`{slug}.lu.computer`),
  `status`. **Deployment** — `siteId`, `env` (preview/production), `url`, `sha`, `prNumber`, `status`.
- **Session** — the sandbox/terminal: `sandboxId`, `agentKind`, `repo`, `status`.
- **GithubConnection** — `orgId`, `installationId`, `login`, `repos[]`. (A Vercel connection is a Lu-owned
  team for v0.)
- **Approval** — the human-in-the-loop gate: `orgId`, `taskId`, `action`, `status`, `decidedBy`. Feeds
  "Needs you".
- **CanvasNode** / **Edge** / **Collection** — the canvas layer (see [canvas-tools.md](./canvas-tools.md)).

Agents read/write only through the **`Store` port** (`apps/api/src/store/`, `PrismaStore` in prod /
`MemoryStore` for tests) — never the DB directly. Web reads via `@supabase/ssr`.

## 3. The agent runtime

- **Every department agent is an AI-SDK tool-loop** (Vercel AI SDK v6): a system prompt (its identity/
  contract), a set of `tool()` definitions with deterministic, port-backed bodies, and
  `stopWhen: stepCountIs(N)`. The discipline is fixed: **the model chooses the tool; business logic and the
  authoritative result live in code.** Each department's tools are its real actions — Finance:
  `create_invoice` / `send_payment_link` / `chase_overdue`; Marketing: `draft_post` / `build_site` /
  `run_review_wave`; Engineering: the build pipeline (§6).
- **Long-running tasks run async.** A department task (especially an Engineering build) runs as background
  work in `apps/api`, writing `Task.status` + `Artifact` rows as it goes; the web shows a **live task tracker**
  by reading those rows (polling now, Supabase Realtime later) — this is the dock's Tasks panel and the roadmap.
- **Lu the orchestrator** is a planning agent in `apps/api` on a stronger model (Sonnet/Opus) with tools:
  `ask_user` (renders as a question in the Lu dock), `create_task`, `assign_to_department`, `get_status`,
  `summarize`. Given a goal ("build my marketing site"), Lu decomposes → tasks → assigns → reports back like a
  chief of staff. The web `/api/lu` calls this orchestrator.
- **Model tiering:** orchestrator + Engineering coding = Sonnet/Opus; routine department turns = Haiku (cost).

## 4. Approvals / human-in-the-loop

Any task whose boundaries mark an action risky or outward-facing (publish a site, merge a PR, send an email,
charge a card) creates an **Approval** and sets `Task.status = needs_approval` → surfaces as a **"Needs you"**
row in the dock. When the owner approves (`POST /api/approvals/:id/resolve`), the gated tool actually executes.
Approval routing is by role: money/publish → the owner; lighter actions can be delegated. Staged and legible
by design.

## 5. Context / memory (the moat)

- **Company root context** (Company tab) + **per-department context** (`Department.context`) — facts + policy.
  Every setup conversation and correction writes to the right level.
- Context flows downstream: onboarding scrape + interview → company context → each department's context →
  injected into that agent's system prompt (`packages/core/prompt.ts::assembleAgentSystemPrompt`).
- v0 memory = these context records + task/artifact history in Postgres, retrieved per turn. A vector store is
  a later upgrade (§5c), not required for v1.

### 5a. The agent CONTRACT — its identity file

Instead of scattering an agent's config across `boundaries`/`voice`/`context` JSON, **each agent is a
`CONTRACT.md`** — one human-readable, editable markdown file that defines it and compiles into its system
prompt. It's the agent's **employment contract** (fits the "New Agent — an employee you give tasks to"
framing): what it's hired to do, its boundaries, its voice, what it knows, how it thinks. This is deliberately
**distinct from `AGENTS.md`** — the repo-instruction standard (Cursor/Codex/Claude Code read it): the
Engineering agent, working in a repo, reads that repo's `AGENTS.md` (*how this codebase works*) while its own
CONTRACT is *who it is*. They compose.

**Template** — keep it **< ~150 lines** (longer hurts answer quality and costs), boundaries as three tiers
(**Always / Ask-first / Never**):

```markdown
# {Agent Name} — {Department}  {pixel avatar}
## Role         one line: what I'm hired to do + the outcome I own
## Duties       the work that lands in my Tasks
## Boundaries   Always do · Ask first (→ approval) · Never do      ← three-tier
## Voice        tone + personality
## Knowledge    business facts + policy I operate under (the context — the moat)
## Playbooks    how I do the recurring things, this business's way
## Models       my reasoning model + my generation models + why (§5b)
```

**Lifecycle:** **drafted** by Lu at hire (onboarding / ＋New Agent) from the interview + the scrape →
**editable** two ways (a dock markdown editor, or conversationally — "Lu, tell Finance to always offer Pix"
writes the right section) → **versioned** (`ContractRevision`: diff/revert how its identity evolved) →
**compiled** into the system prompt where `assembleAgentSystemPrompt` injects persona + hard rules →
**self-tuning** later (the agent proposes edits after learning; the owner approves). Two levels: a **company
contract** (root code of conduct, Company tab) every agent inherits + each agent's own. Storage:
`Agent.contract` + `ContractRevision`; for Engineering, the contract is also committed into the repo so the
sandbox reads it.

### 5b. The model layer — any provider, any modality, on the fly

The runtime is provider-agnostic behind a **model gateway** (`packages/core/models.ts`): a registry + router
spanning every provider and modality, not a hardcoded model. Two axes:

- **Reasoning (the agent's brain) — any provider.** Anthropic (Claude), OpenAI (GPT), Google (Gemini), and any
  AI-SDK provider, swappable per agent (`ai` v6 + `@ai-sdk/{anthropic,openai,google}`).
- **Generation (the agent's hands) — any modality.** Agents produce assets, not just text:
  - **Image** — website **hero image**, logo, social graphics: OpenAI `gpt-image-1`, Black-Forest **Flux**,
    Ideogram, and the connected **Higgsfield MCP** (`generate_image` / `create_website`). Via AI SDK
    `generateImage` + MCP. Marketing/Design/Engineering call a `generate_image(model, prompt)` tool whose image
    model is itself chosen + recommended (photoreal hero → Flux/gpt-image; pixel/stylized brand → Higgsfield).
  - **Video / audio** — later (Higgsfield does both) for reels + voiceover.
- **Where the choice lives:** an agent's reasoning model + preferred generation models are the CONTRACT's
  `## Models` section, surfaced as **pickers in the Agent panel** — change on the fly, next turn/task uses it,
  no restart. A **per-task override** (`Task.model`) lets Lu bump a hard build to Opus, or swap the image model
  for one asset. Registry metadata per model: provider · modality · tier · speed · cost · best-for.
- **Recommendations, two layers:** (1) a **static role/modality map** (coding → Opus/Sonnet; routine turns →
  Haiku; hero image → Flux/gpt-image; pixel brand → Higgsfield) shown as a **"Recommended"** badge + one-line
  rationale in the picker; (2) **Lu-driven** — she suggests + auto-escalates per task via a `recommend_model`
  tool ("this hero needs photoreal — I'll use Flux"; "sites come out better on Opus — switch your Engineer?").
- **Routing:** the gateway can cost/latency-route (cheap model first, escalate on low confidence/failure) and
  fall back across providers on rate-limit/outage — all behind the picker. The owner sees simple speed/quality/
  cost hints, never a spend dashboard.

### 5c. State-of-the-art foundations (first-class from day one)

- **Streaming everywhere.** Stream the agent's tokens + tool-calls + artifact updates live to the dock
  (`streamText` + Supabase Realtime / SSE on Task/Artifact rows) — the live task tracker feels alive, not polled.
- **MCP-native.** Agents are **MCP clients** — a department mounts the owner's real tools (Slack, Notion,
  GitHub, Gmail, their CRM) with zero bespoke connectors; and **Lu is an MCP server** — the business is operable
  from Claude/ChatGPT. Capability compounds without hand-coding every integration.
- **Layered memory.** Working (this task's scratchpad) · episodic (task/artifact history) · semantic (the
  CONTRACT + Context + a **vector store** over the business's docs/messages), grounded in Postgres + embeddings.
- **Observability + evals.** Langfuse is wired (`experimental_telemetry`) across every agent + the orchestrator;
  **evals as quality gates** — an LLM-as-judge scores an agent's output (a drafted invoice, a built page) before
  a human sees it; regressions caught in CI.
- **Guardrails + isolation.** Boundaries (Always/Ask/Never) + Approvals are the *behavioral* guardrail;
  **sandbox isolation** (§6) + **capability-scoped tokens** (a GitHub token scoped to one repo, a Vercel token
  scoped to one project) are the *blast-radius* guardrail. Every action lands in the org activity log.
- **Deterministic tools + idempotency.** Business logic in code, result authoritative, idempotency keys — so
  retries and duplicate events never double-charge or double-post.
- **Agent-to-agent orchestration.** Lu→department delegation is A2A; each agent exposes a capability summary (an
  "agent card") so Lu + the Library can discover and route — a clean seam for future third-party agents.

## 6. The Engineering agent (the flagship)

The Engineer turns "build me X" into a deployed thing: it inspects a repo, spins a sandbox, opens a PR with a
preview link, and publishes the approved change to production — real infra work.

**Runtime = a headless coding agent in a sandbox.** A state-of-the-art coding agent (Claude Code / Codex,
headless) runs inside an ephemeral **e2b sandbox**. A background Engineering run spawns the sandbox per task,
mounts the repo, runs the coding agent with the task prompt + department context, and streams its transcript
into an `agent_session` Artifact.

**Rung v0 — "build your site" (Lu owns the repo).** Delivers the first promise without the owner having a repo:

1. `create_site(preset, brand, context)` → create a repo from a **starter template** in a Lu-owned GitHub home,
   clone into the sandbox.
2. The coding agent edits the template to the business (copy from context, brand kit, sections) + runs
   `build`/tests. Hero/brand images via the image models (§5b) or the Higgsfield MCP.
3. Push branch → open **PR** → **Vercel** builds a **preview deployment** → store the preview URL + PR diff as
   Artifacts. Task → `needs_approval`.
4. The owner clicks **Publish** → merge PR → Vercel production deploy → **Site.domain = `{slug}.lu.computer`**
   (Vercel Domains API + the wildcard `*.lu.computer`). Site live.

**Rung v1 — "connect your GitHub" (the owner's repo).**

1. **GitHub App install** → `GithubConnection{installationId}`; a scoped installation token clones/branches/PRs
   the owner's chosen repo.
2. The sandbox clones the repo → the coding agent inspects structure/deps, makes the change, runs their tests →
   PR → their Vercel (or ours) builds a preview → same approve→merge.

v0 ships the wedge promise while exercising the whole pipeline (sandbox, Git, Vercel, artifacts, approvals) on a
repo Lu controls; v1 flips one input (their repo) and reuses everything.

**The cloud terminal** is the interactive door to the same runtime: a websocket (`/api/terminal`) bridges an
e2b **pty** to an **xterm.js** node on the canvas — the owner watches and types into a real coding session. See
[canvas-tools.md §4](./canvas-tools.md) and [engineering-agent.md](./engineering-agent.md) for the build spec.

## 7. Sites / hosting — two models

Owners never touch Vercel or GitHub — Lu hosts everything (the site-builder norm). Two distinct surfaces:

**(A) Customer marketing/booking SITES = a multi-tenant site app (Vercel for Platforms).** ONE Vercel project
holds the `*.lu.computer` wildcard + up to 100k domains — **no per-tenant project/Vercel object**. Each tenant's
site renders **from the DB** (pages/theme/content as data); middleware routes `{slug}.lu.computer` → that
tenant. The Marketing/Design agent edits the tenant's content + generates the hero (§5b). Wildcard SSL needs
`lu.computer` on Vercel's nameservers (one-time). **Custom domains** (the owner's own domain) are added
per-tenant via the Vercel Domains API, so a real business runs on its own domain and `*.lu.computer` is the free
default. Shared-domain hygiene: submit `lu.computer` to the **Public Suffix List** (cookie + reputation
isolation, like `*.vercel.app`) + content moderation. This is the **scale path** for customer sites, not yet
built (see [ROADMAP.md](../ROADMAP.md)).

**(B) The Engineering agent's real CODING = repo + sandbox + Vercel deploy** (§6). For actual software/tools +
**dogfooding Lu's own product** — and it *builds* surface (A). v0 hosts each built site **repo-per-Vercel-
project**. Technical owners with an existing repo use the v1 connect-your-GitHub path (their repo, their Vercel,
their domain).

## 8. Onboarding wiring

Onboarding is the provisioning step (see [onboarding.md](./onboarding.md)):

1. **The scrape is real** — fetch the given site/socials, LLM-summarize into a voice + business profile (feeds
   context).
2. **Lu interviews** (real `ask_user`) to confirm the business.
3. **Provision for real:** create a **DB Organization**, instantiate **Department + Agent** rows (Engineering
   active + agent; the rest as roadmap), and **seed each `Department.context`** from the interview + scrape.
4. **First outcome live:** kick the Engineering agent's `create_site` so onboarding can end with
   `{slug}.lu.computer` actually live.
5. Drop onto the **canvas**, backed by real Agent/Task rows — the departments show real status. `graph.ts` reads
   the org's Department/Agent rows.

## 9. The other departments (sequenced)

Each new department follows the Engineer's pattern (agent + contract + tools + tables + a canvas space).
Priority order lives in [ROADMAP.md](../ROADMAP.md); in brief:

- **Support** — a department agent that answers the owner's customers, and owns the **text/phone door**: the SMS
  runtime is reused so the owner reaches Lu by text and Lu orchestrates the agents (an inversion of the old
  "assistant answers your customers").
- **Operations** — scheduling/availability + travel-routing + calendar; the Ops agent wraps the scheduler.
- **Sales** — a customer/CRM entity + import → the Sales agent qualifies/quotes/chases. Tables: Customer, Quote.
- **Finance** — Quote + Invoice + **pluggable payment rails**; the Finance agent invoices/charges/collects;
  webhook → auto-reconcile → follow-ups stop.
- **Marketing** — review-reactivation campaigns + content (blog/social) + sites (via §7). The Marketing agent
  runs review waves, drafts posts, builds pages.
- **Engineering** — §6 (built first as the flagship + the site pipeline everyone reuses).
- **Design** — brand kit + generated assets (image models / Higgsfield MCP) feeding Marketing/Engineering.
- **Legal** — lightest; contract/doc drafting + e-sign later.

## 10. Conventions (locked)

- **Sandbox = e2b** (ephemeral cloud sandbox) — behind a `Sandbox` port so Daytona/Fly are swappable.
- **Coding agent = the owner's choice: Claude Code or Codex** (both preinstalled in the sandbox) + plain shell.
- **Repo ownership = Lu-owned repos first** (v0 "build your site"); connect-your-GitHub is v1.
- **Hosting = Vercel, two models (§7):** customer sites = one multi-tenant "Vercel for Platforms" project (scale
  path); real software + dogfooding = repo-per-project. Owners never touch Vercel.
- **Onboarding = a real DB org** (Supabase/Prisma write + invite-gated auth), not a cookie handoff.
- **Model registry (§5b) = Anthropic + OpenAI + Google** (reasoning) · **gpt-image / Flux / Higgsfield** (image);
  default per role/modality; Lu auto-escalates the model per hard task.
- **Agent config = the CONTRACT (§5a)**: `Agent.contract` + `ContractRevision`, company-root + per-agent;
  committed into the Engineering repo.
- **Build order = the Engineering agent first, and dogfood it** to build the other departments (see
  [engineering-agent.md](./engineering-agent.md)). Don't build a department ahead of a partner pulling for it.
