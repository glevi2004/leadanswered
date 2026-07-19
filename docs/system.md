# The system — how the machine works

> One file for the whole backend: the doctrine, the agent loop, the flow layer, the gates, the ports,
> BYO connections, durability, memory, and the recipe for adding an agent. Everything here is verified
> against the code (2026-07-18). Theory: [paper.md](../paper.md) · company: [COMPANY.md](../COMPANY.md) ·
> the user experience: [product.md](./product.md) · what's next: [DEVELOPMENT.md](../DEVELOPMENT.md).

## §0 — The doctrine

1. **An agent IS a tool-loop.** A `generateText` call (AI SDK v6) with a system prompt, `tool()`s, and a
   stop condition. Understand one agent, understand all of them.
2. **The model picks the tool; the result lives in code.** Tool bodies are deterministic and port-backed.
   Never let the model be the source of truth for a side-effect.
3. **Data only through the `Store`; the world only through ports.** No agent touches the DB or an external
   API directly. That's what makes agents testable, safe, and swappable.
4. **Long work is async and durable.** Builds run on a durable worker and survive redeploys; progress is
   rows the web reads live.
5. **Humans gate the irreversible.** Plan approval, publish, migrations → an `Approval`; the gated action
   runs only in the approval-resolution path.
6. **The journal is the spine; the conversation is the log.** Every notable transition writes an
   `AgentEvent`; terminal events post real messages into Lu's thread. Lu is never blind: every turn is
   injected with the live situation. The chat must be true after a reload.
7. **The UI never lies.** Every element works end-to-end or says Coming soon. One source of truth: every
   surface renders the same rows and events.

## §1 — Anatomy of an agent

| Part | What | Where |
|---|---|---|
| **Contract** | identity file — role, duties, boundaries (Always / Ask-first / Never), voice, knowledge; compiles into the system prompt | `Agent.contract` + `ContractRevision`; assembled in `packages/core` |
| **Model** | reasoning + generation models, per-agent, swappable | `Agent.models` via the gateway |
| **Tools** | its real actions — deterministic, idempotent, port-backed bodies | `apps/api/src/agent/*Tools.ts` |
| **Skills** | a markdown playbook for a kind of work, injected when it applies | `apps/api/src/agent/skills/*.md` — real files (frontmatter name/description + procedure), loaded from disk; adding a skill = adding a file. `onboarding.md` is the first. The general system this grows into — attachment levels, three injection classes, the SKILL.md format — is [framework.md](./framework.md) §4 |
| **Department** | the operating area grouping the agent + its work | `Department` row (`key`, `status`) |

A turn: contract → `generateText` with tools → the model calls tools → each body does a real thing through
a port and returns the authoritative result → loop until `stopWhen` → persist reply + rows.

## §2 — The flow layer (how information circulates)

**The journal** — `AgentEvent { orgId, taskId?, kind, message, payload }` (`agent/journal.ts`). Kinds:
`plan_proposed/approved/rejected`, `build_dispatched`, `coding_finished`, `preview_ready`,
`verify_passed/failed`, `publish_requested`, `published`, `build_failed`, `question_asked`,
`departments_activated`, `project_imported`, `migration_applied`, `doc_drafted/approved/rejected`.

**The situational block** (`agent/situational.ts`) — assembled every orchestrator turn and injected after
org memory: connections (✓/✗), open tasks, approvals awaiting the owner, the last 8 events. Bounded
(10 tasks · 8 events · 2k chars), best-effort.

**Report-back** — `postToThread(store, orgId, content, meta?)` appends an assistant message to the org's
thread on terminal events only (preview ready · published · build failed · plan approved · verification
results). Also mirrors to Slack via `notifySlack` when configured. The thread survives reload, feeds Lu's
next turn, and the memory consolidator folds it into core memory.

**Chat states are derived, not invented** — the web polls tasks/approvals/events and derives the phase
(planning → awaiting approval → building → verifying → needs you → live). The dock badge counts server
truth.

## §3 — Lu, the orchestrator

`agent/orchestrator.ts` — system prompt = base + org memory + situational block. Tools
(`orchestratorTools.ts`): `create_task`, `assign_to_department`, `check_connections`,
`show_connect_form` (pushes the connect card into the chat), `propose_plan`, `dispatch_to_engineering`,
`spawn_agent` (ordered children via `parentTaskId` + `needs_earlier`), `list_status` (real rows),
`draft_doc` (a company document → Library; `architecture` stages an `approve_doc` gate), `ask_user`.
During onboarding-mode (org with no active department) the toolkit swaps to `ask_user` +
`update_business_context` + `finalize_business_context` (`onboardingTools.ts`).

**The setup playbook** — `skills/onboarding.md` stays injected until the company ships its first build:
`agent/setup.ts` derives the five-stage COMPANY SETUP progress from live state (departments → connections
→ approved architecture doc → engineering task done) and the orchestrator appends the playbook + a stage
line to Lu's prompt while incomplete.

**The plan gate** — Lu plans before building. `propose_plan` writes a plan `doc` artifact
`{objective, steps[], acceptance[]}` + `Task.acceptance`, and stages an `approve_plan` Approval. Nothing
dispatches until the owner approves (Approve / Request changes → Lu re-plans / Reject); approving
dispatches the Engineer with the plan as its brief (`routes/approvals.ts`).

**Spawn + supervise** — `spawn_agent` creates ordered children; `agent/supervise.ts` advances the cascade
on every run end: next sibling dispatches, a failure pauses the parent at `needs_input` and reports to the
owner, all-done completes the parent.

## §4 — The Engineer (the reference agent)

`agent/engineering.ts` + `engineeringTools.ts`. The eight tools:

- **`create_site`** — real GitHub repo from the public starter template (`SITE_STARTER_TEMPLATE`) + a
  `Site` row; idempotent; skipped for imported projects (the PROJECTS block in the prompt lists them).
- **`run_coding_agent`** — boots an e2b sandbox, clones with a **downscoped 1-hour token** (that repo
  only, `contents:write`), runs the repo profile's `setupCommand`, runs Claude Code headless, pushes
  `lu/build`; transcript → `agent_session` artifact.
- **`generate_image`** — `gpt-image-1` real; Flux/Higgsfield placeholders.
- **`open_preview`** — real PR + Vercel preview; `pr_diff` + `site_preview` artifacts; `preview_ready`
  event + thread post.
- **`verify_acceptance`** — reads `Task.acceptance`; **empirical**: fetches the preview URL over HTTP and
  runs the repo profile's `testCommand` in a sandbox on the build branch; failed hard checks force
  `pass=false` regardless of the LLM judge; verdict artifact `{pass, unmet, notes, checks}`; unmet items
  trigger rework (`run_coding_agent` again).
- **`request_publish`** — **code-gated**: refuses unless the latest acceptance check passed. Stages the
  publish Approval.
- **`provision_backend`** — wires the org's selected Supabase project into the Vercel app's env vars.
- **`run_migration`** — **never executes SQL**. Stages a migration doc (title + SQL + project) and a
  `run_migration` Approval; the SQL runs only in the approval-resolution path (`routes/approvals.ts`),
  which keeps the approval retryable on failure and journals `migration_applied` on success.

`confirmPublish` is a server action, not a model tool: owner resolves the Approval → merge PR → promote →
domain (BYO Vercel = the project's own URL) → task `done` → `published` event → supervise hook.

## §5 — Ports

- **`Sandbox`** (`sandbox/e2b.ts`) — spawn/exec/pty/kill; fresh sandbox per run, killed in `finally`.
- **`Git`** (`git/`) — Octokit. `getGitForOrg` prefers the org's **GitHub App installation** (mints 1-hour
  installation tokens; `sandboxToken(repo)` mints per-task downscoped tokens); PAT paste and env are
  fallbacks. `protectMain` guards new repos (no force-push/deletion).
- **`Deploy`** (`deploy/vercel.ts`) — createProject, preview for PR, promote, domains, `findProject`,
  `setEnvVars`. Vercel only; a Railway adapter is on the TODO.
- **`Store`** (`store/`) — `PrismaStore` prod / `MemoryStore` tests. The only data path.
- **Model gateway** (`packages/core/src/models.ts`) — multi-provider registry (Anthropic/OpenAI/Google;
  image via gpt-image-1) + `recommendModel(role, modality)`; per-turn dock override. Known gap:
  `Task.model` is a dead column and the in-sandbox coding model is pinned, not registry-driven.

**Adding a tool:** `tool({ description, inputSchema, execute })` in the agent's `*Tools.ts`; the body calls
a port or the Store, stays idempotent, returns the authoritative result. **Adding a port:**
`apps/api/src/<name>/` with a factory, a real adapter, a test stub; resolve per-org where BYO applies.

## §6 — BYO connections (the customer's own accounts)

All three providers connect through their **real install flows** (`routes/connect.ts`,
`connect/supabaseOAuth.ts`; token-paste kept as a fallback). Tokens AES-256-GCM encrypted at rest,
decrypted server-side only.

- **GitHub — a GitHub App** (id 4328962, slug `lu-computer`): owner installs, picks repos; we store the
  `installationId` and mint short-lived tokens from the App key. Sandboxes only ever see the downscoped
  per-task token.
- **Vercel — an Integration**: install → `code` exchange → `accessToken/teamId`.
- **Supabase — an OAuth app**: authorize → code exchange → access + **refresh** tokens
  (`validManagementToken` auto-refreshes); owner picks a project (auto-selected if they have one); keys
  fetched on demand, service key never enters the build sandbox.

**Dispatch gate:** the Engineer is dispatchable only once GitHub + Vercel are connected; Supabase is
opt-in. **Existing projects:** `routes/projects.ts` — import a repo the App install granted (verifies
access, links the Vercel project, idempotent `Site` of `kind:"imported"`) with a **repo profile**
(`setupCommand` / `testCommand`) the sandbox and verifier use.

## §7 — Durability, security, channels

- **Durable worker** — BullMQ + Redis, LIVE (`queue.ts`/`worker.ts`; `jobId = taskId`, attempts 3,
  concurrency 3). Approval waits are run boundaries (build ends at `request_publish`; `confirmPublish` is
  a separate run) — no mid-run suspend needed for human gates.
- **Stuck-task reaper** (`agent/reaper.ts`) — cross-org sweep every 10 min, 45-min deadline, boot sweep;
  strays → `failed` + journal + thread report.
- **API auth** — every `/api/*` call requires `x-lu-proxy-secret` (Slack routes are signature-verified
  instead).
- **Slack** (`routes/slack.ts`, `channels/slack.ts`) — built, dormant until the Slack app registers: DM/
  mention → the same server-side thread; plan/publish approvals as buttons → the resolve endpoint; journal
  report-backs mirrored. Env: `SLACK_BOT_TOKEN/SIGNING_SECRET/ORG_ID/CHANNEL`.
- **Known security debt** — the cloud terminal still seeds platform keys into a user-reachable shell;
  two OAuth client secrets that passed through chat need regeneration. Both on the TODO.

## §8 — Memory

Working memory: `Thread`/`Message`, last 20 rehydrated per turn. Core memory: `Memory` rows injected into
the prompt (capped), seeded from onboarding. Sleep-time consolidation: a worker folds recent conversation
into a core summary (live, Redis-gated). Target: pgvector retrieval-by-relevance, then an AST-aware code
index (paper §3.3) — parked on the TODO.

## §9 — Data model (`packages/db/prisma/schema.prisma`)

Org-scoped, additive (scalar `orgId`): `Organization` · `Waitlist` · `Department` · `Agent` ·
`ContractRevision` · `Task` (`status`, `parentTaskId`, `acceptance`) · `Artifact` (`doc | note | file |
image | site_preview | pr_diff | agent_session`) · `Site` (`kind`, `repoFullName`, `vercelProjectId`,
`setupCommand`, `testCommand`) · `Deployment` · `Session` · `Approval` (`approve_plan | request_publish |
run_migration | approve_doc | activate_departments`) · `Thread`/`Message` · `AgentEvent` · `Memory` · `UsageEvent` /
`Subscription` · `GithubConnection`/`VercelConnection`/`SupabaseConnection` · `CanvasNode`/`Edge`/
`Collection`.

## §10 — How to add a new agent (the recipe)

> This recipe adds a **worker** (a runtime). Adding **capability** — a module or a field — is a
> different act with its own recipe: [framework.md](./framework.md) §8, instantiated across the tree
> in [map.md](./map.md). Most new departments start there; they come back here only if they need a
> new department agent (framework §3's executor rule).

1. **Contract** — `CONTRACT.md` (< ~150 lines, three-tier boundaries) → `Agent.contract`.
2. **Model** — pick in `Agent.models` (routine → Haiku, heavy → Sonnet/Opus).
3. **Tools** — its `*Tools.ts`: deterministic, idempotent, port-backed. New port only for a new system.
4. **Department row** — provision it (extend `onboarding/provision.ts`).
5. **Dispatch wiring** — `assign_to_department` exists; add `dispatch_to_<dept>` if it needs agent→agent.
6. **Surface** — department pill on the canvas; app cards if it has an app.
7. **Approvals** — mark which actions are irreversible so they stage an `Approval`.

The runtime, loop, dock, journal, and durability are shared — you write the contract, the tools, and the
wiring.

## §11 — Paper → substrate map (status)

| Paper component | Substrate | Status |
|---|---|---|
| Control plane: plan gate, dispatch, spawn/supervise | our code (AI-SDK tool-loops) | ✅ live |
| Environment verification loop | LLM judge + HTTP preview fetch + testCommand-in-sandbox | ✅ empirical (screenshots pending) |
| Ephemeral sandboxes | e2b behind the `Sandbox` port | ✅ live |
| Durable workers | BullMQ + Redis | ✅ live |
| Journaled lifecycle | `AgentEvent` + Artifact/Message rows | ✅ live |
| Secret broker | GitHub App installation tokens + per-task downscoped sandbox tokens; encrypted BYO | ✅ v1 (Vercel/Supabase scoping later) |
| Capability registry | model gateway, static routing | ✅ v1 (`Task.model` dead, escalation later) |
| Semantic index | Supabase pgvector + AST index | ⬜ not started |
| Metering | `UsageEvent` + `Subscription` | 🟡 metered, barely enforced |
| Re-planning (plan v2 on failure) | — | ⬜ not started |
