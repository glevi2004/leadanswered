# Lu Computer — Build Map & Status

> The one place that answers **"where are we, and what's left?"** Grounded in the actual code
> (re-verified 2026-07-17). Companion to the spec — [paper.md](./paper.md) = *the theory*,
> [FOUNDATION.md](./FOUNDATION.md) = *what it is*, [docs/harness-spec.md](./docs/harness-spec.md) =
> *paper → substrates, the phased implementation checklist*, [ROADMAP.md](./ROADMAP.md) = *the product
> order*, [MANIFESTO.md](./MANIFESTO.md) = *why*. Deep dives: [docs/building-agents.md](./docs/building-agents.md)
> (how agents are built) · [docs/canvas.md](./docs/canvas.md) (the surface) ·
> [docs/agent-backend.md](./docs/agent-backend.md) (reference). **This is a living checklist: check the
> boxes as we ship.**

Legend: **✅ built & working** · **🟡 built but partial/fragile** · **⬜ not built yet**

---

## 1. The system at a glance

```mermaid
flowchart TB
  subgraph owner[" "]
    B["Owner's browser"]
  end
  subgraph ours["Our infra (cheap, multi-tenant SaaS)"]
    W["apps/web — Next.js<br/>onboarding · canvas · dock<br/>(Vercel)"]
    A["apps/api — Express + worker<br/>the agent runtime<br/>(Railway)"]
    DB[("Supabase Postgres<br/>via Prisma")]
  end
  subgraph metered["Metered compute (per task, ephemeral)"]
    E["e2b sandbox<br/>Claude Code CLI"]
  end
  subgraph byo["Customer's OWN accounts (BYO)"]
    GH["GitHub"]
    VC["Vercel"]
    SB[("Supabase")]
  end
  B -->|"session, same-origin"| W
  W -->|"proxy — resolves the org server-side"| A
  B -.->|"wss:// cloud terminal"| A
  A --> DB
  A -->|"dispatch a build"| E
  E -->|"clone / commit / push"| GH
  A -->|"open PR · deploy · promote"| VC
  VC <-->|"preview & prod builds"| GH
  A -.->|"DB console (read-mostly)"| SB
```

## 2. "Build me a website" — the end-to-end flow

```mermaid
sequenceDiagram
  actor You
  participant Lu as Lu · orchestrator (Sonnet)
  participant Eng as Engineer (Opus)
  participant Box as e2b sandbox
  participant GH as GitHub
  participant VC as Vercel

  You->>Lu: "build me a website"
  Lu->>Lu: create_task + dispatch_to_engineering
  Note over Lu,Eng: agent→agent · GATE: GitHub + Vercel must be connected
  Lu->>Eng: run build (via worker)
  Eng->>GH: create_site — repo from starter template
  Eng->>Box: run_coding_agent — Claude Code writes the site
  Box->>GH: commit + push branch
  Eng->>GH: open PR
  Eng->>VC: create project + preview deploy
  Eng-->>You: task → needs_approval (preview link + PR diff)
  You->>Eng: Publish ✅ (approval)
  Eng->>GH: merge PR
  Eng->>VC: promote to production
  Note over You,VC: site is live
```

---

## 3. The build tracker

### Runtime & orchestration
- [x] **Lu orchestrator** — real Sonnet tool-loop; persists the thread; tools: `create_task`, `dispatch_to_engineering`, `check_connections`, `ask_user`. `apps/api/src/agent/orchestrator.ts`
- [x] **Agent→agent dispatch** — Lu dispatches the Engineer *inside the runtime* (the old hard-coded web hand-off is gone). `agent/dispatch.ts`, `agent/orchestratorTools.ts`
- [x] **Planning — the plan gate** *(built 2026-07-17)* — Lu now **plans first**: `propose_plan` drafts a plan (a `doc` artifact — objective · steps · acceptance) and stages an **`approve_plan`** gate *instead of* building; the plan renders as a review card in the chat (`LuBuildTracker` + `PlanApprovalCard`), and **approving it dispatches the Engineer using the plan as its brief** (`routes/approvals.ts` branches the resolve on the action). The **actionable roadmap** ships too — every dock "next" (Connect GitHub, etc.) fires a Lu intent, not a dead link (`DockHome`/`dock-data`). Spec: [docs/building-agents.md](./docs/building-agents.md) §5. Approve / **Request changes** (Lu re-plans with the owner's feedback) / Reject are all wired. 🟡 Remaining: promote `Task.acceptance` + dependency ordering ([harness-spec](./docs/harness-spec.md) §2 P2).
- [x] **Acceptance verification** *(built 2026-07-17)* — after `open_preview` the Engineer runs **`verify_acceptance`**: an LLM judge scores the build against the plan's acceptance criteria; on `unmet` it **reworks** (`run_coding_agent` again) and re-verifies before `request_publish` (`engineeringTools.ts` + `engineering.ts`). 🟡 One honest gap left *(2026-07-17)*: the judge sees only **text evidence** (diff + transcript; the preview URL is printed, never fetched — no browser/HTTP check) — [harness-spec](./docs/harness-spec.md) §2 P1. ✅ The publish **code-gate** shipped (2026-07-17): `request_publish` refuses in code until the latest acceptance check passed. ✅ **The flow layer shipped too** ([docs/workflow.md](./docs/workflow.md)): the `AgentEvent` journal, Lu's per-turn situational block, report-back messages into the thread (preview ready / published / failed / plan approved), thread rehydration + live merge in the dock, the honest approvals badge, and the first Coming-soon honesty sweep.
- [x] **Store port** — Prisma (prod) + in-memory (test); Tasks/Sites/Approvals/Deployments/Connections fully implemented.
- [x] **Model gateway + tiering** — multi-provider registry + per-role recommendation + a dock model picker. `packages/core/src/models.ts` 🟡 **Discrepancies** *(2026-07-17)*: the registry says coding→Opus but the in-sandbox coding agent is pinned `CODING_MODEL="sonnet"` (`engineeringTools.ts:204`), and `Task.model` is a dead column (never threaded into `runEngineering`) — [harness-spec](./docs/harness-spec.md) §4 P1.
- [x] **Usage metering + working/core memory** *(reconciled 2026-07-17 against code)* — metering ✅ (`UsageEvent` after every model/sandbox call + `Subscription` bucket; the only gate is in `dispatch_to_engineering` and `overageOptIn` defaults true so it never trips — enforcement is [harness-spec](./docs/harness-spec.md) §4 P1); working memory ✅ (`Thread`/`Message`, last-20 rehydrate); core memory ✅ (`Memory` rows into the prompt). 🟡 **Sleep-time consolidation is built but Redis-gated** — inactive until `REDIS_URL` (same switch as the worker).
- [x] **Durable worker — LIVE** *(2026-07-18)* — Redis exists in the Railway project and `REDIS_URL` is set; deploy log confirms `[worker] engineering worker started (concurrency 3)` + `[worker] memory-consolidation worker started` (`worker: bullmq`). Builds survive redeploys; sleep-time consolidation runs. 🟡 Remaining: a stuck-task reaper for `in_progress` strays ([harness-spec](./docs/harness-spec.md) §3 P1).
- [x] **Spawn/supervise sub-agents** *(built 2026-07-18)* — Lu's `spawn_agent` creates ORDERED children under a parent (`parentTaskId` + `needs_earlier` finally real); the supervisor (`agent/supervise.ts`) advances the cascade on every run end (worker, in-process, publish): next sibling dispatches, a failure pauses the parent at `needs_input` + asks the owner, all-done completes the parent — journaled + reported into the thread. `Task.acceptance` is first-class (per-subtask criteria feed verify + the publish gate).
- [ ] ⬜ **xAI / Grok** in the gateway.

### The Engineer — the build pipeline
- [x] **create_site** — creates a real private GitHub repo from a template + a `Site` row; idempotent.
- [x] **run_coding_agent** — boots a **real e2b sandbox**, runs the **Claude Code CLI headless**, commits + pushes `lu/build`, saves the full transcript as an `agent_session` artifact.
- [x] **open_preview** — real PR + Vercel project + preview deploy; records `pr_diff` + `site_preview` artifacts; flips the task to `needs_approval`.
- [x] **request_publish → confirmPublish** — real human-in-the-loop gate; owner-approved merge + promote-to-prod (a server action, not a model tool).
- [x] **Cloud terminal** — `wss /api/terminal` ↔ e2b pty ↔ xterm.js node on the canvas.
- [ ] 🟡 **generate_image** — `gpt-image-1` is real; **Flux / Higgsfield are placeholders**.
- [ ] 🟡 **Reliability gaps** (fine for dogfooding, break a real BYO user): hardcoded **private** template `glevi2004/lu-site-starter`; `{slug}.lu.computer` domain assumed on the customer's Vercel; preview poll ≈24s (shorter than a real build); no post-build reconciliation.

### BYO connect — GitHub · Vercel · Supabase
- [x] **Token-paste + verify + encrypted storage** — all three providers; verified against the provider API; AES-256-GCM at rest. `routes/connect.ts`, `crypto/tokens.ts`
- [x] **Org-scoped git/deploy ports** — per-org token with env fallback (the dogfood path).
- [x] **Dispatch gate** — the Engineer is only dispatchable once **GitHub + Vercel** are connected (`connect/status.ts`).
- [ ] 🟡 **GitHub for *any* user** — works via a pasted PAT, but blocked by the private template, the `GITHUB_OWNER` env owner-override (repos land in the platform's org), and the raw PAT sprayed into the sandbox.
- [ ] 🟡 **Vercel for *any* user** — works via a pasted token, but blocked by the `lu.computer` domain assumption + the undocumented manual **Vercel↔GitHub app install**.
- [ ] 🟡 **Supabase** — **console-view only** (the UI even drops the management token); the service key never reaches the build, so "the Engineer builds into your Supabase" is not yet code. Only needed for apps with a backend, not a basic website.
- [ ] ⬜ **Real OAuth** — no GitHub-App install / Vercel Integration / Supabase OAuth anywhere; token-paste only. (Target design: [docs/byo-connect.md](./docs/byo-connect.md).)
- [ ] ⬜ **Storage correctness** — no `@@unique([orgId])` on the connection tables → non-atomic `findFirst→create` upsert → duplicate/stale tokens under concurrency.
- [ ] ⬜ **Token expiry / refresh / rotation** — none.

### Owner visibility — "watch Lu build"
- [x] **Live task tracker** — real `Task` rows polled every 3s across **5 surfaces**: Lu chat, dock Home, dock Tasks, canvas (agent spinner/badge), department page.
- [x] **Live site previews** — real deploy iframes on the canvas + department page ("Building…" until a URL exists).
- [x] **Publish gate UI** — real Publish/Reject → merge + promote.
- [ ] 🟡 **Depth in the chat** — where you *ask*, you get task rows + a spinner: no subtask breakdown, no build logs, no PR diff. The rich detail (transcript, diff) exists but is **buried** in the canvas → Engineering agent panel.
- [ ] 🟡 **Persistence of the watch** — the in-chat build tracker lives in React state → a page reload empties it (the tasks survive server-side).
- [ ] 🟡 **`/home` is stale** — the default landing surface is a one-shot server render, not live.
- [ ] ⬜ **Chat → deeper-view links** after "dispatched the Engineer"; ⬜ **Revert All / Request-changes** (currently toast stubs).

### Canvas & dock
- [x] **Canvas** — pan/zoom plane; Lu + department pills + resource nodes (terminal/note/file/folder/site); edges-as-grants; Engineering depth-cards.
- [x] **Canvas persistence** — CanvasNode/Edge routes + web client (positions/nodes persist to the DB) *(per earlier audit; reconcile)*.
- [x] **Cofounder dock** — Home / Lu / Company / Tasks / Library tabs.
- [x] **Frame sizing + re-space pass** — nodes enlarged to ~75% of the dept cards, tighter corners *(this session)*.

### Onboarding *(v2 — two phases, [docs/onboarding.md](./docs/onboarding.md))*
- [x] **Waitlist-gated self-serve** — real Supabase org; sign-up flips `onboardingComplete`.
- [x] **Real-data only** — the Mature/New demo-profile / injected-org system is fully removed.
- [x] **Phase 1 — static sign-up** — `OnboardingFlow.tsx` (name → role → idea stage → company) → `finishSignup` seeds Lu's memory (no dept activation) → `/canvas`. *(Old scripted wizard `OnboardingSketch` parked.)*
- [x] **Phase 2 — Lu onboards you in-workspace** — general **skill system** (`apps/api/src/agent/skills/`); onboarding-mode (derived: no active dept) swaps Lu's toolkit; `propose_decisions` + `draft_business_plan` → decision cards + Business Plan doc → **Accept & activate departments** boots the company. Typechecks; not yet click-tested live.
- [ ] ⬜ **Connect step at build-time** — nothing enforces or explains GitHub+Vercel at the moment a build needs them.
- [ ] 🟡 **Onboarding polish** — suppress the generic dock welcome during onboarding; live end-to-end pass; optionally trim the legacy config schema to the builder shape.

### Platform / infra / security  *(gates external users)*
- [x] **API auth** *(shipped 2026-07-18)* — `/api/*` requires the `x-lu-proxy-secret` header (`API_PROXY_SECRET` set on Railway + Vercel; every server-side web fetch sends it; smoke-tested: no-header → 401). Was the cross-tenant blocker.
- [ ] 🟡 **Terminal secret exposure** — the cloud terminal seeds the platform's GitHub/Anthropic keys into a user-reachable shell *(security review)*.
- [ ] ⬜ **Supabase RLS in migrations** — RLS exists only as hand-applied prod state, not reproducible from the repo.

### The FULL-SETUP milestone — "Lu operates my entire GitHub/Vercel/Supabase" *(agreed 2026-07-18, in order)*
- [ ] ⬜ **1. GitHub sandbox-token downscoping + branch protection** — mint the sandbox a per-task token (ONE repo, `contents:write` only, 1h — GitHub's mint API takes `repositories` + `permissions`); full-perm token stays server-side (create repo, gated merge). Protect `main` at repo creation (block force-push/deletion, no required reviews so the gated merge still works). Closes the one live capability gap ([harness-spec](./docs/harness-spec.md) §3 "per-task scopes").
- [ ] ⬜ **2. Existing-project import** — point Lu at an EXISTING repo (the App install already scopes which) + link its existing Vercel project; the rest of the pipeline (clone → branch → PR → preview → verify → gated merge) is repo-agnostic already. This is agent-backend's old "rung v1", finally first-class.
- [ ] ⬜ **3. Supabase build tools + THE MIGRATION GATE** — `provision_backend` (env-var the selected project into the Vercel app) + `run_migration`; migrations NEVER hit prod DB directly: preview branch (the Environment scope) or an explicit approval. Design requirement, not polish.
- [ ] ⬜ **4. Empirical verification** — verify_acceptance fetches + screenshots the preview (headless browser in the sandbox) and, for DB apps, exercises live flows ([harness-spec](./docs/harness-spec.md) §2 P1).
- [ ] ⬜ **(later) Railway as a deploy target** — a second `Deploy`-port adapter (Railway GraphQL API, token-paste connect — no OAuth program) for long-running servers/workers the Engineer builds; Vercel stays the static/frontend target.

### Before a real DESIGN PARTNER connects  *(the "external users" checklist, 2026-07-18)*
- [ ] ⬜ **Make the GitHub App public** — currently "Only on this account" (app settings → Advanced → Make public), else a partner can't install it.
- [ ] ⬜ **Make the Vercel Integration public/unlisted** — same: a partner needs to be able to install it.
- [ ] ⬜ **Regenerate the two OAuth secrets that passed through chat** — the Vercel Integration client secret + the Supabase OAuth client secret (rotate in each console → new value via a local file → swap the Railway/local env). (The Supabase OAuth app is already installable by any Supabase org — nothing to flip there.)
- [ ] 🟡 **Terminal secret exposure** (above) — must land before non-owners get a terminal.

### The company — the other departments
- [x] **Engineering** — the flagship, operational.
- [ ] ⬜ **Support · Finance · Sales · Marketing · Design · Operations · Legal** — prompt-forbidden + unprovisioned (each follows the Engineer's pattern).

### Channels
- [ ] ⬜ **Phone (SMS/voice) · Email inbox · Slack** — none built.

### Debt & cleanup
- [x] **Demo/mock removal** *(this session)*.
- [ ] 🟡 **Sarah→Lu rename** (~59 refs) + `@leadanswered/*` package names + `leadanswered.com` in env/cookies + the `/sarah` route.
- [ ] 🟡 **Landing-page** still carries old-product positioning (rewrite pass).

---

## 4. The critical path — "any owner builds a website, reliably"

The shortest ordered path from "works when I dogfood it" to "a design partner can use it". *(The
harness-side P0s — the publish code-gate, `REDIS_URL`, the terminal key-leak fix — interleave with this
list; they're tracked with checkboxes in [harness-spec.md](./docs/harness-spec.md) §6.)*

1. ⬜ **Auth on `apps/api`** (shared proxy→api secret, then signed per-request org) — unblocks safe external use; prerequisite for everything below.
2. 🟡 **Public/Lu-owned starter template** + drop the `GITHUB_OWNER` override — GitHub works for any user's own account.
3. 🟡 **Real domain** — the owner's domain, or a `*.lu.computer` wildcard on **our** Vercel (not theirs) — plus surface the Vercel↔GitHub install — so deploys actually publish.
4. 🟡 **Activate the durable worker** (`REDIS_URL`) — builds survive crashes/redeploys.
5. 🟡 **Widen the preview poll + add reconciliation** — previews reliably appear instead of empty-on-first-pass.

After that it's a real product. **Depth-in-chat** (logs/subtasks in the conversation) and **one-click OAuth connect** are polish that make it *sing*, not gates.

---

## 5. The milestone: Lu builds Lu (dogfood)

Hand Lu a task → a fleet of coding agents build it **durably** → it **ships to real infra** → we use Lu to build the rest of Lu (the other departments, channels, presets). The pipeline above already runs end-to-end with the platform's own creds — so the milestone is gated mainly by **durability (worker)** + **reliability (items 2–5)**, not by unbuilt machinery.
