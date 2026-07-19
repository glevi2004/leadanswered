# The Map — the tree, instantiated

> Every field on the map, authored to the depth the framework demands: charter · minimum module set ·
> executor · and every module's slots ([framework.md](./framework.md) §3 — purpose, outcome
> vocabulary, artifact types, skills, tools, situations, scorecard slice, scoping fragment, panel).
> Authored 2026-07-19 (G1: full instantiation, D4). Depth rule: **later authoring must be
> transcription, not design** — an engineer (or Lu) building any module below starts from its entry
> and its skills, never from a blank page. `work/company/steering` and `engineering` are at full
> nine-slot depth and verified against code; every other field is complete but compressed. Research
> grounding comes from the Field Book (roadmap.md Part II, absorbed here; per-domain sources cited
> there remain valid). Supersedes roadmap.md Part II jointly with framework.md.

## How to read an entry

- **archetype** `actuation` (all slots, empirical verification) or `advisory` (conversation +
  artifacts; promotable when a port arrives) — framework §3.
- **executor** `lu` or the field's department agent — framework §3's executor rule.
- **skills** `custom:<name>` = authored by us (framework §4 format). `(base: X)` = forked/adapted
  from the anthropics/skills catalog entry `X`; `(ref: X)` = the catalog entry is loaded as a
  reference resource inside our skill. Catalog enumerated from the live repo 2026-07-19 (17 skills:
  algorithmic-art · brand-guidelines · canvas-design · claude-api · doc-coauthoring · docx ·
  frontend-design · internal-comms · mcp-builder · pdf · pptx · skill-creator · slack-gif-creator ·
  theme-factory · web-artifacts-builder · webapp-testing · xlsx). Note the honest finding: the
  catalog covers *artifact-production crafts*, not domain operating procedure — there is no
  "sales pipeline" or "bookkeeping" skill to vendor. Domain procedure is ours to author; the catalog
  supplies the production crafts underneath. `skill-creator` is itself the tool for authoring-recipe
  step 2 (framework §8).
- **panel** — what the module contributes to its field's workspace (framework §6: artifacts + gated
  actions, nothing else).
- **situations** — authored in framework §4's rule format. Convention for every entry below: the
  slot lists the rules a module *matches* AND the journal kinds it *emits* (cross-module wiring is
  authored on both sides); stateful predicates ("twice") live as counters in artifact payloads.
  Progress surfaces (checklists) are declared artifact types, never UI-only state.

## The tree (v1, decided)

```
YOU  (the root — not a field; mini-charter in framework §2)
│
├── work
│   ├── company                        ← world · ACTIVE (the Business world)
│   │   ├── steering                   ← world-core module (not a sub-field)
│   │   ├── engineering                ← ACTIVE (the Engineer)
│   │   ├── design                     ← next
│   │   ├── marketing
│   │   ├── sales
│   │   ├── finance
│   │   ├── support
│   │   ├── operations
│   │   └── legal
│   ├── studio-dev                     ← world: build software, no company wrapper
│   └── career                         ← field: the job, freelancing, the craft
│
└── personal                           ← world
    ├── steering                       ← world-core module (absorbs the old personal/goals)
    ├── finance
    ├── health
    ├── learning
    └── admin
```

Changes from the old tree, each a decision not a drift: **`personal/goals` is dissolved into
`personal/steering`** — "what you want, tracked and driven" IS the personal world's steering loop
(GTD weekly review + 12-Week Year = its heartbeat + reset), answering roadmap Part II's open
question. **`career`** stays (D4: everything) as a field, not a world — it has no sub-fields.
**Product is not a department** (steering owns what-to-build); **People/HR folds under operations**
until hiring is recurring; **data/analytics is every field's CHECK step**, not a branch — the
missing-branches audit's conclusions carry forward unchanged.

---

# THE ROOT — YOU

Per framework §2's mini-charter: one root-attached, mode-gated skill — `custom:person-scoping`
(first contact: 2-3 questions — what should Lu call you · what are you here to do (picks the first
world) · how do you want her to work (pace, formality)); one artifact type — **person-context** (the
*You* folder; today: seeded from sign-up into `Memory` rows — the doc form is the target); read by
every field, written by none. No modules, no workspace.

---

# WORLD: `work/company` — ACTIVE

**Charter.** Purpose: run the owner's business as a system — scope it, drive a 90-day current
outcome, break it into department work, verify, review, reset. Cadences: heartbeat **weekly** (the
L10-derived agenda: scorecard → outcome progress → issues → commitments) · reset **quarterly**
(grade ≥80%, keep/kill, set next) · vision annually. Scorecard: composed from department slices +
steering's own (% measurables on track · outcome completion % · issues resolved/wk · moves completed
vs committed). Field situations: the activation gate · the quarterly reset · **cash triage
re-trigger** (any signal the payroll screen would catch → the recover script, regardless of context).
Setup arc (world skill): today's `onboarding.md` = scope (the interview tree) → connect → blueprint
→ first ship — the reference world arc.

**Minimum module set:** steering (the world IS steerable at activation; departments activate
separately). **Executor:** `lu` for steering; departments name their own.

## Module `company/steering` — world-core · advisory · executor `lu` · SHIPPED (in all but name)

| Slot | Content |
|---|---|
| Purpose | the world loop: understand → current outcome → research → break down → moves → check, over the whole company |
| Outcome vocabulary | agreed 90-day outcome (predicate: written + owner-accepted) · approved plan (predicate: `approve_plan` resolved) · weekly review completed · quarterly reset completed |
| Artifact types | **business-context** (wing-flexed sections per the interview) · **plan** `{objective, steps[], acceptance[]}` · **strategy/note** docs · the outcome list · the issues list |
| Skills | `custom:company-scoping` (the interview tree — exists: `apps/api/src/agent/skills/onboarding.md`, world-attached, mode-gated) · `custom:heartbeat` (situation-fired weekly; the L10 agenda; **does not exist**) · `custom:reset` (situation-fired quarterly; **does not exist**) · (base: doc-coauthoring for strategy docs) |
| Tools | `create_task` · `assign_to_department` · `propose_plan` · `draft_doc` · `spawn_agent` · `list_status` · `check_connections` · `show_connect_form` · `ask_user` — all exist (`agent/orchestratorTools.ts`) · scoping adds `update/finalize_business_context` (`onboardingTools.ts`) |
| Situations | event: plan_proposed/approved/rejected · departments_activated · question_asked (all journaled today) · time: **the weekly review** · the quarterly reset (obligations calendar — gap) |
| Scorecard slice | the four steering numbers above |
| Scoping fragment | the interview tree's trunk + wings (Part III Chapter 1 — authored, live) |
| Panel | none — steering surfaces as Home + the dock (framework §5) |

**Today in code:** the most-shipped module in the product — everything except the heartbeat/reset
skills and the calendar. The gap between "shipped" and "named": zero concepts, which is the point.

## Field `work/company/engineering` — ACTIVE · executor: **the Engineer** (`department-agent`)

**Charter.** Purpose: turn approved intent into verified, live software. Cadences: execution per
build (hours-days) · heartbeat per-cycle + weekly DORA glance · reset with the company quarter.
Scorecard (composed): deploy frequency · lead time · change-failure rate · verify pass rate · open
migrations. Field situations: architecture unapproved while a build waits · the cycle review.
**Minimum module set:** system-architecture + delivery.

### Module `engineering/system-architecture` — advisory · executor `lu` · PARTIAL

| Slot | Content |
|---|---|
| Purpose | keep a current, owner-approved blueprint every build reads |
| Outcome vocabulary | approved architecture (predicate: `approve_doc` resolved on an `architecture` doc) · recorded decision (predicate: decision-record artifact filed) |
| Artifact types | **architecture** doc (exists as doc type) · **decision-record** (new) |
| Skills | `custom:architecture-drafting` (from business-context + repo read; **does not exist** — today a `draft_doc` prompt line) (base: doc-coauthoring) |
| Tools | `draft_doc` (exists) · repo-read via sandbox (exists as port) |
| Situations | event: doc_drafted/approved/rejected (journaled) · a build dispatched with no approved architecture (gap) |
| Scorecard slice | architecture doc age vs last major ship |
| Scoping fragment | what exists already (repo import)? what must never break? deploy path? |
| Panel | the architecture doc + the decision log |
| Today in code | the `architecture` doc type + its approval gate exist (`routes/approvals.ts`); the module identity, decision records, and skill don't |

### Module `engineering/delivery` — actuation · executor: the Engineer · SHIPPED

| Slot | Content |
|---|---|
| Purpose | approved plan → verified, published change |
| Outcome vocabulary | shipped feature · fixed bug · green deploy — predicate template: preview fetched live + repo tests green + published (exists as `verify_acceptance` + publish code-gate) |
| Artifact types | plan (steering-produced, delivery-consumed) · **pr_diff** · **site_preview** · verify verdict `{pass, unmet, notes, checks}` · **agent_session** (all exist) |
| Skills | `custom:delivery` (plan-shaping, rework policy, publish discipline — **does not exist**: trapped in `engineering.ts` prompt strings; extracting it is the first act of the skill system) (ref: webapp-testing for browser-driving verification; ref: frontend-design for UI work quality; ref: claude-api when building against our own stack) |
| Tools | `create_site` · `run_coding_agent` · `open_preview` · `verify_acceptance` · `request_publish` (+ borrowed: `generate_image`) — all exist (`agent/engineeringTools.ts`) |
| Situations | event: build_dispatched · coding_finished · preview_ready · verify_passed/failed · publish_requested · published · build_failed (all journaled; the *rule layer* mapping each to authored moves = roadmap Part III Ch.5's table — gap) |
| Scorecard slice | deploy frequency · lead time · verify pass rate |
| Scoping fragment | repo/stack? one-step deploy? appetite per bet? |
| Panel | the workplace: task selector · live preview iframe · request-changes · publish gate (exists — product.md §4) |
| Today in code | end-to-end live; the reference vertical. Missing only its own name and its extracted skill |

### Module `engineering/database` — actuation · executor: the Engineer · SHIPPED

| Slot | Content |
|---|---|
| Purpose | the org's data layer: provision, migrate, never destroy |
| Outcome vocabulary | applied migration (predicate: SQL ran in approval-resolution path + `migration_applied` journaled) · provisioned backend |
| Artifact types | **migration** doc (title + SQL + project — exists) |
| Skills | `custom:migrations` (additive-only doctrine, dev-validate-first — today prompt lines; **extract**) (ref: the supabase skills noted in the old lockfile are *candidates* for future vendoring, not dependencies) |
| Tools | `provision_backend` · `run_migration` (exist; SQL executes only in `routes/approvals.ts` — the doctrine holds) |
| Situations | event: migration staged (approval) · migration_applied (journaled) |
| Scorecard slice | migrations pending · failed applies |
| Scoping fragment | does the product need data? whose Supabase? |
| Panel | the database console: schema · migrations · storage/auth/users · four gated key actions (exists — product.md §4) |
| Today in code | live end-to-end |

**Workspace check (per the plan's verification): the live Engineering surfaces map completely —**
workplace → delivery panel · database console → database panel · Projects list → shell work rail ·
architecture doc → system-architecture panel. Nothing the app renders today is outside the derived
workspace; nothing derived is missing except the decision log.

## Field `work/company/design` — next to ship

**Charter.** Purpose: the company looks intentional — identity, system, assets. Cadences: per brief
(brand sprint ~2wk; full identity 8-12wk) · heartbeat rides the company week. Scorecard: rounds used
vs cap (3) · review turnaround · off-brand assets · kit usage. Field situations: feedback round cap
reached. **Minimum set:** design-system. **Executor:** the Designer (`department-agent` — asset
actuation via the image port) with `lu` executing advisory drafting until it ships.

- **`design/design-system`** · advisory→actuation · — Purpose: one source of visual truth.
  Outcomes: adopted token set · documented component · usage rule. Artifacts: **tokens doc** ·
  **component inventory** · usage guidelines. Skills: `custom:design-system` (base:
  **frontend-design**; ref: **theme-factory** for token/theme generation; our own
  `docs/design-system.md` is the dogfood instance). Tools: doc tools; later `apply_theme` against
  repo via delivery. Situations: off-system asset detected (later, event). Scorecard: kit usage ·
  components documented. Scoping: which surfaces first? references loved/hated? Panel: token board +
  component gallery.
- **`design/brand-identity`** · advisory→actuation — Purpose: who the company is, visually.
  Outcomes: approved brand kit · approved concept (round-capped). Artifacts: **creative brief** ·
  moodboards · concept decks · **brand-guidelines** doc · labeled asset kit. Skills:
  `custom:brand-identity` (base: **brand-guidelines** — the catalog entry is Anthropic's own kit;
  we fork the *shape* (colors/type/usage rules as an applicable skill) and generate per-customer
  kits into it; ref: **canvas-design** for concept/poster work; ref: **pptx** for concept decks).
  Tools: `generate_image` (owner) · doc tools. Situations: round cap hit (event) · review window
  expiring (time). Scorecard: rounds vs cap · turnaround. Scoping: from zero or refresh? the ONE
  decision-maker? 3-5 references? Panel: brand kit + moodboards + concept decks with round tracker.
- **`design/asset-production`** · actuation — Purpose: the assets the other fields consume.
  Outcomes: delivered asset (predicate: filed + consumer accepted). Artifacts: images · templates ·
  (later) motion. Skills: `custom:asset-production` (ref: **canvas-design**, **algorithmic-art**,
  **slack-gif-creator** as craft references; **theme-factory** for on-theme output). Tools:
  `generate_image` · file tools. Situations: asset requested by another field (cross-field task).
  Scorecard: turnaround · reuse rate. Scoping: none beyond brand. Panel: asset gallery + template
  library.

## Field `work/company/marketing`

**Charter.** Purpose: the right people find out. Cadences: weekly publish rhythm · monthly
kill/keep · quarterly positioning review; channel verdicts need 60-90 days. Scorecard: CAC vs LTV
per channel · traffic→signup · signup→activation · publish consistency. Field situations: channel
verdict date (time). **Minimum set:** positioning + content. **Executor:** `lu` (advisory) until
channel actuation ports (analytics, email, social APIs) promote content/campaigns.

- **`marketing/positioning`** · advisory — Outcomes: approved positioning doc · ICP defined.
  Artifacts: **positioning** doc (Dunford sequence: alternatives → unique attributes → value →
  segment → category) · **ICP** doc. Skills: `custom:positioning` (base: doc-coauthoring; the
  Dunford sequence is the procedure). Tools: doc tools + research. Situations: quarterly review
  (time). Scorecard: positioning age. Scoping: if you didn't exist, what would customers use? where
  did current customers come from? Panel: the positioning + ICP docs.
- **`marketing/content`** · advisory→actuation — Outcomes: published piece · calendar month planned.
  Artifacts: **content calendar** (3-5 themes) · drafts · published log. Skills:
  `custom:content-production` (base: doc-coauthoring; ref: **internal-comms** for format patterns;
  ref: **web-artifacts-builder** + frontend-design for landing pages — which *execute through
  engineering/delivery* as cross-field tasks). Tools: doc tools; publish via delivery. Situations:
  publish-day (time) · piece published (event). Scorecard: publish consistency vs plan. Scoping:
  what can you produce weekly, realistically? the single conversion that counts? Panel: calendar +
  drafts.
- **`marketing/campaigns`** · advisory — Outcomes: channel verdict (double-down/kill after its
  window) · campaign shipped. Artifacts: **campaign brief** (one success metric each) · channel
  scorecard. Skills: `custom:channel-testing` (the Bullseye procedure: brainstorm 19 → test 3-6
  cheap → focus 1-2; never >2-3 at once early). Tools: doc tools (+ later ad/analytics ports).
  Situations: verdict date (time) · budget burn (event, later). Scorecard: CAC per channel vs LTV.
  Scoping: budget per test? target CAC/LTV? Panel: channel scorecard + briefs.

## Field `work/company/sales`

**Charter.** Purpose: pipeline → revenue, honestly measured. Cadences: daily outreach block ·
**weekly pipeline review** · monthly conversion analysis. Scorecard: stage conversion · coverage
(~3x) · cycle length · win rate · weekly leading (new prospects <20/wk = top-of-funnel problem ·
reply rate <5% broken / >15% double down). Field situations: weekly review (time). **Minimum set:**
pipeline. **Executor:** `lu` (advisory) until CRM/email ports.

- **`sales/pipeline`** · advisory→actuation — Outcomes: stage advanced (each stage has exit
  criteria) · deal closed won/lost **with logged WHY**. Artifacts: **the pipeline** (stages + exit
  criteria + per-deal next action with a date) · **win/loss log** → the playbook. Skills:
  `custom:pipeline-discipline` ("clean pipelines beat big pipelines": kill dead deals weekly; every
  open deal has a dated next action) (base: xlsx for the v1 pipeline artifact). Tools: doc/sheet
  tools; later CRM port. Situations: weekly review (time) · deal stale >N days (time). Scorecard:
  conversion by stage · coverage · win rate. Scoping: who exactly buys, at what price? the motion
  (self-serve/demo/proposal)? target ACV + deals needed this quarter? Panel: the stage board +
  per-deal next actions.
- **`sales/outreach`** · advisory→actuation — Outcomes: sequence completed (8-12 touches / 14-21
  days, multi-channel) · reply handled same-day. Artifacts: **sequence templates** · **proposal
  template** · prospect list. Skills: `custom:outreach` (cadence design + the reply-rate
  thresholds) (base: doc-coauthoring for templates). Tools: doc tools; later email port (→
  actuation: Lu sends). Situations: touch due (time) · reply received (intake, event). Scorecard:
  new prospects/wk · reply rate. Scoping: where do the first 50 prospects come from? what makes a
  lead qualified? Panel: sequences + the send queue.

## Field `work/company/finance`

**Charter.** Purpose: the money is known, current, and acted on. Cadences: weekly AR-chase + AP-run
+ cash check · **monthly close (day 5-10)** · quarterly reforecast (trigger: ≥10% variance twice) ·
annual budget. Scorecard: gross/net burn · **runway months** (raise at ~12) · DSO/AR aging · budget
variance · close on time. Field situations: the payroll screen ever going red → company cash triage
(bubbles to world level, ⭐ the 13-week rolling cash forecast). **Minimum set:** close.
**Executor:** `lu` (advisory) until a banking/billing port promotes receivables/payables.

- **`finance/close`** · advisory — Outcomes: month closed (predicate: reconciled + four reports
  filed by day 10 + owner accepted). Artifacts: **pnl** · **balance-sheet** · **cashflow-forecast**
  · **budget-vs-actuals** (carries the consecutive-breach counter) · **close-checklist** (the
  progress surface). Skills: `custom:monthly-close` (capture → reconcile → adjust → report → review
  burn → act; triggers: situation-fired + task-matched) (base: **xlsx** — the close workpapers;
  ref: pdf for statement ingestion). Tools: sheet/doc tools (store port); later bank-feed port.
  Situations — matches: close-window-opens (time, monthly day 5, satisfiedBy: month closed) ·
  close-late (time, day 10, guard: outcome not met); emits: `close_completed` ·
  `budget_variance_breached` (→ forecast matches) · `cash_below_payroll_threshold` (→ the field's
  cash-triage situation, bubbles to world). Scorecard: close on time · burn · runway (derived from
  latest payloads at heartbeat read). Scoping: entity/banks/tool today? cash or accrual? current
  cash + avg monthly spend? Consumes: forecast's budget. Panel: the four statements + the
  checklist.
- **`finance/receivables`** · advisory→actuation — Outcomes: invoice sent · paid · aging chased.
  Artifacts: **invoices** · **AR aging**. Skills: `custom:receivables` (deliver → invoice → track →
  dun → collect) (base: xlsx; docx for invoice docs). Tools: doc tools; later billing port (Stripe)
  → actuation. Situations: invoice overdue (time) · payment received (intake). Scorecard: DSO ·
  aging buckets. Scoping: who pays you, on what terms? Panel: invoice list + aging + dunning queue.
- **`finance/payables`** · advisory — Outcomes: bill verified→approved→paid on time. Artifacts:
  **AP aging** · bill register. Skills: `custom:payables` (verify before approve; the weekly run).
  Tools: doc tools. Situations: bill due (time). Scorecard: on-time payment · late fees (=0).
  Scoping: who do you pay? Panel: the bill queue.
- **`finance/forecast`** · advisory — Outcomes: reforecast accepted · budget set. Artifacts:
  **rolling 12-month forecast** · annual budget · (distress: the 13-week cash forecast ⭐).
  Skills: `custom:forecasting` (variance-triggered; the 13-week distress procedure) (base: xlsx).
  Situations: variance ≥10% twice (event, from close) · quarter end (time). Scorecard: variance.
  Scoping: runway threshold that triggers action? Panel: the forecast sheet.

## Field `work/company/support`

**Charter.** Purpose: customers get answers; the company learns. Cadences: continuous queue · daily
triage sweep · weekly theme review → product. Scorecard: first response (<1h email / <30s chat) ·
P1 <4h, standard <24h · SLA 90-95% · FCR 70-79% · CSAT ~80% · deflection. Field situations: SLA
breach imminent (time). **Minimum set:** triage. **Executor:** a Support agent (`department-agent`)
— this field is *agent-facing by design*: the owner appears only on escalation (framework §4's
intake + agent-action situations are load-bearing here). **Requires: an intake channel port**
(email/chat) before it can activate at all — the honest dependency.

- **`support/triage`** · actuation — Outcomes: ticket resolved (predicate: customer-confirmed or
  auto-close window) · escalated-with-context. Artifacts: ticket log · **escalation policy** ·
  **priority matrix** (P1-P4 by business impact). Skills: `custom:triage` (intake → P1-P4 → resolve
  from KB first-touch → escalate with full context attached). Tools: channel port (gap) · KB read.
  Situations: ticket arrives (intake, event → agent action) · P1 aging (time) · escalation (event →
  owner moves). Scorecard: first response · resolution times · SLA. Scoping: which channels? what's
  a P1 for THIS business? what response promise can you actually keep? Panel: the queue + SLA
  status.
- **`support/knowledge-base`** · advisory — Outcomes: KB article published · theme fed to product.
  Artifacts: **knowledge base** · **macros/saved replies** · weekly themes report. Skills:
  `custom:kb-learning` (resolutions flow back; themes → product weekly) (base: doc-coauthoring).
  Situations: weekly theme review (time). Scorecard: deflection rate · FCR. Scoping: the 10
  questions you get repeatedly? Panel: the KB + macros.

## Field `work/company/operations`

**Charter.** Purpose: the running of the thing survives the founder's attention. Cadences: SOP
review 6-12mo · vendors quarterly · compliance monthly/annually. Scorecard: % recurring processes
with SOP+owner · SOP staleness · wasted SaaS spend (avg 26%) · unreviewed auto-renewals ·
time-to-hire. Field situations: renewal 90 days out (time). **Minimum set:** sops. **Executor:**
`lu` (advisory).

- **`operations/sops`** · advisory — Outcomes: SOP documented+owned · process reviewed. Artifacts:
  **SOP library** · accountability chart. Skills: `custom:sop-authoring` (start where failure is
  most visible — usually onboarding; document → assign owner → run → revise) (base: doc-coauthoring;
  ref: internal-comms). Situations: SOP stale >12mo (time). Scorecard: coverage · staleness.
  Scoping: what breaks or gets redone every week? what lives only in your head? Panel: the SOP
  library.
- **`operations/vendors`** · advisory — Outcomes: register current · renewal decided ahead.
  Artifacts: **vendor/subscription register** (owner + renewal date each). Skills:
  `custom:vendor-review` (quarterly; flag renewals 90 days out). Situations: renewal-90d (time).
  Scorecard: wasted spend · unreviewed renewals. Scoping: every tool you pay for — owner + renewal
  date? Panel: the register.
- **`operations/hiring`** · advisory — Outcomes: role filled (scorecards within 24h of each
  interview). Artifacts: **hiring scorecards** + question bank · role docs. Skills:
  `custom:hiring` (source → screen → interview → offer). Situations: interview done → scorecard due
  24h (time). Scorecard: time-to-hire. Scoping: hiring in the next 6 months? Panel: the funnel.

## Field `work/company/legal`

**Charter.** Purpose: agreements bind and deadlines don't surprise. Cadences: per matter ·
quarterly renewal sweep · the annual entity calendar (DE C-corp report + franchise tax Mar 1 —
Assumed Par Value method, the default massively overcharges · LLC Jun 1 · 409A refresh). Scorecard:
contracts operating unsigned · missing renewal dates · filing proximity · good standing · cap table
vs records. Field situations: filing deadline approaching (time). **Minimum set:** contracts.
**Executor:** `lu` (advisory — legal never auto-actuates; signature is always an owner gate).

- **`legal/contracts`** · advisory — Outcomes: contract signed+stored+obligations-tracked (the half
  startups drop) · redline round done. Artifacts: **template library** (NDA/MSA/SOW/offers/SAFEs) ·
  **contract repository** with renewal dates. Skills: `custom:contract-lifecycle` (request → draft
  from template → redline → approve → sign gate → store + track) (base: **docx** — contracts are
  Word documents; ref: pdf). Situations: unsigned >N days (time) · renewal (time). Scorecard:
  unsigned count · renewal coverage. Scoping: entity+state? anything operating unsigned? IP
  assignment + vesting complete? Panel: the repository + template library.
- **`legal/compliance`** · advisory — Outcomes: filing done on time · cap table current. Artifacts:
  **compliance calendar** · **the cap table** (single source of truth). Skills:
  `custom:entity-compliance` (the annual calendar above). Situations: every calendar entry (time).
  Scorecard: proximity · good standing. Scoping: what renews this year? 409A/option pool? Panel:
  calendar + cap table.

---

# WORLD: `work/studio-dev`

**Charter.** Purpose: the engineering loop with no company wrapper — project → outcome → build →
ship. Cadences: per project. Scorecard: shipped inside appetite · verify pass rate. Setup arc:
scope the project (Wing C's four beats: problem · who for · done · out of scope) → connect →
build. **Minimum set:** steering + build. **Executor:** the Engineer (shared runtime; module
identities are this world's own).

- **`studio-dev/steering`** · advisory · `lu` — the world-core: project brief, outcome, plan.
  Artifacts: project brief · plan. Skills: `custom:project-scoping` (= Wing C, extracted from the
  interview tree). Panel: none (Home/dock).
- **`studio-dev/build`** · actuation — shares `engineering/delivery`'s skills and tools (skills are
  n—n: `custom:delivery` attaches here too) minus the company context reads; same panel. This is
  the framework's sharing rule doing real work — no duplicated authoring.
- **`studio-dev/data`** · actuation — shares `engineering/database`.

# FIELD: `work/career`

**Charter.** Purpose: the job, freelancing, the craft — the working life outside a company wrapper.
Cadences: weekly (applications/leads) · per opportunity. Scorecard: active opportunities · response
rate · practice consistency. Field situations: follow-up due (time). **Minimum set:** profile.
**Executor:** `lu` (advisory). *(Seam, stated: skill development belongs to `personal/learning`;
career consumes its outputs — the two fields link, not duplicate.)*

- **`career/profile`** · advisory — Outcomes: resume/portfolio current · tailored application sent.
  Artifacts: **resume** (docx) · portfolio doc · application log. Skills: `custom:profile` (base:
  **docx**; ref: web-artifacts-builder for a portfolio page — executes via studio-dev). Situations:
  application follow-up (time). Panel: the documents + application log.
- **`career/opportunities`** · advisory — Outcomes: opportunity qualified · negotiation prepared.
  Artifacts: opportunity pipeline · prep docs. Skills: `custom:opportunities` (qualify → prep →
  negotiate; freelance: scope+rate discipline). Situations: response received (intake, later).
  Panel: the pipeline.

---

# WORLD: `personal`

**Charter.** Purpose: your life, run with the same loop — what you want, your money, your body, your
skills, your paperwork. Cadences: **weekly review** (GTD's get clear → get current → get creative)
· quarterly cycle (12-Week Year: 1-3 goals, weekly tactics scored, ≥85% execution) · annual review.
Scorecard: review streak · execution score ≥85% · inboxes at zero · no project without a next
action. Field situations: weekly review (time) · quarterly reset (time). Setup arc: the personal
scoping beat (active projects vs areas? where do commitments live? the 1-3 goals this quarter? the
protected weekly slot?). **Minimum set:** steering. **Executor:** `lu` everywhere (all-advisory
world — no approvals rail, no agents; framework §6's shell variant).

## Module `personal/steering` — world-core · advisory · `lu`

The old `personal/goals`, promoted to the world's core: capture everything → weekly review →
quarterly cycle → annual review. Artifacts: **projects + next-actions + someday/maybe lists** · the
**12-week plan + scorecard** · written annual review. Skills: `custom:personal-steering` (GTD
weekly review three-phase + 12-Week Year mechanics). Situations: the weekly slot (time) · quarter
boundary (time). Panel: none (the personal canvas's Home).

## Field `personal/finance`

**Charter.** Purpose: every dollar has a job. Cadences: payday assign · weekly 10-min reconcile ·
monthly close · quarterly subscription audit · annual re-shop/rebalance. Scorecard: savings rate
(~15%) · emergency runway (3-9mo) · age of money ≥30d · zero late fees · net worth trending up.
**Minimum set:** budget. — modules:

- **`personal-finance/budget`** · advisory — Outcomes: month assigned (zero-based) · reconciled ·
  closed. Artifacts: **category budget** · **sinking funds** · month-close notes. Skills:
  `custom:ynab-method` (the four rules: every dollar a job · true expenses · roll with punches ·
  age your money) (base: **xlsx**). Situations: payday (time) · weekly reconcile (time) · month
  end (time). Panel: the budget sheet.
- **`personal-finance/planning`** · advisory — Outcomes: net-worth snapshot · insurance re-shopped ·
  subscriptions audited. Artifacts: **net-worth tracker** · **bill calendar** · subscription
  register. Skills: `custom:personal-planning`. Situations: quarterly audit (time) · annual
  re-shop (time). Panel: net worth + calendars.

## Field `personal/health`

**Charter.** Purpose: the body, trained and maintained. Cadences: daily habit check · weekly log
review · block review at each deload (**every 4-8 weeks, volume −40-50%**) · annual medical
calendar. Scorecard: session adherence % · progressive-overload trend · deloads taken · sleep/RHR
trends · no overdue checkups. **Minimum set:** training. *(All-advisory; promotable when a wearable
port exists.)* — modules:

- **`health/training`** · advisory — Outcomes: block programmed · session logged · deload taken.
  Artifacts: **written program** · **workout log**. Skills: `custom:programming` (goal → block →
  execute → track → deload → reprogram; PAR-Q screen first). Situations: deload due (time) ·
  session due (time). Panel: program + log.
- **`health/habits`** · advisory — Outcomes: habit anchored (median 66 days to automaticity; one
  missed day doesn't reset). Artifacts: **habit tracker**. Skills: `custom:habit-design` (tiny
  behavior → anchor → daily → streak). Situations: daily check (time). Panel: the tracker.
- **`health/care`** · advisory — Outcomes: checkup done on schedule. Artifacts: **screening
  calendar** (physical yearly · dental 6-monthly · screenings by age). Skills: `custom:care`.
  Situations: checkup due (time). Panel: the calendar.

## Field `personal/learning`

**Charter.** Purpose: skills actually acquired, publicly proven. Cadences: daily 10-20min review
queue + practice block · weekly publish · per-project endpoint (1-3mo) · quarterly pick/kill.
Scorecard: queue streak · projects shipped vs planned · public artifacts · can you perform the real
task. **Minimum set:** curriculum. — modules:

- **`learning/curriculum`** · advisory — Outcomes: skill mapped (metalearning, ~10% of time) ·
  project milestone defined. Artifacts: **learning roadmap** (skill → sub-skills → project
  milestones). Skills: `custom:ultralearning` (metalearn → direct practice → drill the
  rate-limiter → retrieve+space → feedback → review). Situations: quarterly pick/kill (time).
  Panel: the roadmap.
- **`learning/practice`** · advisory — Outcomes: project shipped · public artifact out. Artifacts:
  **permanent notes** (own words) · **flashcard deck** · public output log. Skills:
  `custom:retention-practice` (daily active recall, spaced; learn in public). Situations: daily
  queue (time) · weekly publish (time). Panel: notes + deck + output log.

## Field `personal/admin`

**Charter.** Purpose: life's paperwork, never overdue. Cadences: capture continuously · weekly
30-60min block · monthly sweep · quarterly subscription audit · annual vault refresh. Scorecard:
nothing overdue/expired · renewals visible ≥30d ahead · zero late fees · binder reviewed <12mo.
**Minimum set:** renewals. — modules:

- **`admin/paperwork`** · advisory — Outcomes: inbox emptied at the weekly block. Artifacts: ONE
  inbox · processed log. Skills: `custom:admin-batch` (capture → schedule → batch-process).
  Situations: weekly block (time). Panel: the inbox.
- **`admin/renewals`** · advisory — Outcomes: renewal decided ahead of due. Artifacts: **renewals
  calendar** · subscription register. Skills: `custom:renewals`. Situations: every entry, ≥30d
  ahead (time). Panel: the calendar.
- **`admin/vault`** · advisory — Outcomes: vault current, access known. Artifacts: **document
  vault / emergency binder** (IDs, policies, account inventory; encrypted; location known to
  family). Skills: `custom:vault` (base: **pdf** for document handling). Situations: annual
  refresh (time). Panel: the vault index.

---

# The build order (module-first, per D2)

The map is not a promise of simultaneous construction. The shipping sequence the docs already imply,
restated as modules: **extract `delivery`/`database`/`company-scoping` skills from the hardcoded
prompts** (naming what's shipped — zero product change) → the framework substrate (map/module
registry replacing the three department registries · skills-tree loader · obligations calendar ·
typed payloads) → `company/steering`'s heartbeat (P4's weekly review — the first time-class beat) →
`design/design-system` → onward by founder priority. DEVELOPMENT.md's rewrite (S4) sequences this
properly.

# Verification (the map's own honesty checks)

1. **The falsifiable test** (framework §8.7): a fresh session + framework.md + any compressed entry
   above must be able to author that module's SKILL.md and doc types without inventing structure.
   **Run on `finance/close`, 2026-07-19:** ~85% transcribable; the eight structural gaps all
   clustered in two missing format specs — the situation-rule record and the doc-type registry
   conventions — both now added (framework §4/§7) and this entry corrected (checklist artifact,
   emitted kinds, list-valued triggers). Re-run on a different compressed entry after the next
   authoring round.
2. **Workspace completeness**: passed for engineering (checked inline above); every module above
   names its panel and artifacts.
3. **Catalog honesty**: every `(base:)`/`(ref:)` names a real entry from the 2026-07-19 enumeration;
   no domain-procedure skill is claimed vendorable, because none exists in the catalog.
4. **No silent scope**: fields this map deliberately does NOT define: People/HR (folds into
   operations until recurring) · community/audience (folds into marketing) · product-as-department
   (steering owns it). Same audit as before, still decided.
