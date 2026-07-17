# Lu Computer — the agent backend (reference)

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md). This is the backend **reference**
> (the tables · the model gateway · context/memory · hosting). For **how we build & run agents** — the loop,
> ports, the Engineer, durability, and the recipe for adding an agent — see the handbook:
> **[building-agents.md](./building-agents.md)**. Live status: [DEVELOPMENT.md](../DEVELOPMENT.md).

How Lu orchestrates department agents: the runtime, the data model, the Engineering agent, sites/hosting,
and how onboarding wires it all together. Lu is the conductor; each **department** is an agent with a space,
tasks, memory, and tools; the canvas is a **live view over real `Agent`/`Task`/`Artifact` rows**.
**Departments** are the unit of the **Business preset** — the v0 front door and the only preset provisioned
now; the kernel is general, and the other presets (Studio/Dev, Personal, Custom) are on the
[roadmap](../ROADMAP.md) (see [FOUNDATION.md](../FOUNDATION.md)).

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
  `parentTaskId` (the decomposition tree — Lu's, or **any agent orchestrating its own sub-agents**; §3),
  `input`/`result` Json, `model` (per-task override), `assignedBy` (lu|user|agent), timestamps. Roadmap
  steps *are* tasks with ordering + `needs_earlier`.
- **Artifact** — `orgId`, `taskId`, `agentId`, `kind` (`file | image | site_preview | pr_diff | doc |
  agent_session | invoice | post`), `title`, `payload` (url/json/text), `createdAt`. Powers the dock's
  Artifacts nav (browser = site_preview, images, publish-to-preview, PR diff, agent interaction = agent_session).
- **Site** — `orgId`, `departmentKey`, `repoFullName`, `vercelProjectId` (in the **owner's own** Vercel — BYO,
  §7), `domain` (the owner's own domain, or the free `{slug}.lu.computer` default), `status`. **Deployment** —
  `siteId`, `env` (preview/production), `url`, `sha`, `prNumber`, `status`.
- **Session** — the sandbox/terminal: `sandboxId`, `agentKind`, `repo`, `status`.
- **GithubConnection** — `orgId`, `installationId`, `login`, `repos[]` — the **owner's own** GitHub, OAuthed /
  App-installed by Lu (BYO, §7). (A Vercel connection is likewise the owner's own team via OAuth; a Lu-owned team
  is only a v0 demo fallback.)
- **Approval** — the human-in-the-loop gate: `orgId`, `taskId`, `action`, `status`, `decidedBy`. Feeds
  "Needs you".
- **CanvasNode** / **Edge** / **Collection** — the canvas layer (see [canvas.md](./canvas.md)).

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
  *The **durable worker** is **built** (BullMQ — `worker.ts`/`queue.ts`); it runs in-process until
  `REDIS_URL` activates crash-safe re-delivery. The durability model + implementation is in the handbook:
  [building-agents.md §6](./building-agents.md).*
- **Lu the orchestrator** is a planning agent in `apps/api` on a stronger model (Sonnet) with tools:
  `create_task`, `assign_to_department`, `check_connections`, `dispatch_to_engineering` (agent→agent),
  `list_status`, `ask_user` (renders as a question in the Lu dock). Given a goal ("build my marketing site"),
  Lu decomposes → tasks → dispatches → reports back like a chief of staff. The web `/api/lu` calls it.
- **Orchestration is recursive + multi-model.** Lu conducts the top, but an agent is a program you compose on
  the fly: it runs **any model** (`Agent.models`, via the gateway — §5b) and can itself **spawn and orchestrate
  sub-agents** (a child `Task` via `parentTaskId`), including attaching and driving a cloud terminal's pty (a
  Grok CFO points a Claude terminal and directs it). Connections are drawn on the canvas as **`Edge`s**
  (Maestri-style); no middleware. Lu conducts the top; every agent can conduct beneath it.
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

- **Reasoning (the agent's brain) — any provider.** Anthropic (Claude), OpenAI (GPT), Google (Gemini) are
  wired today; **xAI (Grok)** and other AI-SDK providers are on the roadmap — swappable per agent (`ai` v6).
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

### 5c. State-of-the-art foundations (the target — mostly roadmap)

> Written as the intended end-state. Live today: Langfuse telemetry, working/core memory, and model tiering
> (see [DEVELOPMENT.md](../DEVELOPMENT.md)). Streaming-everywhere, MCP-native, the vector store, and
> evals-as-CI-gates are roadmap, not yet built.

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
- **Agent-to-agent orchestration.** Delegation is **recursive**, not Lu-only: Lu→department is A2A, and any
  agent can itself spawn + orchestrate sub-agents (a child `Task` via `parentTaskId`) and attach/drive a cloud
  terminal — wired as canvas `Edge`s (§3). Each agent exposes a capability summary (an "agent card") so Lu + the
  Library can discover and route — a clean seam for future third-party agents.

## 6. The Engineering agent (the flagship)

> **The full build spec — the 6-tool pipeline, the ports, the terminal, orchestration, and durability — is
> the handbook: [building-agents.md](./building-agents.md).** Below is a short reference summary.

The Engineer turns "build me X" into a deployed thing: it inspects a repo, spins a sandbox, opens a PR with a
preview link, and publishes the approved change to production — real infra work.

**BYO by default.** What the Engineer builds lands in the **customer's own** GitHub + Vercel (+ Supabase for a
backend): Lu OAuths those accounts and provisions there, so the owner owns the infra and pays those bills
directly ([FOUNDATION.md §7](../FOUNDATION.md)). The two rungs below are the *bootstrap sequence* — v0 uses a
Lu-owned home so the wedge demo needs no accounts of the owner's; v1 (connect-your-GitHub) is the BYO model. A
fully Lu-managed + metered hosting tier is the later destination, not today's model.

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
   PR → their Vercel builds a preview → same approve→merge.

v0 ships the wedge promise while exercising the whole pipeline (sandbox, Git, Vercel, artifacts, approvals) on a
repo Lu controls; v1 flips one input (their repo) and reuses everything.

**The cloud terminal** is the interactive door to the same runtime: a websocket (`/api/terminal`) bridges an
e2b **pty** to an **xterm.js** node on the canvas — the owner watches and types into a real coding session. See
[canvas.md §4](./canvas.md) and [building-agents.md §4](./building-agents.md) for the build spec.

## 7. Sites / hosting — BYO by default, two surfaces

**What agents build lives in the customer's OWN accounts.** By default Lu OAuths their **GitHub + Vercel +
Supabase** and provisions the repo / project / database *there*, so the owner owns it and pays those bills
directly ([FOUNDATION.md §7](../FOUNDATION.md)). Lu is the payer-of-record for nothing but our own SaaS + metered
agent compute; free tier = preview-only (no standing infra), real infra begins at paid, idle scales to zero. Two
distinct surfaces:

**(A) A DB-rendered content SITE = an optional lighter path.** A marketing/booking site whose pages/theme/content
are **data, not a per-tenant repo**: it renders **from the DB**, so it needs no code repo — good for the simplest
sites and for **free previews** at `{slug}.lu.computer`. This is a **Lu-managed multi-tenant** app: ONE Vercel
project holds the `*.lu.computer` wildcard + up to 100k domains (**no per-tenant Vercel object**); middleware
routes `{slug}.lu.computer` → that tenant; the Marketing/Design agent edits the tenant's content + generates the
hero (§5b). Wildcard SSL needs `lu.computer` on Vercel's nameservers (one-time); a **custom domain** (the owner's
own) is added via the Vercel Domains API; shared-domain hygiene = `lu.computer` on the **Public Suffix List**
(cookie + reputation isolation, like `*.vercel.app`) + content moderation. This shared surface is the seed of the
**Lu-managed + metered hosting tier — the later destination** (the cofounder model; see [FOUNDATION.md §7](../FOUNDATION.md)
· [ROADMAP.md](../ROADMAP.md)), **not** where real apps live today.

**(B) Real CODING = repo + sandbox + deploy into the customer's own accounts** (§6). For actual software/tools —
and for **dogfooding Lu's own product** (it *builds* surface (A)). The Engineer provisions a **repo in the
customer's GitHub**, deploys to **their Vercel** (repo-per-project), and a built app's backend runs on **their
Supabase** (DB + serverless functions) — all in accounts Lu OAuthed on their behalf, billed to them, **zero
hosting cost or risk to us**. Technical owners connect an existing repo (the v1 path); either way the infra is
theirs. The rule throughout: *rent the heavy metered compute (sandboxes + tokens) but route hosting/DB to the
customer's accounts; build only thin orchestration glue* ([FOUNDATION.md §7](../FOUNDATION.md)).

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
- **Repo ownership = the customer's own GitHub by default** (Lu OAuths + provisions there — BYO, §7); a Lu-owned
  home is only the v0 wedge bootstrap.
- **Hosting = the customer's own Vercel/Supabase by default (BYO, §7):** real apps deploy repo-per-project into
  *their* accounts (they own + pay). An optional DB-rendered content site rides a Lu-managed multi-tenant surface
  — the free-preview path and the seed of the later **managed-metered** hosting tier (the destination). Free =
  preview-only.
- **Onboarding = a real DB org** (Supabase/Prisma write + invite-gated auth), not a cookie handoff.
- **Model registry (§5b) = Anthropic + OpenAI + Google** (reasoning; xAI/Grok roadmap) · **gpt-image**
  (image; Flux / Higgsfield placeholder); default per role/modality; Lu auto-escalates per hard task.
- **Agent config = the CONTRACT (§5a)**: `Agent.contract` + `ContractRevision`, company-root + per-agent;
  committed into the Engineering repo.
- **Build order = the Engineering agent first, and dogfood it** to build the other departments (see
  [building-agents.md](./building-agents.md)). Don't build a department ahead of a partner pulling for it.
