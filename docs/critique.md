# The Critique — a harsh audit of the plan and the code

> Adversarial by design, dated, disposable. Written 2026-07-19; every code claim verified against the
> repo the same day. This document judges the current docs (`paper.md`, `docs/roadmap.md`,
> `docs/system.md`, `docs/product.md`, `COMPANY.md`, `DEVELOPMENT.md`) and the current code against
> five criteria: **(a)** internal consistency · **(b)** paper↔docs↔code drift · **(c)** framework
> depth — *could an engineer author the finance field from these docs alone, or would they be
> designing from scratch?* · **(d)** UI-mapping completeness · **(e)** skill-system coherence.
> Findings are tagged **KEEP** (sound, carry forward) · **FIX** (right idea, wrong execution) ·
> **REBUILD** (wrong or missing abstraction) · **DECIDE** (a founder call — collected in the decision
> memo at the end). Successor documents: `docs/framework.md` (the concepts) and `docs/map.md` (the
> tree, instantiated).

---

## The verdict, in one paragraph

The stack has a real theory layer (the paper), a real and honest execution layer (system.md + the
code's Engineering vertical), and between them a knowledge layer (roadmap Part II) that is **a
research anthology wearing a framework's clothes**. The "seven authored things" model is violated by
its own Field Book; there is no abstraction between "field" and "skill/tool", so every field is a
flat bag of cadences and scorecards; the skill system that the whole authoring model rests on is
specified in six words ("a skill file, an outcome vocabulary…") and implemented as one hardcoded
file; and nothing anywhere states what a field *looks like* in the product. Part III proves the point
by contrast: the one field that works (the Business world's script) took multiple research passes of
artisanal authoring, and no template exists to produce a second one. Meanwhile the code carries an
unfinished pivot (47 files still say Lead Answered/Sarah), three contradictory department registries,
and 102 references to spec documents that no longer exist. The foundation isn't wrong — the loop, the
tree-as-addressing, the doctrine, and the Engineering vertical are all worth keeping — but it is
**incomplete one level down from where all the work happens**, which is why development turned into a
mess: the docs run out exactly where implementation begins.

---

## 1. `paper.md` — the theory

**KEEP — as theory.** The harness positioning (compose substrates, contribute schemas/lifecycle/
control loop), the Goal→Outcome→Task hierarchy with acceptance predicates, versioned-graph
re-planning, ephemeral-compute/durable-workflow, the secret broker, and the capability registry are a
coherent architecture argument. system.md §11 maps it to code honestly. Nothing here needs rewriting;
the paper is a fixed artifact.

**REBUILD — the unreconciled planning contradiction (the deepest crack in the foundation).** The
paper's planner *generates and revises plans at runtime*: "the Harness functions as a goal-conditioned
routing layer whose plans are generated — and revised — by models at runtime" (paper.md §3.1, ~L100).
The roadmap asserts the exact opposite: "Lu executes them — adapting words and options to each person
and company — **but never inventing the path**" (roadmap.md L5-6) and "Lu never invents the
decomposition path; she instantiates ours" (L58-59). These are two different systems. Model-planned
decomposition and authored-method decomposition (HTN, which Part I itself cites at L18-20) can
coexist — HTN planners navigate an authored method library — but *nobody has written down the
boundary*: which decisions are authored (the method library = fields/modules/skills) and which are
model-planned at runtime (instantiating a method with specifics, recovering from failure). Until that
boundary is a stated contract, every new feature re-litigates it. This is a top-three cause of the
mess. → framework.md §1 must define it. **DECIDE (folds into D1/D3).**

**FIX — the paper's machinery has no knowledge layer, and the docs never say so.** The paper
specifies *execution* (sandboxes, DAGs, credentials, verification) and explicitly claims domain
generality ("only the task schemas, credential scopes, and verification agents change", §6 ~L346).
That claim is doing enormous unexamined work: *where do domain-correct task schemas come from?* The
answer is the authored knowledge layer — the thing Part II was supposed to be and isn't. The paper
can't be faulted for scoping it out, but no document owns the seam. Drift evidence that the seam is
unowned: the paper's **Outcome** tier has no code object (`Task` exists, `Outcome` does not —
`packages/db/prisma/schema.prisma` has no Outcome model), no acceptance-predicate-bearing outcome
row, no graph versioning, no re-planning (system.md §11: ⬜ not started). The code implements
Goal→Task and skips the middle tier the paper calls load-bearing.

## 2. `docs/roadmap.md` Part I — the Loop

**KEEP.** The six-step loop, the two rings (execution + review), the scorecard and obligations-
calendar primitives, and the rules of the loop (Lu speaks first · state derived never invented · one
frontier · loop invisible) are well-grounded, internally consistent, and partially proven in code.
This is the strongest conceptual asset outside the paper.

**FIX.** (1) The loop⇄paper mapping is asserted in one parenthetical per step ("the paper's Goal →
Outcome tier", L50) but never made into a real correspondence — UNDERSTAND/RESEARCH/CHECK have no
paper counterpart, and the paper's verification loop is only loosely the loop's CHECK. The ontology
table (framework.md §1) must close this. (2) "Every field IS a loop" (L231-251) claims "engineering's
loop is already built, 1:1" — overreach: the engineering *task pipeline* is built; the loop's
UNDERSTAND and standing CHECK (the review ring: weekly heartbeat, quarterly reset) exist for **zero**
fields — P4 in DEVELOPMENT.md is unstarted. The fractal principle is a good design; calling it built
is drift of the kind system.md was written to prevent.

## 3. `docs/roadmap.md` Part II — the Map ⟵ the primary indictment

**REBUILD.** Part II is where "absurdly shallow" is true. Five charges, each verifiable in the text:

1. **The seven-things model is violated by its own Field Book.** L127 declares "a field without all
   seven isn't a field." The Field Book (L271-507) then delivers, for every future field, five things
   (loop, cadences, artifacts, scoping, scorecard) — and **omits the two that make a field
   operable**: *agents + tools* (thing 3 — which agent? which ports? which tool calls?) appears for
   no future field, and *situations* (thing 5 — the checkpoint rules that drive the standing loop)
   appears for no future field. By the document's own standard, **no field in the Field Book is a
   field.** What the Field Book actually is: excellent per-domain research summaries — raw material,
   not authored capability.

2. **There is no abstraction between "field" and "skill/tool" — the missing module.** A field like
   engineering is not one capability; it is several durable ones (system architecture · build &
   delivery · database & migrations · verification) each with its own artifacts, tools, and skills.
   Design is a design *system*, brand identity, asset production. The current model has no slot for
   these: the seven things hang directly off the field, so capabilities have no owner, artifacts
   have no producer, and the department app has no derivable structure. Every consequence the founder
   is feeling — "we need to define all the modules each field will have" — traces to this missing
   layer. The code even has a fossil of the need: `apps/web/src/components/app/ModuleStub.tsx`, an
   abandoned "module" sketch with no concept behind it.

3. **The skill system is load-bearing in prose and weightless in design.** The entire specification
   of how domains get added to Lu is L227-228: "Adding a domain to Lu = authoring the seven things (a
   skill file, an outcome vocabulary, tools, a folder, situations)." Six words for the mechanism the
   whole strategy rests on. No skill format, no attachment rule (which agent gets which skill when?),
   no injection classes, no relationship between a skill and the seven things, no catalog strategy
   (anthropics/skills is never mentioned in any doc). Reality check against code in §8 below.

4. **UI translation is absent.** Nothing in Part II states how a field surfaces in the product. The
   only mapping is "the Library mirrors the tree" (L216-217). What does *entering* a field look like?
   What does a department app show, and why does Engineering's (Home / workplace / database console —
   product.md §4) look like that, and what would Design's show instead? Undefined — which is exactly
   why the frontend grew four competing component trees (§8.4). The canvas's "departments = agents"
   identity (product.md §4 L73) conflates the org unit with the worker and renders one depth of a
   three-depth tree; the tree's own "three natures" (root/world/sub-field, L173-184) have no UI
   counterpart at all.

5. **The tree's own author doesn't trust it — and the doubts are parked, not processed.** The Open
   list (L502-506) questions the branches, `career`'s placement, whether `personal/goals` is a world
   or the root, and Studio/Dev's missing seven things. Legitimate questions — sitting unanswered in
   the same document that calls the map "the most load-bearing authored object in the product"
   (L119). **DECIDE (D1, D4).**

**KEEP within Part II:** the tree-as-addressing idea itself (a path for every intent), the routing
rules (context wins, most-specific wins, explicit beats inferred, ask-with-options, cross-field
decomposes), the nesting rules (context down, outcomes cascade, situations bubble up, Library mirrors),
activation-not-preexistence, and the Field Book *as research input* to map.md. These survive into the
new framework; the field *definition* around them does not.

## 4. `docs/roadmap.md` Part III — the Business script

**KEEP.** The interview tree (session contract, trunk, wings A/B/C, convergence) is the deepest
authored artifact in the repo, it is implemented (`platform/apps/api/src/agent/skills/onboarding.md`),
and it was smoke-verified (DEVELOPMENT.md P2). Chapter 5's situations table is the right shape for
the standing loop.

**FIX — Part III is the proof of Part II's failure, and it's a hand-crafted one-off.** Compare
resolutions: Part III specifies one field's *setup arc* down to question budgets, fork
discriminators, and per-archetype diagnostic numbers. Part II specifies every other field in five
bullet points. The framework question is: *what template, applied to the finance research in the
Field Book, would yield a finance script of Part III's quality?* No such template exists — Part III
was produced by "six research passes" (L537) of artisanal work. If authoring a field costs that
much and follows no recipe, the map is a wish list. The framework must extract Part III's implicit
structure (a world's setup arc = scoping script → connects → blueprint doc → first verified ship →
standing situations) into the module/field authoring recipe. Also note: Part III covers the *setup
arc* deeply but Chapter 5 (the standing loop — where users spend 99% of their time) is one table and
three open questions.

## 5. `docs/system.md` — the machine

**KEEP.** The most trustworthy document in the repo: verified-against-code discipline, honest §11
status table, clean doctrine (§0). The doctrine's seven rules survive into the framework untouched.

**FIX.** (1) §10's "how to add a new agent" recipe never mentions fields, skills, situations, or the
roadmap — its seven steps (contract → model → tools → department row → dispatch → surface →
approvals) describe adding a *worker*, while roadmap L227 describes adding a *domain* as authoring
seven things. The two recipes describe different products; neither is complete. (2) §1's anatomy
lists **Skills** as one of five agent parts, giving it equal billing with Contract/Model/Tools — but
the skill mechanism is a single hardcoded consumer (§8.5 below). The anatomy describes the
aspiration as if it were the mechanism. (3) The `Agent.contract` machinery (ContractRevision,
"assembled in packages/core") is schema-real but the two live agents' prompts are hardcoded in
`orchestrator.ts`/`engineering.ts` — another aspirational row presented as anatomy.

## 6. `docs/product.md` + `COMPANY.md`

**KEEP.** The feel rules (§0), one-object-three-sizes (§1), the card set (§2), the honesty register
(§7), and COMPANY.md's positioning and locked conventions — including the one that indicts the
current state: "**Ship one department fully, then dogfood it to build the next**" — are sound.

**FIX.** (1) product.md documents the Engineering department app (§4: Home / workplace / database
console) as if its shape were self-evident; there is no statement of what a department app *is in
general*, so the next department starts from a blank page — the workspace-anatomy gap. (2)
"departments = agents as hubs (each an app)" (§4 L73) hard-codes the conflation flagged above; an
agent is a runtime worker, a department is a field's surface — when Design ships with two agents or
Engineering gains a reviewer agent, this identity breaks the canvas. **DECIDE (D6).** (3) The Library
spec (§3) files docs into *General + one folder per live department* — the tree's world level and the
root have no Library presence; fine today, undefined for tomorrow.

## 7. `DEVELOPMENT.md`

**KEEP.** The NOW/NEXT/LATER discipline and the P-pipeline are the right working method, and P1/P2's
status notes (built, smoke-verified, rework recorded) show the discipline is real.

**FIX.** (1) P4 contains, in passing, the sentence "Situation rules become authored data (**a
`situations` section per field skill**)" — this is an *architecture decision* (skills carry
per-field situation rules; skills are per-field, not per-task) smuggled into a TODO bullet, nowhere
designed. (2) LATER holds "departments beyond Engineering (each = authoring a field's seven things)"
— scheduling work against a framework this critique just showed doesn't exist. (3) The "moat"
sentence (P5/intro: "the orchestration is prompt engineering + derived state, and the moat is the
interface") is a *third* architectural thesis alongside the paper's (the harness is the moat) and
Part II's (the authored map is the moat). All three are defensible; no document ranks them. Minor,
but it's the kind of ambiguity that produces four component trees.

## 8. The code

The Engineering vertical works and matches system.md — that is real and **KEEP**. Around it, five
structural messes, all verified 2026-07-19:

1. **The unfinished pivot.** 124 occurrences of `leadanswered`/`sarah` across **47 files** (excluding
   node_modules/dist), including all five package names (`@leadanswered/api`, `/web`, `/core`, `/db`,
   root `leadanswered-platform`). The `Organization` model (`packages/db/prisma/schema.prisma`
   L49-81) still carries the dead SMS-product surface: `twilioNumber`, `messagingServiceSid`,
   `NumberType`/`VerificationStatus`/`NumberStatus`, `qualificationRules`, `standingAvailability`,
   `escalationTopics`, `projectTypes`, `baseLocations`, `include/excludeOverrides` — none read by the
   agent backend. **FIX** (downstream task, already tracked as debt — but it must be *scheduled*, not
   tracked forever).

2. **Two onboarding systems.** The live one is derived state (no active department → scoping mode,
   `agent/setup.ts`). The dead one still runs: `apps/web/src/app/page.tsx:15` redirects on
   `organization.onboardingComplete` to `/onboarding`, whose `page.tsx` + `actions.ts` +
   `components/onboarding/` (incl. the 16KB `OnboardingFlow.tsx`) predate the in-workspace interview.
   A boolean the new system never sets gates the front door of the app. **FIX.**

3. **Three contradictory department registries.** (a) Prisma `Department` rows (the truth); (b)
   `DEPARTMENTS` const, `apps/api/src/agent/orchestratorTools.ts:15` (8 keys, feeds tool schemas);
   (c) canvas `AGENTS`, `apps/web/src/lib/canvas/graph.ts:37-45` — still Lead Answered content
   ("Receptionist", "AbacatePay Pix + boleto", drive-time routing) with **`engineering: active:
   false` and support/operations/finance/marketing/sales `active: true` — the exact inverse of
   reality** — and it is imported by the live department route
   (`apps/web/src/app/(app)/department/[key]/page.tsx`). The canvas the owner sees is rendered from
   fiction. **REBUILD** (one registry, derived from the map — a framework consequence, not a cleanup).

4. **Four-plus overlapping frontend trees** for the same concept: `components/canvas/`,
   `components/department/`, `components/dept/`, `components/team/` (a human-roster model with its
   own `Member`/`ROLES` types), plus `lib/workspace/agent-presets.ts` (Receptionist/Reviews/Content/
   Follow-ups — pure Lead Answered) and `components/app/ModuleStub.tsx`. Nobody decided what a
   department surface is, so everybody decided. **REBUILD** (collapse to the workspace anatomy once
   framework.md §6 defines it).

5. **The skill system: one file, one consumer, two orphan lockfiles.** The loader
   (`apps/api/src/agent/skills/index.ts`) reads a flat directory; exactly one skill exists
   (`onboarding.md`); exactly one call site consumes it (`orchestrator.ts`: `setup.complete ? null :
   getSkill("onboarding")`) gated by one hardcoded derivation. There is no attachment metadata, no
   per-field skills, no situation-fired injection (P4's requirement), no engineering skill (the
   Engineer's entire craft is hardcoded prompt). Meanwhile two `skills-lock.json` files
   (repo root + `platform/`) pin eleven third-party skills — hostinger vps/dns/hosting/billing,
   postmark, supabase, langfuse, railway — that **no code consumes**, and whose Hostinger/Postmark
   content is Lead Answered-era anyway. A lockfile without a loader is a to-do list wearing an
   integrity hash. **REBUILD** (the skill system is framework.md §4; the lockfiles either become its
   consumed vendoring pipe or are deleted — no third state). **DECIDE (D5).**

6. **102 references to documents that don't exist.** Grep for `AGENTS-BACKEND|ENGINEERING-AGENT|
   CANVAS-TOOLS|cockpit.md|workflow.md|canvas.md|byo-connect|harness-spec|runner.ts` hits 102 times
   across 30 files (`store/types.ts`, `sandbox/*`, `git/*`, `deploy/*`, `agent/*`, routes, web).
   `docs/` contains only system/product/roadmap/design-system. The code's own comments cite a spec
   universe that was deleted; `agent/runner.ts` — cited as the canonical sibling runtime — does not
   exist. Every one of these is a small lie to the next reader. **FIX** (S4 schedules the purge;
   framework/map/system become the only citable docs).

7. **Smaller but real:** `Artifact.payload` is untyped JSON discriminated by a stringly `type` and
   defensively re-parsed at every consumer (`apps/web/src/lib/dock/live.ts`, `agent/setup.ts`,
   `ActivationGate.tsx`, `onboardingTools.ts`) — typed payload schemas are a framework deliverable
   (framework.md §7). The model gateway lists Flux/Higgsfield entries that `getImageModel` returns
   `undefined` for. `Task.model` is a dead column (admitted in system.md §5). Departments 2-8 are
   schema-present stubs — acceptable *only* once the map defines what filling one means.

---

## The decision memo — G1

Six decisions, each with a recommendation. These are founder calls; the framework (S2) is blocked on
them.

**D1 — Is the path-tree the right primitive?**
*Recommendation: keep the tree as the addressing scheme; make the **module** the unit of capability.*
The tree survives as how intents route and context nests (its routing/nesting rules are good). What
changes: a field stops being "seven things" and becomes a **charter + a set of modules + live
state**; the work-shaped things (tools, skills, situations, artifacts, scorecard slices) move into
modules, where they have an owner. The alternative — module-first with fields as mere tags — loses
the context-flows-down/outcomes-cascade machinery, which is worth keeping. Also resolves here: the
planning contradiction (§1) — recommended boundary: *we author the method library (fields, modules,
skills, situations, outcome vocabularies); the model plans within it (instantiating methods, choosing
next moves, recovering from failure); it never invents new methods.*

**D2 — What is the unit of shipping and activation?**
*Recommendation: build and ship by **module**; activate and present by **field**.* "Ship one
department fully" stays the product-facing rhythm (a department activates when its minimum module
set is live), but the roadmap of work becomes a module list — e.g. Design might ship `design-system`
long before `brand-identity`. Today's all-or-nothing department stubs disappear.

**D3 — The one ontology: which vocabulary wins?**
*Recommendation: the framework's words win at the product layer; the paper's words are kept as the
theory column of one reconciliation table (framework.md §1); the schema migrates toward the framework
vocabulary only where cheap.* Concretely: **Goal** (paper) = a field's *current outcome*; **Outcome**
(paper) = an entry from a module's *outcome vocabulary* with an acceptance predicate; **Task** stays
`Task`; *move*, *situation*, *heartbeat* are framework-native with no paper counterpart — and that's
fine, stated once in the table instead of implied forever.

**D4 — Scope of the v1 map.**
*Recommendation: Tier 1 (full) = `work/company` + `engineering`; Tier 2 (build-ready) = `design`,
`finance`, `marketing`; Tier 3 (sketch) = remaining company departments + `studio-dev` + `personal/*`;
`career` cut from the tree until it earns a loop (Part II's own doubt, resolved by removal).* The
personal branch stays on the map as addressing (D1) but gets no authored modules in v1.

**D5 — Skill format and sourcing.**
*Recommendation: adopt the anthropics/skills SKILL.md convention (folder + frontmatter + progressive
disclosure) as the native format, extended with attachment metadata (field/module/trigger-class);
authored-only to start; **delete both skills-lock.json files now** and reintroduce a lockfile only
when the first vendored skill actually ships through a real sync mechanism.* Rationale: the format is
becoming the ecosystem standard and costs nothing to adopt; the lockfiles as they stand are drift.

**D6 — Fate of roadmap Part II and the canvas identity.**
*Recommendation: supersede Part II (collapse to a pointer at framework.md/map.md in S4, Field Book
content absorbed into map.md as research citations); retire "departments = agents" — a department is
a field's surface that *contains* agents; the canvas renders departments as hubs and agents as
workers within them.* Also retire the `team/` human-roster tree and `agent-presets.ts` with it
(scheduled in S4's DEVELOPMENT.md rewrite, executed downstream).

---

---

**DECIDED (founder, 2026-07-19):** D1 — tree stays as addressing, **module-first** capability; the
authored/planned boundary: we author the method library, the model plans within it, never inventing
methods. D2 — **ship by module, activate by field**. D3 — framework vocabulary wins; reconciliation
table in framework.md §1. D4 — **everything instantiated**: the full tree, including `personal/*`,
`studio-dev`, and `career`, gets authored modules in map.md (engineering deepest, verified against
code). D5 — anthropics **SKILL.md convention + authored-only**; both `skills-lock.json` files
scheduled for deletion (S4 → downstream). D6 — Part II superseded; "departments = agents" retired —
a department *contains* agents.

*Next: S2 authors `docs/framework.md` on this foundation → G2 → S3 authors `docs/map.md` (full tree)
→ S4 reconciles roadmap/system/product/DEVELOPMENT.*
