# Plan — the real agent backend: Lu orchestrating department agents (Cofounder-model)

> Build plan (Levi + Claude, 2026-07-15). **Vision = `PLATFORM-VISION.md`** (Lu at center, 8 departments,
> each an agent with space/tasks/scratchpad/context). This doc is HOW we make it real: the backend, the
> agent runtime, the Engineering agent (GitHub), onboarding wiring, and the roadmap for the rest.
> Modeled on **Cofounder 2** (researched: orchestrator delegates → dept agents; the Engineer connects
> **GitHub + Vercel**, works in a **sandbox**, opens a **PR with a preview link**, you approve → **Publish**;
> every agent has a workspace + **artifacts**; staged approvals; company context flows downstream).
> Note: `VISION-LU.md` (07-13) once "refused push-code/CI"; the 07-15 vision + this request **commit** to it.

## 0. The reality today — two disconnected systems

**REAL (production, tested, deployed) — `apps/api`:** the SMS assistant IS a real agentic runtime we reuse.
- Vercel **AI SDK v6** + `@ai-sdk/anthropic`, model `claude-haiku-4-5` (one swap point: `agent/provider.ts`).
- Tool-loop: `agent/runner.ts` → `generateText({ tools, stopWhen: stepCountIs(6) })`; 7 deterministic
  `tool()`s in `agent/tools.ts` (`qualify_lead`, `check_availability`, `book_appointment`, …). Principle:
  *the model chooses tools; business logic + the authoritative result live in code.*
- **Store port** (`store/types.ts` → `PrismaStore`/`MemoryStore`) over Postgres/Supabase (Prisma:
  Organization, Lead, Conversation, Message, Appointment, Escalation, Notification*, CalendarConnection).
- **BullMQ worker** (`apps/worker`): `nudge`, `escalation-sla`, `calendar-sync` — long-running/scheduled work.
- **Hard-gate approval** already exists (owner agent stages a send; a yes/no on the next text executes).
- Deploy: api+worker on **Railway** (Docker, `tsx`), web on **Vercel**, Postgres/Auth on **Supabase**.

**MOCK (presentation only) — `apps/web` canvas:**
- Departments/agents/roadmaps = static fixtures (`lib/canvas/{agent-work,graph,dept-roadmap}.ts`); positions
  in localStorage. Agent "working/pending", tasks, roadmap steps, artifacts are all hardcoded.
- 3 web AI routes (`/api/{lu,team,agent-setup}/chat`) are **stateless** `generateText`; tool effects are
  returned to the client and written to a **cookie `OrgProfile`**, never a DB.
- **Sites = 100% mock**: no generation, no hosting; in-memory Maps, `createSiteReal → null`, `SitePreview`
  is hand-written JSX. **No GitHub/Vercel/sandbox integration exists anywhere.**
- **No agent / task / artifact / site / quote / invoice tables** in Prisma — the biggest gap.

**Therefore the spine of this plan:** promote the department agents to the *same class* as the SMS agent
(AI-SDK tool-loops in `apps/api`, over the Store port), add the missing tables, and make the canvas a
**live view over real Agent/Task/Artifact rows** instead of fixtures. Lu becomes a real orchestrator.

## 1. Target architecture (one diagram)

```
                 ┌─────────────── apps/web (Vercel) — the canvas is a LIVE VIEW ───────────────┐
   you  ⇄  Lu chat ─────────────► POST /api/lu (orchestrator)      Tasks/Artifacts (poll/realtime)
                 └──────────────────────────────┬──────────────────────────────▲────────────────┘
                                                │ enqueue                       │ read
   apps/api (Railway) ── Lu orchestrator agent ─┤                               │
     • plans, asks (AskUserQuestion), delegates │                     Postgres/Supabase (Prisma)
     • dept agents (AI-SDK tool-loops):         ▼                       Organization · Department
        Support(=SMS,✅) Sales Ops Finance   BullMQ worker (Railway)     Agent · Task · Artifact
        Marketing Engineering Design Legal   • runs long tasks           Site · Deployment · Context
                                             • Engineering → SANDBOX      GithubConnection · VercelConnection
                                                    │
                              ┌─────────────────────┴──────────────────────┐
                              ▼                                             ▼
                     Sandbox (e2b/Daytona/Fly) w/ Claude Agent SDK    GitHub App + Vercel API
                     clones repo, edits, tests                        PR + preview URL, publish
```

## 2. Data model — new Prisma tables (`packages/db/prisma/schema.prisma`)

The org already exists; add the agent OS on top. All org-scoped, RLS-safe.
- **Department** — `orgId`, `key` (the 8: sales/operations/finance/legal/engineering/design/marketing/support),
  `active` (per-org, replaces graph.ts's hardcoded flag), `context` (Json/text: facts + code-of-conduct slice).
- **Agent** — `orgId`, `departmentKey`, `name`, `role`, `contract` (markdown — the identity file, §5a; subsumes
  voice/leash/context), `models` (reasoning + generation model ids — on-the-fly, §5b), `status` (idle/working).
  Default agent per active dept + custom via ＋New Agent. **ContractRevision** — versioned history (diff/revert).
- **Task** — `orgId`, `departmentKey`, `agentId`, `title`, `body`, `status`
  (`agent_can_do | needs_input | needs_earlier | in_progress | needs_approval | done | failed`),
  `parentTaskId` (Lu decomposition), `input`/`result` Json, `assignedBy` (lu|user), timestamps. Replaces
  `agent-work.ts` + `dept-roadmap.ts`. The roadmap steps ARE tasks with ordering + `needs_earlier`.
- **Artifact** — `orgId`, `taskId`, `agentId`, `kind` (`file | image | site_preview | pr_diff | doc |
  agent_session | invoice | post`), `title`, `payload` (url/json/text), `createdAt`. Powers the ArtifactsNav
  (Browser=site_preview, images, Publish-to-Preview, PR Diff, Agent Interaction=agent_session).
- **Site** — `orgId`, `departmentKey` (marketing/engineering), `repoFullName`, `vercelProjectId`, `domain`
  (`{slug}.lu.computer`), `status`. **Deployment** — `siteId`, `env` (preview/production), `url`, `sha`,
  `prNumber`, `status`. (Replaces the in-memory website Map.)
- **GithubConnection** — `orgId`, `installationId`, `login`, `repos[]`. **VercelConnection** — `orgId`,
  `teamId`/tokens (or a single Lu-owned team for v0).
- **Approval** — generalize the hard-gate: `orgId`, `taskId`, `action`, `status`, `decidedBy`. Feeds "Needs you".

Migration adds tables only — the SMS agent's tables are untouched. The Store port grows methods
(`createTask`, `updateTaskStatus`, `addArtifact`, …); web reads via `@supabase/ssr` like it already does for Leads.

## 3. The agent runtime (reuse the `apps/api` pattern)

- **Department agent = an AI-SDK tool-loop** exactly like `agent/runner.ts`, but its tools are its
  department's real actions (Finance: `create_invoice`/`send_payment_link`/`chase_overdue`; Marketing:
  `draft_post`/`build_site`/`run_review_wave`; Support: the EXISTING SMS tools — Support is already real).
  Same discipline: model chooses, code decides, result authoritative, `stopWhen: stepCountIs(N)`.
- **Long-running tasks → the worker.** A dept task (esp. Engineering builds) is enqueued on **BullMQ**; the
  worker runs the loop, writing `Task.status` + `Artifact` rows as it goes. The web shows a **live task
  tracker** by polling those rows (or Supabase Realtime) — this is the dock's Tasks panel + the roadmap.
- **Lu orchestrator** = a planning agent (in `apps/api`, stronger model — Sonnet/Opus) with tools:
  `ask_user` (renders as an AskUserQuestion in the Lu dock), `create_task`, `assign_to_department`,
  `get_status`, `summarize`. Given a goal ("build my marketing site"), Lu decomposes → tasks → assigns →
  reports back. The web `/api/lu/chat` stops being a toy and calls this. (`VISION-LU §6`: one Lu, org-wide
  memory, role lens — the orchestrator is that one brain.)
- **Model tiering:** orchestrator + Engineering coding = Sonnet/Opus; routine dept turns = Haiku (cost).

## 4. Approvals / human-in-the-loop (generalize what exists)

Cofounder labels tasks "Agent can do this / Needs your input / Needs earlier steps first" and gates Publish.
We already have the exact primitive (owner-send hard gate). Generalize: any task whose `leash` marks an
action risky/outward-facing (publish site, merge PR, send email, charge a card) creates an **Approval** and
sets `Task.status = needs_approval` → surfaces as a **"Needs you"** row (the dock's existing "Requires
approval" badge). Owner approves → the gated tool actually executes. Approval **routing by role** per
`VISION-LU §6` (money/publish → owner; reschedules → office).

## 5. Context / memory (the moat)

- **Company root context** (Company tab) + **per-department Context** (`Department.context`) — facts + policy,
  per `PLATFORM-VISION §7`. Every setup conversation + correction writes to the right level.
- Flows downstream like Cofounder: onboarding scrape + interview → company context → each dept's context →
  injected into that agent's system prompt (extend `packages/core/prompt.ts::assembleAgentSystemPrompt`).
- v0 memory = these context records + task/artifact history in Postgres (retrieved per turn). A vector store
  is a later upgrade, not needed for v1.

## 5a. The agent CONTRACT — its identity file (the unifier)

Instead of scattering an agent's config across `leash`/`voice`/`context` JSON, **each agent IS a
`CONTRACT.md`** — one human-readable, editable markdown file that defines it and compiles into its system
prompt. It's the agent's **employment contract** (fits the "New Agent — an employee you give tasks to" framing
the product already uses): what it's hired to do, its boundaries, its voice, what it knows, how it thinks.
This is deliberately **distinct from `AGENTS.md`** — the Linux-Foundation *repo-instruction* standard
(Cursor/Codex/Claude Code/Devin read it): the Engineering agent, working in a repo, reads that repo's
`AGENTS.md` (*how this codebase works*) while its own CONTRACT is *who it is*. They compose. *(Alt name if we
prefer a department frame: "charter." One-word swap — the concept is what matters.)*

**Template** — research-backed: keep it **< ~150 lines** (longer hurts answer quality AND costs), boundaries as
the emerging three-tier **Always / Ask-first / Never**:
```markdown
# {Agent Name} — {Department}  {pixel avatar}
## Role         one line: what I'm hired to do + the outcome I own
## Duties       the work that lands in my Tasks
## Boundaries   Always do · Ask first (→ approval) · Never do      ← the leash, three-tier
## Voice        tone + personality — to you, and to your customers
## Knowledge    business facts + policy I operate under (the context — the moat)
## Playbooks    how I do the recurring things, your way
## Models       my reasoning model + my generation models + why (§5b)
```

**Lifecycle:** **drafted** by Lu at hire (onboarding / ＋New Agent) from the interview + the scrape →
**editable** two ways: a dock markdown editor, or conversationally ("Lu, tell Finance to always offer Pix"
writes the right section) → **versioned** (`ContractRevision`: diff/revert how its identity evolved) →
**compiled** into the system prompt where `packages/core/prompt.ts::assembleAgentSystemPrompt` already injects
persona + `HARD_RULES` → **self-tuning** later (the agent proposes edits after learning; owner approves). Two
levels: a **company contract** (root code of conduct, Company tab) every agent inherits + each agent's own.
Storage: `Agent.contract` + `ContractRevision`; for Engineering, also committed into the repo so the sandbox
reads it. The win: the whole config is one plain-language file you actually read — the moat made legible.

## 5b. The model layer — any provider, any modality, on the fly

State-of-the-art = a **model gateway**, not a hardcoded model. The runtime is already provider-agnostic
(`agent/provider.ts`, one swap point); generalize it into a **registry + router** spanning every provider AND
modality. Two axes:

- **Reasoning (the agent's brain) — any provider.** Anthropic (Claude), **OpenAI (GPT)**, Google (Gemini), and
  any AI-SDK provider, swappable per agent (`ai` v6 + `@ai-sdk/{anthropic,openai,google}` — add the packages).
- **Generation (the agent's hands) — any modality.** Agents don't just reason, they PRODUCE assets:
  - **Image** — the website **hero image**, logo, social graphics, brand kit: OpenAI `gpt-image`, Black-Forest
    **Flux**, Ideogram, and the already-connected **Higgsfield MCP** (`generate_image`/`create_website`). Via
    AI SDK `generateImage` + MCP. So Marketing/Design/Engineering call a `generate_image(model, prompt)` tool
    whose image model is itself chosen + recommended (photoreal hero → Flux/gpt-image; pixel/stylized brand →
    Higgsfield).
  - **Video / audio** — later (Higgsfield does both) for reels + voiceover.
- **Where the choice lives:** an agent's reasoning model + preferred generation models are the CONTRACT's
  `## Models` section, surfaced as **pickers in the Agent panel** — change on the fly, next turn/task uses it,
  no restart. A **per-task override** (`Task.model`) lets Lu bump a hard build to Opus, or swap the image model
  for a single asset. Registry metadata per model: provider · modality · tier · speed · cost · best-for.
- **Recommendations, two layers:** (1) a **static role/modality map** (coding → Opus/Sonnet; Support routine →
  Haiku; hero image → Flux/gpt-image; pixel brand → Higgsfield) shown as a **"Recommended"** badge + one-line
  rationale in the picker; (2) **Lu-driven** — she suggests + auto-escalates per task via a `recommend_model`
  tool ("this hero needs photoreal — I'll use Flux"; "sites come out better on Opus — switch your Engineer?").
- **Routing (SOTA):** the gateway can cost/latency-route (cheap model first, escalate on low confidence/
  failure) and fall back across providers on rate-limit/outage — all behind the picker. The owner sees simple
  speed/quality/cost hints, never a spend dashboard (`VISION-LU`: owners don't want AI-spend policies).

## 5c. State-of-the-art foundations (baked in, not bolted on)

To be genuinely state-of-the-art, the runtime carries these as first-class from day one:
- **Streaming everywhere.** Stream the agent's tokens + tool-calls + artifact updates live to the dock
  (`streamText` + Supabase Realtime / SSE on Task/Artifact rows) — the live task tracker feels alive, not polled.
- **MCP-native.** Agents are **MCP clients** — a department mounts the user's real tools (Slack, Notion, GitHub,
  Gmail, their CRM) with zero bespoke connectors; and **Lu is an MCP server** (`VISION-LU §5`) — your business
  operable from Claude/ChatGPT. This is how capability compounds without hand-coding every integration.
- **Layered memory.** Working (this task's scratchpad) · episodic (task/artifact history) · semantic (the
  CONTRACT + Context + a **vector store** over the business's docs/messages). Cofounder's edge is memory; ours
  is the same, grounded in Postgres + embeddings.
- **Observability + evals.** Langfuse is already wired (`experimental_telemetry`) — extend to every agent + the
  orchestrator; **evals as quality gates** — generalize the existing LLM-as-judge (`e2e/judge.ts`) to score an
  agent's output (a drafted invoice, a built page) before a human sees it; regressions caught in CI.
- **Guardrails + isolation.** Boundaries (Always/Ask/Never) + Approvals are the *behavioral* guardrail;
  **sandbox isolation** (§6) + **capability-scoped tokens** (a GitHub-App token scoped to one repo, a Vercel
  token scoped to one project) are the *blast-radius* guardrail. Every action lands in the org activity log.
- **Deterministic tools + idempotency.** Keep the SMS agent's discipline (business logic in code, result
  authoritative, `providerSid`-style idempotency) for every new tool + task — retries/duplicate events never
  double-charge or double-post.
- **Agent-to-agent orchestration.** Lu→department delegation is A2A; each agent exposes a capability summary (an
  "agent card") so Lu + the Library can discover and route — a clean seam for future third-party agents.

## 6. THE ENGINEERING AGENT (first — the GitHub one)

The flagship. Cofounder's Engineer: *inspects the repo, parses structure/deps, spins a sandbox, creates a PR
with a localhost preview, publishes approved changes to prod — real infra work, not suggestions.* We build the
same in two rungs.

**Runtime = a coding agent in a sandbox.** Recommend **Claude Agent SDK / Claude Code headless** (it *is* a
state-of-the-art coding agent — tool use, file edits, shell, tests) running inside an ephemeral **sandbox**
(**e2b** or **Daytona** or **Fly Machines**/Modal). The worker spawns the sandbox per Engineering task, mounts
the repo, runs the agent with the task prompt + department context, streams its transcript into an
`agent_session` Artifact.

**Rung v0 — "we build your website tonight" (we own the repo).** Delivers the literal first promise
(`VISION-LU §3`) without the user having a repo:
1. Engineering/Marketing task `build_site(preset, brand, context)` → worker creates a repo from a **starter
   template** in a **Lu-owned GitHub org** (via a **GitHub App**), clones into the sandbox.
2. Claude Agent SDK edits the template to the business (copy from context, brand kit, sections) + runs
   `build`/tests. Generated images via the **Higgsfield MCP** (`create_website`/`generate_image` — already
   connected, currently unused).
3. Push branch → open **PR** (GitHub API) → **Vercel** auto-builds a **preview deployment** → store the preview
   URL + PR diff as Artifacts (Browser + PR Diff in ArtifactsNav). Task → `needs_approval`.
4. Owner clicks **Publish to Staging/Production** → merge PR → Vercel production deploy → **Site.domain =
   `{slug}.lu.computer`** (Vercel Domains API + our wildcard `*.lu.computer`). Site live. (This is the
   ArtifactsNav "Publish to Preview" + the focused-site action bar we already built the UI for.)

**Rung v1 — "connect your GitHub" (the user's repo, full Cofounder).**
1. **GitHub App install** (not OAuth) → `GithubConnection{installationId}`. The agent gets a scoped
   installation token to clone/branch/PR the user's chosen repo.
2. Engineering task → sandbox clones the user's repo → Claude Agent SDK inspects structure/deps, makes the
   change, runs their tests → PR to their repo → their Vercel (or ours) builds a preview → same approve→merge.
3. This is the Cofounder "work on your existing codebase" power (their §"Design, build, deploy products").

**Why this shape:** v0 ships the wedge promise + exercises the whole pipeline (sandbox, GitHub App, Vercel,
artifacts, approvals) on a repo we control (safe, deterministic). v1 flips one input (their repo) and reuses
everything. **Net-new infra to stand up:** a GitHub App, a sandbox provider account, Vercel API + wildcard
DNS, and the worker "engineering" queue. Everything else extends existing patterns.

## 7. Sites / hosting — TWO models (resolves the "clients under my domain" worry)

The worry: *do I nest every client under `lu.computer`, and can a client's Vercel/actions cause me domain
problems?* **Clients NEVER touch Vercel or GitHub — you host everything** (the site-builder norm: Framer/
Webflow/Durable). Two distinct surfaces:

**(A) Customer marketing/booking SITES = a multi-tenant site app (Vercel for Platforms).** ONE Vercel project
holds the `*.lu.computer` wildcard + up to **100k domains** (Pro; 1M Enterprise) — **no per-tenant project/
Vercel object**. Each tenant's site renders **from the DB** (pages/theme/content as data); middleware routes
`{slug}.lu.computer` → that tenant. The **Marketing/Design agent edits the tenant's content + generates the
hero** (image models §5b). Infinitely scalable, cheap, safe. Wildcard SSL needs **lu.computer on Vercel's
nameservers** (one-time). **Custom domains** (the client's OWN domain — `VISION-LU §4` "bring your domain") are
added per-tenant via the **Vercel Domains API** (100 adds/hr/team), so real businesses run on their own domain
and `*.lu.computer` is just the free default. *Shared-domain risk:* submit `lu.computer` to the **Public Suffix
List** (per-subdomain cookie + reputation isolation, like `*.vercel.app`) + content moderation.

**(B) The Engineering agent's real CODING = repo + sandbox + Vercel deploy** (`ENGINEERING-AGENT.md`). For
actual software/tools/integrations + **dogfooding our own product** — and it BUILDS surface (A). Not the mass
customer-site path. Technical clients with an existing repo use the **v1 connect-your-GitHub** path (their repo,
their Vercel, their domain) — the only case a client has their own Vercel.

So `*.lu.computer` → ONE multi-tenant project (A); the coding agent (B) deploys real apps (ours first). The
canvas site frames render the real tenant/preview URL. Whether the **app/landing** sit at the `lu.computer`
root is a separate, low-stakes branding choice (deferrable). Replaces the mocks in `lib/data/website/*` +
`SitePreview` + `/p/[token]`.

## 8. Onboarding — (a) game-like restyle + (b) wire to agents

**Today:** `OnboardingSketch.tsx` (1310 lines) is a flat, conversational sketch that's mostly *theater* (fake
scrape, fake email/SMS/gcal) and writes a **cookie `OrgProfile`** — no DB org, no agents, no sites.

**(a) Depth restyle** (make it Wii-like, matching the canvas). Apply the depth system (`.neu-raise`/
`.neu-socket`/`.gloss`/`.gloss-ink`/`.elev-1..4`) to the surfaces the onboarding map flagged (all
`OnboardingSketch.tsx`): the two panels (`:457/:460/:500`), stage cards (WebsiteStage `:736`, EmailStage
`:780`, PhoneFrame `:819`, Ready summary `:1114`), **choice tiles** → tactile `.neu-raise`/`.gloss` (LinksPrompt
`:616`, WebsiteStage options `:761`, ROI ladder `:1133`), icon wells → `.neu-socket` (`:617/:802/:864/:997`),
inputs → recessed `.neu-socket` (`:1190/:1224/:1236/:1247/:1283`), chips/preset pills (`:1195/:1256`),
progress rows (`:663/:1074`), and the availability grid (`:916`). TeamSetup panels (`:172/:226`) too.

**(b) Wire it to real agents (the big one).** Onboarding becomes the provisioning step, Lu-interview style
(`PLATFORM-VISION §12.4`):
1. **Make the scrape real** — fetch the given site/socials, LLM-summarize into a **voice + business profile**
   (feeds context). (Today it's a fake timer.)
2. **Lu interviews** (real `ask_user`) to confirm the business + which **departments** are active (derive the
   roster from trade/discovery — a roofer lights up Support/Ops/Finance/Sales/Marketing; Eng/Design/Legal
   sit light per `PLATFORM-VISION §8`).
3. **Provision for real:** create a **DB Organization** (replace the cookie handoff with a real
   Supabase/Prisma write + the invite-only auth we have), instantiate **Department + Agent** rows for the
   active set, and **seed each `Department.context`** from the interview + scrape.
4. **First outcome live:** kick the Engineering/Marketing agent's `build_site` so onboarding ends with
   `{slug}.lu.computer` **actually live** (the ROI ladder's "site live tonight" becomes true), and the
   Support agent = the SMS line (already real) claimed.
5. Drop onto the **canvas**, now backed by real Agent/Task rows — the departments show real status.
   `graph.ts` reads the org's Department/Agent rows instead of its hardcoded `AGENTS` constant.

## 9. The other departments — how each goes real (sequenced)

Reuse `FEATURES.md`'s dependency order; each is an agent + tools + tables + its space (mostly built UI):
- **Support** ✅ *already real* — the SMS Sarah agent IS the Support department. Wire its live
  Leads/Conversations/Escalations into the Support node's tasks/status (surface, don't rebuild).
- **Operations** ✅ mostly — Scheduling is real (booking/availability). Finish travel-routing + Google
  Calendar (seams exist). Ops agent tools wrap the existing scheduler.
- **Sales** — CRM customer entity + import (FEATURES pillar 4/2) → the Sales agent qualifies/quotes/chases.
  Tables: Customer, Quote. Its space = the built Customers/CRM UI.
- **Finance** — Quote + Invoice tables + **pluggable payment rails** (Stripe US / AbacatePay Pix+boleto);
  Finance agent invoices/charges/collects; webhook → auto-reconcile → follow-ups stop. Space = built Money UI.
- **Marketing** — Reviews reactivation campaign (the day-one ROI, FEATURES §6.4) + Content (blog/social) +
  sites (via §7 pipeline). Marketing agent runs review waves, drafts posts, builds pages.
- **Engineering** — §6 (first to build as the flagship, even though "light for most service businesses" —
  it's the proof of the whole runtime + the site pipeline everyone reuses).
- **Design** — brand kit + generated assets (Higgsfield MCP) as artifacts feeding Marketing/Eng.
- **Legal** — lightest; contract/doc drafting + e-sign later.

## 10. Build roadmap (phases — each phase ships something demoable)

1. **Foundation:** the tables (§2) + Store-port methods + make the canvas read real Agent/Task/Artifact rows
   (delete the fixtures). Lu orchestrator agent in `apps/api` + wire `/api/lu/chat` to it (replace the toy).
   Tasks/approvals surface in the dock. *Demo: Lu takes a goal, creates real tasks, they show live.*
2. **Sites pipeline + Engineering v0:** GitHub App + sandbox + Vercel + the `build_site` task → PR + preview +
   Publish → `{slug}.lu.computer` live. *Demo: "Lu, build my site" → a real live site + PR/preview artifacts.*
3. **Onboarding real:** restyle (§8a) + real provisioning + Lu interview + ends on a live site (§8b).
4. **Marketing (reviews + content) + Finance (quotes/invoices/rails) + Sales (CRM/import)** — the revenue
   departments, per FEATURES sequence; each agent + its tools over the built spaces.
5. **Engineering v1 (connect user GitHub)** + Design/Legal + memory/vector upgrade + billing/self-serve.

## 11. Decisions (LOCKED 2026-07-15)

- **Sandbox = e2b** (ephemeral cloud sandbox) — fastest to a working coding sandbox + PTY; abstracted behind a
  `Sandbox` port so Daytona/Fly are swappable.
- **Coding agent = the USER's choice: Claude Code OR Codex** (both preinstalled in the sandbox) + plain shell
  (`CANVAS-TOOLS §4`). The runtime wraps whichever they pick.
- **Repo ownership = Lu-owned repos first** (v0 "we build your site"); connect-your-GitHub is v1.
- **Hosting = Vercel, TWO models (§7):** customer sites = **one multi-tenant "Vercel for Platforms" project**
  (`*.lu.computer` wildcard + DB-driven tenants + per-tenant custom domains via the Domains API + `lu.computer`
  on the PSL) — **NOT** a project-per-tenant, clients never touch Vercel. The repo→PR→preview→prod pipeline is
  for real software + dogfooding (surface B). Higgsfield = image/asset gen only.
- **Onboarding = REAL DB org now** — replace the cookie handoff with a Supabase/Prisma write + the invite-only
  auth. This is where demo-mode becomes real signup.
- **Model registry (§5b) = Anthropic + OpenAI + Google** (reasoning) · **gpt-image / Flux / Higgsfield** (image);
  default per role/modality; **Lu auto-escalates the model per hard task.**
- **Naming = CONTRACT** (§5a); DB `Agent.contract` + `ContractRevision`, committed into the Eng repo; company-root + per-agent.
- **SOTA scope (§5c) = streaming + MCP-native + evals IN from the start**; vector-memory + full A2A/agent-cards phase later.
- **BUILD ORDER = Engineering agent FIRST, and we DOGFOOD it** (`DOGFOOD.md`: customer #1) to build the other
  departments, then follow the §10 roadmap. Detailed build plan: **`ENGINEERING-AGENT.md`**. Discipline still
  applies (don't build a dept ahead of a partner pulling for it) — Engineering is justified as the flagship AND
  our own dev accelerator + the site pipeline the wedge (Marketing) needs anyway.

## 12. What reuses vs net-new

**Reuse (big):** the entire `apps/api` runtime (AI-SDK tool-loop, Store port, provider swap, worker, hard-gate),
Supabase/Prisma, auth, the built canvas/dock/dept/onboarding UI (becomes the live views + gets the restyle),
the Higgsfield MCP for assets. **Net-new:** the tables (§2), the Lu orchestrator, per-department tool sets,
the **GitHub App + sandbox + Vercel** site pipeline (§6/§7), real onboarding provisioning, and payment rails.
