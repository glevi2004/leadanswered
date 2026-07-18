# Lu Computer — the agent backend (reference)

> The backend **reference**: the tables, the agent CONTRACT, the model gateway, memory, and hosting
> surfaces — the parts no other doc owns. For *how agents are built and run* (the loop, ports, the plan
> gate, the Engineer, durability, the recipe) see the handbook: **[building-agents.md](./building-agents.md)**.
> Target architecture: [paper.md](../paper.md); implementation plan + drift: [harness-spec.md](./harness-spec.md);
> live status: [DEVELOPMENT.md](../DEVELOPMENT.md).

## 1. Data model — the agent-OS tables (`packages/db/prisma/schema.prisma`)

All org-scoped and additive (scalar `orgId`, no FK to `Organization`, so they compose freely):

- **Department** — `orgId`, `key` (engineering/support/finance/sales/marketing/design/operations/legal),
  `status` (`active | in_development`, per-org), `context` (facts + policy slice).
- **Agent** — `orgId`, `departmentKey`, `name`, `role`, `contract` (markdown — the identity file, §2),
  `models` (reasoning + generation model ids, §3), `status`. **ContractRevision** — versioned history.
- **Task** — `orgId`, `departmentKey`, `agentId`, `title`, `body`, `status`
  (`agent_can_do | needs_input | needs_earlier | in_progress | needs_approval | done | failed`),
  `parentTaskId` (decomposition tree), `input`/`result`, `model` (per-task override), `assignedBy`.
  *(Honest note: `needs_earlier`, `parentTaskId`, and `Task.model` exist in schema but nothing writes/reads
  them yet — promoting them is [harness-spec](./harness-spec.md) §2 P2 / §4 P1.)*
- **Artifact** — `orgId`, `taskId`, `agentId`, `kind` (`file | image | site_preview | pr_diff | doc |
  agent_session | note | …`), `title`, `payload`. Plans, acceptance reports, transcripts, and previews are
  all Artifacts.
- **Site** — `orgId`, `departmentKey`, `repoFullName`, `vercelProjectId` (the **owner's own** Vercel — BYO),
  `domain`, `status`. **Deployment** — `siteId`, `env`, `url`, `sha`, `prNumber`, `status`.
- **Session** — the sandbox/terminal: `sandboxId`, `agentKind`, `repo`, `status`.
- **GithubConnection / VercelConnection / SupabaseConnection** — the org's **own** providers, connected by
  **token-paste today** (verified against the provider, AES-256-GCM encrypted at rest); OAuth/GitHub-App
  installs are Phase 2 ([byo-connect.md](./byo-connect.md)).
- **Approval** — the human gate: `orgId`, `taskId`, `action` (`request_publish | approve_plan |
  activate_departments`), `status`, `decidedBy`. Feeds "Needs you".
- **Thread / Message** — working memory: the persisted Lu conversation (last 20 rehydrated per turn).
- **Memory** — core/long-term org memory (`tier`, `key`, `content`), injected into Lu's prompt; seeded at
  onboarding; consolidated by the sleep-time worker.
- **UsageEvent / Subscription** — metering: per-call llm/sandbox usage events + the org's bucket.
- **CanvasNode / Edge / Collection** — the canvas layer ([canvas.md](./canvas.md)).

Agents read/write only through the **`Store` port** (`apps/api/src/store/`, `PrismaStore` in prod /
`MemoryStore` for tests) — never the DB directly.

## 2. The agent CONTRACT — its identity file

Each agent is a **`CONTRACT.md`** — one human-readable markdown file that defines it and compiles into its
system prompt (`assembleAgentSystemPrompt`, `packages/core`). It's the agent's employment contract — *who it
is* — deliberately distinct from a repo's `AGENTS.md` (*how this codebase works*); the Engineer reads both.

**Template** — keep it **< ~150 lines**, boundaries as three tiers (**Always / Ask-first / Never**):

```markdown
# {Agent Name} — {Department}  {pixel avatar}
## Role         one line: what I'm hired to do + the outcome I own
## Duties       the work that lands in my Tasks
## Boundaries   Always do · Ask first (→ approval) · Never do      ← three-tier
## Voice        tone + personality
## Knowledge    business facts + policy I operate under (the context — the moat)
## Playbooks    how I do the recurring things, this business's way
## Models       my reasoning model + my generation models + why (§3)
```

**Lifecycle:** drafted by Lu at hire → editable (a dock editor, or conversationally — "Lu, tell Finance to
always offer Pix" writes the right section) → versioned (`ContractRevision`) → compiled into the system
prompt → self-tuning later (the agent proposes edits; the owner approves). Two levels: a company contract
every agent inherits + each agent's own. For Engineering, the contract is also committed into the repo so
the sandbox reads it.

## 3. The model gateway — any provider, any modality

Provider-agnostic registry + router (`packages/core/src/models.ts`): per-model metadata (provider ·
modality · tier · speed · cost · best-for) + per-role recommendation (`recommendModel`). This is the paper's
**Capability Registry**, v1: routing is deliberately static config-matching; escalation routing and
richer axes are [harness-spec §4](./harness-spec.md).

- **Reasoning** — Anthropic / OpenAI / Google wired; xAI/Grok roadmap. Per-agent (`Agent.models`) +
  per-task (`Task.model`) overrides exist in schema; the per-task path isn't threaded yet (harness-spec §4 P1).
- **Generation** — image via `gpt-image-1` (real); **Flux / Higgsfield are placeholders** (harness-spec §4
  P2); video/audio later.
- **Tiering by role** — orchestrator→Sonnet, coding→Opus *(registry; the in-sandbox pin is Sonnet today —
  same P1)*, routine→Haiku.
- **Recommendations** — a static role/modality map surfaced as "Recommended" in the picker; Lu-driven
  auto-escalation (`recommend_model`) is future work.

## 4. Memory — what's live vs the target

**Live:** working memory (`Thread`/`Message`, last-20 rehydrate) · core/long-term memory (`Memory` rows
injected into the prompt, capped) · sleep-time consolidation (a worker folds recent conversation into a core
summary — Redis-gated) · Langfuse telemetry. Context flows: onboarding interview → org memory →
`Department.context` → the agent's system prompt.

**Target** (the paper's semantic index — [harness-spec §3](./harness-spec.md)): pgvector
retrieval-by-relevance over docs/messages/artifacts, then an AST-aware code index for cross-agent handoffs.

## 5. Hosting — two surfaces (BYO by default)

What agents build lives in the **customer's own accounts** ([FOUNDATION §7](../FOUNDATION.md)):

- **(A) DB-rendered content site** *(optional, later)* — pages/theme as data on ONE Lu-managed multi-tenant
  Vercel project (`*.lu.computer` wildcard; PSL hygiene) — the free-preview path and the seed of the
  managed-metered hosting tier.
- **(B) Real coding** *(the built path)* — repo in the customer's GitHub, deploys to their Vercel, backend
  on their Supabase; Lu is payer-of-record for nothing but its own SaaS + metered sandboxes.
