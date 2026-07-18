# Lu Harness — production implementation spec

> **What this is.** The bridge between the paper ([`paper.md`](../paper.md) — the target architecture) and the
> running system: which substrate implements each paper component, what is already built (checked, with file
> refs), what remains (unchecked, phased), and where we are drifting. Checkbox states verified against the
> code on **2026-07-17**. Siblings: [FOUNDATION.md](../FOUNDATION.md) (what Lu is),
> [DEVELOPMENT.md](../DEVELOPMENT.md) (live status), [building-agents.md](./building-agents.md) (how agents
> are built), [agent-backend.md](./agent-backend.md) (backend reference), [byo-connect.md](./byo-connect.md)
> (BYO actuation).

The paper's core positioning — **Lu is a harness that composes existing substrates, not a portfolio of novel
subsystems** — is also this spec's rule: every row below names a substrate we buy or adopt, and the only
things we build are the contracts between them (task schema, lifecycle, verification loop, handoffs).

## 0. Deployment model: hosted harness, BYO actuation

Lu is **BYOC in the credentials/accounts sense, not (yet) the run-in-your-VPC sense**:

- **Actuation is BYO** — agents act on the *customer's* GitHub / Vercel / Supabase / ledgers via
  org-connected accounts ([byo-connect.md](./byo-connect.md)). This is the paper's actuation model: the
  outcomes land in systems the customer owns. Platform-owned accounts remain only as the hosted/dogfood
  fallback (FOUNDATION §7 economics).
- **The harness is hosted** — control plane, journal, memory, metering, and the secret broker run on our
  Railway/Supabase/Redis. Customers never operate the harness.
- **Sandboxes are ours, credentials are theirs** — E2B compute is platform-provisioned; the customer's
  tokens enter it per task. This is exactly why credential scoping (§3 below) is on the critical path: the
  blast radius of a sandbox is defined by what we inject into it.
- **BYO-cloud (VPC) is a later enterprise tier, not v1** — the `Sandbox` / `Git` / `Deploy` / `Store` ports
  already isolate every substrate, so pointing them at customer-operated infra is a config problem, not a
  rewrite. Defer until an enterprise deal demands it.

## 1. Substrate map

| Paper component (§ in paper.md) | Substrate | Where in repo | Status |
| --- | --- | --- | --- |
| Control plane — plan gate, dispatch (§3.1) | Our code: AI-SDK tool-loops | `apps/api/src/agent/orchestrator.ts`, `orchestratorTools.ts` | ✅ live |
| Verification loop (§3.1) | LLM judge today → + Playwright-in-sandbox | `agent/engineeringTools.ts:558` `verify_acceptance` | 🟡 judge only, not empirical |
| Ephemeral sandboxes (§3.2) | **E2B** behind the `Sandbox` port | `apps/api/src/sandbox/e2b.ts` | ✅ live (per-run spawn/kill) |
| Durable async workers (§3.2) | **BullMQ + Redis** (Temporal-class engine not needed yet) | `apps/api/src/queue.ts`, `worker.ts` | 🟡 built, **inactive** (no `REDIS_URL` in prod) |
| Journaled lifecycle (§3.3) | Postgres (Supabase) — Artifact/Message rows today, `TaskEvent` table next | `packages/db/prisma/schema.prisma` | 🟡 partial (no event journal) |
| Semantic index (§3.3) | **Supabase pgvector** + embeddings; tree-sitter AST later | — (not started) | ⬜ |
| Secret broker (§3.3) | AES-256-GCM store + env-file injection today → **GitHub App** installation tokens, scoped Vercel/Supabase tokens | `apps/api/src/crypto/tokens.ts`, `git/octokit.ts`, `engineeringTools.ts:194` | 🟡 encrypted at rest, **not scoped/TTL'd** |
| Capability registry (§4) | `MODEL_REGISTRY` + `recommendModel` (static config, per the paper's "matching, not learned policy") | `packages/core/src/models.ts` | ✅ v1 (gaps below) |
| Cross-modal assets (§4) | gpt-image-1 live; **BFL Flux API** + **Higgsfield API** to wire | `engineeringTools.ts:421` `generate_image` | 🟡 one real model, two placeholders |
| Metering | `UsageEvent` + `Subscription`, inline meters | `agent/metering.ts`, `billing/usage.ts` | 🟡 metered, barely enforced |

Terminology bridge (paper ↔ repo): paper **Outcome** ≈ a plan's `acceptance[]` criterion (to be promoted onto
`Task`); **Environment Verification Loop** ≈ `verify_acceptance` (once empirical); **Capability Registry** ≈
the model gateway; **journal** ≈ Artifact/Message rows (until `TaskEvent`); **durable workers** ≈ BullMQ.

## 2. Control plane (paper §3.1)

**Built**
- [x] Orchestrator tool-loop, Sonnet default, per-turn model override from the dock (`orchestrator.ts:91,95`)
- [x] Goal → Task creation and department routing: `create_task`, `assign_to_department`,
  `dispatch_to_engineering`, `check_connections`, `list_status`, `ask_user` (`orchestratorTools.ts:68`)
- [x] **Plan gate**: `propose_plan` → plan `doc` artifact `{objective, steps[], acceptance[]}` + `approve_plan`
  Approval; owner approves / requests changes / rejects before any build (`orchestratorTools.ts:165-192`,
  [building-agents.md §5](./building-agents.md))
- [x] Acceptance verification v0: LLM judge scores build vs plan `acceptance[]`, prompt-driven rework via
  `run_coding_agent` (`engineeringTools.ts:558`, `engineering.ts:107`)
- [x] Publish is human-gated in code: production only via `confirmPublish` after owner Approval
  (`routes/approvals.ts:152`)

**To build** (P0 = correctness/safety, then in order)
- [x] **P0 — code gate on publish** *(shipped 2026-07-17)*: `request_publish` now refuses in code unless the
  task's latest acceptance check passed (`engineeringTools.ts` — returns `blocked/acceptance_not_passed`
  with the unmet items). The prompt rule is now enforcement, not trust.
- [ ] **P1 — empirical verification**: `verify_acceptance` fetches the preview URL (HTTP status + rendered
  content) and captures a screenshot via Playwright run *inside the E2B sandbox*; evidence attaches to the
  acceptance artifact. Today the preview URL is printed into the judge prompt but never fetched
  (`engineeringTools.ts:579-597`).
- [ ] **P1 — verification retry budget in code**: N attempts per acceptance run, failure must reproduce on an
  independent re-check before counting (flake vs fault), budget exhaustion escalates to the owner with the
  evidence attached. Today retries are a prompt suggestion inside a `stepCountIs(10)` loop.
- [ ] **P2 — promote acceptance onto `Task`** (`Task.acceptance` column): each criterion becomes the paper's
  Outcome tier — a verifiable unit with its own predicate — instead of living only in the plan doc.
- [ ] **P2 — honor dependencies**: write and read `Task.parentTaskId` + `needs_earlier` (both exist in schema,
  nothing sets them — `schema.prisma:105,240`); dispatch in dependency order. This is the paper's DAG, minimal
  form.
- [ ] **P3 — re-planning (versioned plans)**: on failed verification or build, Lu proposes plan v2 (a new plan
  artifact referencing the failure evidence) instead of dead-ending at `failed` (`dispatch.ts:22`,
  `worker.ts:53`). This is the paper's *G(i+1)* loop.
- [ ] **Later — full task schema**: capability profile + credential scopes as first-class `Task` fields, read by
  routing (§4) and the secret broker (§3).

## 3. Runtime, memory, secrets (paper §3.2–§3.3)

### Runtime

**Built**
- [x] E2B behind the `Sandbox` port (`spawn/exec/pty/kill`), fresh sandbox per `run_coding_agent`, always
  killed in `finally`, lifetime/boot/exec caps (`e2b.ts:41`, `engineeringTools.ts:361-416`)
- [x] Claude Code / Codex run headless inside the sandbox; transcript saved as `agent_session` artifact
- [x] Durable path: BullMQ `engineering` queue, `jobId = taskId` dedupe, `attempts: 3`, backoff, worker
  concurrency 3 (`queue.ts:59-69`, `worker.ts:31-43`)
- [x] At-least-once safety via domain-state idempotency (`create_site` reuses existing Site by slug,
  `engineeringTools.ts:296-308`)

**To build**
- [ ] **P0 — turn durability ON**: provision Redis on Railway and set `REDIS_URL`. The entire durable path is
  built but inactive; today prod builds are in-process fire-and-forget and a deploy mid-build loses the run and
  strands the task `in_progress` (`dispatch.ts:15-49`). Cheapest, highest-leverage item in this spec.
- [ ] **P1 — stuck-task reaper**: sweep tasks `in_progress` beyond a deadline back to `failed` (or re-enqueue)
  so crashes don't strand state.
- [ ] **P2 — prebuilt E2B template** with Claude Code / Codex preinstalled (`SpawnOpts.template` exists,
  no caller sets it — today every run pays `npm i -g` in a base image).
- [ ] **P2 — `TaskEvent` journal table**: append-only task lifecycle transitions (`PLANNED → DISPATCHED →
  EXECUTING → VERIFYING → COMMITTED/FAILED`) with evidence pointers. Makes the paper's "authoritative state
  lives in the journal" literally true; Artifacts/Messages remain the payloads.
- [ ] **P3 — external-event resume**: a webhook/poll endpoint that enqueues a continuation job (deploy finished,
  DNS propagated, third-party approval). The existing two-runs-bridged-by-an-Approval pattern
  (building-agents §6) stays for human gates; this covers machine events.
- [ ] **Later — step memoization** for `run_coding_agent` (event-sourced replay) when re-run cost bites.

### Memory

**Built**
- [x] Working memory: `Thread`/`Message`, last 20 rehydrated per turn (`routes/agents.ts:49-72`)
- [x] Core/long-term: `Memory` table injected into the system prompt, capped 12 items / 4000 chars
  (`agent/orgMemory.ts:13-36`); seeded from the onboarding business plan (`onboarding/provision.ts:120-128`)
- [x] Sleep-time consolidation: worker folds last 40 messages into a ≤200-word core summary on Haiku
  (`agent/consolidation.ts:15-46`) — **note: Redis-gated, so inactive until P0 above lands**

**To build**
- [ ] **P3 — pgvector on Supabase** + embeddings over docs/messages/artifacts; retrieval-by-relevance replaces
  dump-recent-plus-core-into-prompt (this is P8 of the AI plan; unblocked by nothing technical)
- [ ] **P4 — AST-aware code index** (tree-sitter over connected repos) so cross-agent handoffs query structure,
  not diffs — the paper's semantic index, second half
- [ ] **Later — retrieval telemetry**: log which memories/contexts actually influenced a turn (Langfuse already
  wired) to tune the index

### Secrets

**Built**
- [x] BYO tokens (GitHub/Vercel/Supabase) AES-256-GCM encrypted at rest, decrypted server-side only,
  org-scoped `Git`/`Deploy` ports resolve them per build (`crypto/tokens.ts:44`, `git/index.ts:42`)
- [x] Keys reach sandboxes via a sourced env file, never interpolated into command strings — so they stay out
  of captured transcripts (`engineeringTools.ts:44,194-201`)

**To build**
- [ ] **P0 — stop seeding platform keys into user-reachable terminals**: the cloud terminal currently sources
  the platform's `ANTHROPIC_API_KEY`/GitHub token into a shell the user can `cat` from
  (`routes/terminal.ts:120-126`; known leak, DEVELOPMENT.md). User terminals get BYO org tokens or nothing.
- [ ] **P1 — GitHub App**: mint real installation tokens (repo-scoped, ~1h TTL) instead of the PAT passthrough
  currently mislabeled `installationToken()` (`git/octokit.ts:179-183`). First true short-TTL, least-privilege
  credential — the paper's broker, phase 1.
- [ ] **P2 — scope + TTL the rest**: Vercel project-scoped tokens, Supabase per-project keys, rotation/expiry
  on all BYO connections (byo-connect.md already flags "no expiry/refresh/rotation").
- [ ] **P2 — per-task scopes**: task schema declares credential scopes (§2); the broker injects only those into
  the sandbox — today every coding sandbox gets the full key set `renderEnvFile` produces.
- [ ] **Later — egress allowlist** per sandbox derived from declared scopes; consider Supabase Vault/Infisical
  as the store if key volume grows.

## 4. Capability registry + metering (paper §4)

**Built**
- [x] `MODEL_REGISTRY`: multi-provider (Anthropic/OpenAI/Google/BFL/Higgsfield), per-model
  tier/speed/cost/bestFor metadata (`models.ts:105`)
- [x] Static role routing `recommendModel(role, modality)` — deliberately config-matching, which is exactly the
  paper's routing posture ("a matching step, not a learned policy") (`models.ts:291-345`)
- [x] Per-turn user override of the orchestrator model from the dock picker (`routes/agents.ts:35`)
- [x] Real image generation via gpt-image-1 (`engineeringTools.ts:421`)
- [x] Metering: `meterLlm`/`meterSandbox` after every model/sandbox use → `UsageEvent`; `Subscription` bucket
  (`agent/metering.ts`, `schema.prisma:443,520`)

**To build**
- [ ] **P1 — resurrect `Task.model`**: thread it through `POST /api/engineering` → `EngineeringJob` →
  `runEngineering` (dead column today — `queue.ts:16`, `worker.ts:38`), and reconcile the in-sandbox
  `CODING_MODEL = "sonnet"` pin (`engineeringTools.ts:204`) with the registry's coding→Opus mapping: one
  registry-driven decision, not two contradictory ones.
- [ ] **P1 — enforce the bucket everywhere**: `POST /api/engineering` skips the usage gate entirely, and
  `overageOptIn` defaults `true` so the only existing gate (`orchestratorTools.ts:152-156`) never trips.
  Decide the default, gate both entry points. (AI-plan P6.)
- [ ] **P2 — wire Flux (BFL API) and Higgsfield** into `generate_image` (placeholder artifacts today,
  `models.ts:273-279`) — this makes the paper's cross-modal claim real.
- [ ] **P2 — real prices** in `pricing.ts` (current rates are flagged placeholders).
- [ ] **P3 — escalation routing**: cheap-first, escalate on failure/low confidence (the "layer 2" the registry
  comment defers). Registry metadata for reasoning-depth/context-density axes comes with it.

## 5. Drift assessment (2026-07-17)

**Verdict: the skeleton is on track; the drift is concentrated in three places, all fixable without
architectural change.** The substrate choices already made (E2B behind a port, plan gate, BullMQ, encrypted
BYO tokens, model registry, Prisma/Supabase state) map one-to-one onto the paper. Nothing built contradicts
the target shape.

**Real drift (product must move):**
1. **Verification isn't empirical — and the publish gate is prompt-only.** `verify_acceptance` judges text
   (diff + transcript + an *unfetched* URL), and nothing in code stops `request_publish` after a failed
   verify. This drifts from the paper's central claim (empirical Environment Verification Loop). Fix = §2 P0+P1.
2. **Durability is built but switched off.** No `REDIS_URL` in prod means fire-and-forget builds, lost runs on
   deploy, stranded tasks — the paper's "executions survive their containers" is currently false in prod.
   Fix = §3 P0 (a provisioning task, not an engineering one).
3. **Secrets are broad and long-lived.** Full platform keys and raw PATs enter sandboxes; terminals leak
   platform keys to users. The paper's JIT/least-privilege broker exists only as encryption at rest.
   Fix = §3 secrets P0→P2.

**Divergences where reality is fine and the paper should note it (not drift):**
- **No mid-run suspend** — building-agents §6's "two runs bridged by an Approval" is a legitimate
  implementation of the paper's suspension for *human* gates; only *machine*-event resume (§3 P3) is missing.
- **Domain-state idempotency instead of idempotency keys** — adequate at current scale; revisit with the
  `TaskEvent` journal.
- **Goal → Plan → Task vs the paper's Goal → Outcome → Task** — the plan's `acceptance[]` criteria *are* the
  Outcome tier in embryo; promoting them onto `Task` (§2 P2) closes the naming gap without remodeling.

**Docs hygiene (fixed in the 2026-07-17 cascade pass):**
- `planning.md` (built, mostly historical) was folded into [building-agents.md §5](./building-agents.md)
  and deleted; its unbuilt remainder lives in §2 of this spec.
- `building-agents.md`/`agent-backend.md` say coding = Opus; the code pins the in-sandbox agent to Sonnet
  (`engineeringTools.ts:204`). Whichever is intended, make the doc and the registry agree (§4 P1).
- `DEVELOPMENT.md` self-flags "shipped — reconcile" on memory/metering rows; this spec's checkboxes are that
  reconciliation — fold them back into DEVELOPMENT.md's tracker.
- `paper.md` was cross-linked from nowhere; this spec is now the link.

## 6. Phase order at a glance

| Phase | Items | Why first |
| --- | --- | --- |
| **P0** | Publish code-gate · `REDIS_URL` on · terminal key-leak fix | Correctness + safety; two are config/one-liner scale |
| **P1** | Empirical verify + retry budget · GitHub App tokens · `Task.model` threading + coding-model reconcile · bucket enforcement · stuck-task reaper | Makes the paper's two headline claims (verify, broker) real |
| **P2** | `Task.acceptance` · dependencies honored · `TaskEvent` journal · scoped/TTL BYO tokens · per-task scopes · E2B template · Flux/Higgsfield · real prices | First-class task schema = the harness contract |
| **P3** | Re-planning (plan v2) · webhook resume · pgvector retrieval · escalation routing | The closed-loop, long-horizon layer |
| **P4+** | AST index · egress allowlists · step memoization · VPC/BYO-cloud tier | Scale/enterprise |
