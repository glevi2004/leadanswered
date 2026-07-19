# The Framework — fields, modules, skills, and how they surface

> The constitutional document: the concepts everything else instantiates. Authored 2026-07-19 on the
> foundation decided at the critique's G1 gate ([critique.md](./critique.md)): the tree stays as
> addressing, the **module** is the unit of capability, we ship by module and activate by field, the
> skill format is the anthropics SKILL.md convention, framework vocabulary wins. The tree itself,
> instantiated field-by-field, lives in [map.md](./map.md). The machine that runs this:
> [system.md](./system.md) · the surfaces: [product.md](./product.md) · theory: [../paper.md](../paper.md).
> Every section ends with **Today in code:** — what exists now, verified 2026-07-19. This document
> supersedes roadmap.md Part II.

---

## §0 — The two constitutions (and the boundary between them)

Lu is governed by two bodies of law, and the critique showed what happens when their border is
undrawn (paper says plans are model-generated; roadmap says Lu never invents the path):

- **The authored layer — what WE write.** The map, the fields, the modules, the skills, the
  situations, the outcome vocabularies, the scoping scripts, the workspace anatomy. This is HTN's
  method library: the decomposition *knowledge*.
- **The planned layer — what the MODEL does at runtime.** Mapping an intent to a field, choosing
  which authored method applies, instantiating it with the company's specifics, sequencing tasks,
  recovering from failure, proposing the next move. This is the paper's runtime planning.

**The boundary (decided, D1):** *the model plans within the authored library and never invents new
methods.* It may compose authored things in novel orders; it may not create a field, a module, a
situation class, or a skill. When no authored method fits, the model's move is to say so and escalate
— exactly like the mapping rule "when she can't place it, she asks." A model-invented path is a bug,
not initiative.

**Today in code:** the boundary is implicit and holds only for onboarding (the interview tree in
`platform/apps/api/src/agent/skills/onboarding.md` is authored; `agent/orchestrator.ts` walks it).
Everywhere else the Engineer's craft is hardcoded prompt, not authored method — the boundary exists
nowhere as a stated contract.

## §1 — The ontology (one vocabulary, one table)

Framework vocabulary is the product vocabulary. The paper's terms remain correct as theory; this
table is the *only* place the correspondence needs stating, and any doc or code comment that needs a
term uses the Framework column.

| Framework term | Definition (one line) | Paper (theory) | Code today |
|---|---|---|---|
| **The map** | the authored tree of domains; every intent resolves to a path on it | — | `DEPARTMENTS` const (partial, flat) — `agent/orchestratorTools.ts:15` |
| **Field** | an addressable domain of operation: a path + a charter + modules + live state (§2) | — | `Department` row (company sub-fields only) |
| **World** | a field big enough to have sub-fields and a setup arc | — | implicit: the whole product is the Business world |
| **Module** | a durable capability package inside a field — the unit of authoring and shipping (§3) | — | **nothing — the missing layer** |
| **Skill** | an authored procedure package a module carries; injected into an agent's prompt when its trigger matches (§4) | HTN authored methods | `agent/skills/*.md` (one file, one consumer) |
| **Agent** | a runtime worker: one tool-loop with a contract; executes modules' work | model-bound specialized agent | `runOrchestrator` / `runEngineering` + `Agent` row |
| **Tool** | a deterministic, port-backed action an agent can call | actuation | `agent/*Tools.ts` |
| **Port** | the substrate interface (sandbox, git, deploy, store, models) | substrate provider interface | `sandbox/` `git/` `deploy/` `store/` `packages/core/models.ts` |
| **Current outcome** | the field's agreed next high-level result | **Goal** | none as a row; lives in prose inside the business-context doc |
| **Outcome** | one "kind of done" from a module's outcome vocabulary, instantiated with an acceptance predicate | **Outcome + acceptance predicate** | `Task.acceptance` JSON (predicate without the Outcome object) |
| **Task** | a granular unit of work an agent executes | Task | `Task` row ✅ |
| **Move** | a tappable next decision Lu offers *the owner* (2-4 options, one recommended) | — | `Message.meta.choices` ✅ |
| **Situation** | an authored checkpoint rule that shapes a turn: an **event-class** match (journal kind) ends the current turn with its moves — or with an agent action, owner involved only on escalation; a **time-class** match (a due entry) *opens* a turn | verification/escalation events (partially) | event kinds exist (`agent/journal.ts`); the *rule layer* doesn't |
| **Obligations calendar** | the instantiated time-class entries per org (`dueAt` rows); a worker sweep (reaper-style) evaluates due entries and opens the turn | — | nothing — the second review-ring primitive from roadmap Part I, restored here |
| **Intake** | a channel that turns an outside event (ticket, payment webhook, email) into a journal event so situations can match it | external systems actuation (reverse) | Slack channel v1 (dormant); no general concept |
| **Journal** | the event spine; every notable transition is a row | journaled lifecycle | `AgentEvent` ✅ |
| **Artifact** | a durable produced thing, owned by a module, filed by path | environmental delta | `Artifact` row (untyped payload) |
| **The Library** | the artifact surface; folders mirror the map | semantic memory (subset) | derived folders, hardcoded General/Engineering (`apps/web/src/lib/dock/live.ts` `docFolder()`) |
| **Scorecard** | a field's 5-15 health numbers, composed of module slices | — | nothing |
| **Heartbeat / reset** | the review ring: weekly scorecard beat / quarterly outcome regrade | — | nothing (DEVELOPMENT.md P4) |
| **Approval** | a human gate on the irreversible | escalation boundary | `Approval` row ✅ |

Terms with no paper counterpart (move, situation, heartbeat, module) are framework-native; terms with
no framework counterpart (capability registry, graph versions) stay theory-side until code needs
them. The schema migrates toward this vocabulary only where cheap (decided, D3).

**Usage rule:** "current outcome" is always written qualified; a bare "outcome" always means an
instantiated outcome-vocabulary entry. Map authors: never write the unqualified word for the field's
aim.

**Today in code:** the table's rightmost column *is* the status. The load-bearing gaps: no Outcome
object, no module anything, no situation rules, no scorecard.

## §2 — The field, redefined

A **field** is an addressable domain of operation. Formally:

```
field = path                      work/company/engineering
      + charter                   (authored, small, stable)
      + modules[]                 (authored — where the work-shaped things live, §3)
      + live state                (accumulated per org/person — never authored)
```

**The charter** — what stays at field level after the module factoring (this replaces the "seven
authored things"; the work-shaped things moved into modules):

1. **Purpose** — one paragraph: what this field is for and what "healthy" means here.
2. **Scoping script** — the authored interview that makes the field's outcomes definable. Composed:
   each module contributes a *scoping fragment* (the questions it can't operate without); the field
   script sequences them and adds the field-level beats (the fork questions, the classification).
   Part III's interview tree is the `work/company` scoping script — the existence proof.
3. **Cadences** — the field's review ring: when the heartbeat beats (weekly, per-cycle) and when the
   reset runs (quarterly). The execution ring's speed belongs to modules (a build, a ticket, a close).
4. **Scorecard** — the composed view: each active module contributes its slice; the field's
   scorecard is the union, capped at 5-15 numbers, read at the heartbeat.
5. **Field situations** — the checkpoints owned by the field itself, not any module: the quarterly
   reset (regrade the current outcome), the activation gate, and any triage re-triggers (Part III's
   "payroll scary" → cash triage is the existence proof). Module situations live in module slot 6;
   these are the level above.

**The live state** (unchanged from roadmap Part II — it was right): context doc(s) · current outcome
· open work · memory.

**Worlds and the root.** A world is a field with sub-fields and a setup arc (a scoping script big
enough to have chapters: scope → connect → blueprint → first ship). `work/company` is a world;
`personal` is a world. Every world carries a **steering module** (§3) — the world-level loop is
itself module work, so worlds satisfy "a field with an empty module list is a routing target, not a
field" by construction.

The root **YOU** is not a field — it is the person — but it is not exempt from the framework either.
Its mini-charter, stated once: one **root-attached skill** (the first-contact person-scoping beat:
2-3 questions about you before "what are you building"); one **artifact type** (the person-context
doc — the root's only Library presence, a root-level *You* folder); readable from every field, never
written by any field. No modules, no scorecard, no workspace — the root's loop is the slowest and
surfaces only as personalization.

**Activation (decided, D2):** fields activate; modules ship. A module is *shipped* when its authored
package is complete and its tools run (a per-module fact, so Design can ship `design-system` months
before `brand-identity`). A field *activates* for an org when three things hold: its **minimum module
set** is shipped · *that set's* scoping fragments are answered · the owner approves the activation
gate (today's `activate_departments` approval generalizes to per-field). The minimum-set criterion
map.md must justify per field: *the smallest module set whose outcome vocabulary covers the field's
canonical first outcome.* Activation makes the folder appear, the situations arm, the workspace
open, the outcome vocabulary routable. Dormant fields stay invisible: no empty shelves.

**Inheritance (kept from Part II, restated over modules):** context flows down (a module reads its
field's context, its ancestors' context docs, and the root's person-context — never the reverse);
outcomes cascade (a module's outcome serves the field's current outcome serves the parent's);
situations bubble up (a module's situation surfaces at whatever level needs the owner); the Library
mirrors the path (filing is never a decision — the producing module determines folder and type).

**Today in code:** `Department` rows + `agent/setup.ts`'s derived stages are a two-field prototype of
activation (company + engineering). Charters, module sets, composed scorecards: nothing. The scoping
script exists for exactly one world (`skills/onboarding.md`).

## §3 — The module (the new first-class concept)

A **module** is a durable capability package inside a field — the unit of authoring, shipping, and
(within the product team) roadmapping. It is the layer whose absence the critique identified as the
core of the shallowness: capabilities had no owner, artifacts no producer, workspaces no derivable
structure.

**A module's authored package — nine slots, all required to ship:**

| # | Slot | What it is | Example — `engineering/delivery` |
|---|---|---|---|
| 1 | **Purpose** | one line | turn an approved plan into a verified, published change |
| 2 | **Outcome vocabulary** | the kinds of "done" it owns, each with an acceptance-predicate *template* | shipped feature · fixed bug · green deploy — predicate: preview live + tests green + published |
| 3 | **Artifact types** | the typed documents/things it produces → its Library presence | plan · pr_diff · site_preview · verify verdict · agent_session |
| 4 | **Skills** | SKILL.md packages injected when its work runs (§4) | `delivery` skill: plan-shaping, rework policy, publish discipline |
| 5 | **Tools / ports** | the deterministic actions its work needs | `run_coding_agent` · `open_preview` · `verify_acceptance` · `request_publish` (sandbox, git, deploy ports) |
| 6 | **Situations** | the checkpoint rules it arms — event-class + time-class | preview_ready · build_failed · verify_failed / (time) none |
| 7 | **Scorecard slice** | its 2-5 numbers in the field scorecard | deploy frequency · lead time · verify pass rate |
| 8 | **Scoping fragment** | the questions it can't operate without | repo? stack? deploy path? what must never break? |
| 9 | **Workspace panel** | its UI surface, derived from slots 2-3 (§6) | the workplace: task selector · preview iframe · publish gate |

**Relations.**
- field `1—n` modules; a module belongs to exactly one field (cross-field needs decompose, like
  cross-field intents).
- module `n—n` skills (a skill can serve two modules; rare, allowed). Tools are `n—n` with modules
  too — a tool is port-backed and shareable (`generate_image` is owned by `design/asset-production`
  and borrowed into engineering delivery runs via the composition rule below).
- **agents execute modules' work — agent ≠ module.** An agent is a runtime (a tool-loop with a
  contract). At dispatch, a task is routed to a module; the module determines which skills inject
  into the executing agent's prompt and which tools it gets. One department agent can execute several
  modules' work (the Engineer executes delivery + database today); one module's work could be
  executed by different agents over time. This is what retires "departments = agents" (D6): a
  department is a field's surface, *containing* agents.
- a module's skills are the paper's authored decomposition methods; its acceptance-predicate
  templates are the paper's acceptance predicates; routing a task to a module is the product-layer
  version of the paper's capability-registry match.

**The executor rule (who runs a module's work).** Every module declares its **executor class** in
map.md:

- **`department-agent`** — actuation-shaped work (external side-effects through ports). Runs in the
  field's agent; a field with `department-agent` modules ships one department agent at activation
  (map.md names it). The Engineer is engineering's.
- **`lu`** — conversation- and document-shaped work (interviews, drafts, reviews, plans). Runs in
  Lu's own tool-loop with the module's skills and tools injected — Lu's "you do NOT do the work
  yourself" posture applies to *actuation*, not to steering and document work, which she has always
  done (the interview, `draft_doc`, `propose_plan`). Fields whose modules are all `lu`-executed
  (most of `personal/*`) never need an agent row.

**The composition rule (one run, several modules).** A run's toolset = the union of the tools of the
task's plan-named modules within the field (default: the field's shipped modules); injected skills =
the task's *primary* module's, plus a secondary module's skill only when a plan step names it. The
live Engineer run — `create_site` → delivery tools → database tools → `request_publish` in one loop —
is the union rule in action, not a violation of scoping.

**Module archetypes (which slots may be empty).** Two archetypes, declared per module in map.md:

- **`actuation`** — all nine slots required. Verification is empirical (the paper's loop).
- **`advisory`** — conversation + artifacts only: slot 5 is the generic doc tools (draft/revise/
  file), slot 6's event-class rules may be empty (time-class usually isn't — cadences are the spine
  of personal fields), and slot 9's panel renders artifacts without gated actions. Verification is
  the owner's confirmation or tracked self-report, not an external predicate — §8's falsifiable test
  runs to "the artifact exists and the scorecard moved," which is honest for a domain with no port.
  Most `personal/*` and early professional modules are advisory; an advisory module can be *promoted*
  to actuation when a real port arrives (personal/finance gains a bank feed; health gains a wearable)
  — the slots fill, the archetype flips, nothing else changes.

**The steering module (the world-core convention).** Every world's charter-level work is itself a
module: **`steering`** — executor `lu`; owns the world's context doc(s), the current-outcome record
and outcome list, the plan/draft/spawn/status tools (today's `propose_plan`, `draft_doc`,
`spawn_agent`, `list_status`, `create_task`, `assign_to_department` — `orchestratorTools.ts`), the
heartbeat + reset situations, and the world scorecard's composition. Its surface is not a tab: it IS
Home + the dock (§5). `work/company/steering` is the first instance; Lu's unowned tools now have an
owner.

**Worked examples** (full versions in map.md):

- **`engineering/system-architecture`** — owns: architecture doc + decision records (artifacts);
  outcome vocab: approved blueprint · recorded decision; situations: architecture-doc unapproved and
  a build waits; scoping: what exists already / what must never break; panel: the architecture doc +
  decision log. Skills: architecture-drafting (from the business context + repo read).
- **`engineering/delivery`** — the table above; it is live today in all but name.
- **`design/design-system`** — owns: tokens doc · component inventory · usage guidelines; outcome
  vocab: adopted token set · documented component; situations: off-system asset detected (later);
  scoping: what surfaces exist first? references loved/hated?; panel: the token board + component
  gallery. Skills: design-system authoring (anthropic frontend/brand skills as base — map.md).

**Shipping discipline (decided, D2):** the product roadmap is a module list. "Ship one department
fully, then dogfood it" (COMPANY.md) remains the user-facing rhythm via activation gating — but the
buildable, verifiable unit is the module, and a department may activate with its minimum set while
later modules ship into it live.

**Today in code:** nothing carries the concept. The nearest fossils: the Engineer's eight tools
cluster into delivery (`run_coding_agent` `open_preview` `verify_acceptance` `request_publish`) +
database (`provision_backend` `run_migration`) + site-creation (`create_site`) + one borrowed design
tool (`generate_image` — future owner: `design/asset-production`); `ModuleStub.tsx` is an abandoned
UI sketch. The absence is the point — every slot above exists *somewhere* for engineering, hardcoded;
the module makes the pattern authorable.

## §4 — The skill system, proven on paper

The question the founder asked: *how would a skill system be used at all?* Answer: a skill is how a
module's craft reaches a running agent — the only mechanism by which authored knowledge enters a
tool-loop. Three parts: format, attachment, injection.

**Format (decided, D5): the anthropics SKILL.md convention, extended.** A skill is a folder:

```
skills/
  work/company/engineering/delivery/
    SKILL.md            # frontmatter + the procedure (progressive disclosure: keep it < ~150 lines)
    references/…        # deeper material loaded only when the procedure says to
```

Frontmatter, extended with attachment metadata:

```yaml
name: delivery
description: How to take an approved plan to a verified, published change.
metadata:                              # attachment block, nested to stay spec-compliant
  field: work/company/engineering      # the owning path (field, world, or the root)
  module: delivery                     # OPTIONAL — omitted for field/world/root-attached skills
  trigger: task-matched                # mode-gated | task-matched | situation-fired
  requires: [sandbox, git, deploy]     # ports the procedure assumes
```

**Attachment levels.** `module:` is optional because not every authored procedure is module work —
the levels and their legal trigger classes:

| Attached to | Examples | Legal triggers |
|---|---|---|
| **module** | delivery, receivables, design-system | task-matched · situation-fired |
| **field** | the field's scoping script · its heartbeat agenda | mode-gated (while unscoped) · situation-fired (the beats) |
| **world** | the setup arc (today's `onboarding.md`) | mode-gated (while the arc is incomplete) |
| **root** | the person-scoping beat | mode-gated (first contact) |

Authored-only for now; the two orphan `skills-lock.json` files are scheduled for deletion, and a
lockfile returns only when the first *vendored* skill ships through a real sync mechanism (the
anthropics/skills catalog is a **source of inspiration and forkable base material** — map.md names
which catalog entries seed which custom skills).

**Attachment.** Skills belong to modules (n—n). The loader generalizes from today's flat directory to
a tree mirroring the map, indexed by the frontmatter. `getSkill(name)` becomes
`skillsFor(module, trigger)`.

**Injection — three classes, generalized from the one that exists:**

1. **Mode-gated** (exists today): a derived state says the skill applies for every turn until the
   state clears. A mode-gated skill may reshape the whole turn — swap the system prompt, scope the
   toolset, change the stop condition — exactly as scoping mode does today
   (`onboardingSystemPrompt` + the `ask_user`/onboarding toolset swap + `hasToolCall("ask_user")`,
   `agent/orchestrator.ts:118-136`). Generalized: each field's *scoping script* is a mode-gated
   skill active while the field is unscoped.
2. **Task-matched** (the workhorse — nothing today): dispatch routes a task to a module; the module's
   task-matched skills inject into the executing agent's system prompt for that run, and the module's
   tool set scopes the agent's tools. This is how the Engineer's hardcoded craft becomes authored
   files.
3. **Situation-fired** (nothing today): a situation match injects the skill for the turn that
   handles it. Event-class: the match shapes the turn already in flight (or the report-back turn).
   Time-class: the obligations-calendar sweep (§1 — a reaper-style worker) finds a due entry and
   *opens* a turn with the skill injected — this is how a turn begins with no owner message; **the
   sweep also creates the turn's Task row and instantiates the outcome** (so "close on time" has a
   real object with dates to check). The weekly review is the canonical case: the heartbeat entry
   comes due → the field's heartbeat skill (the L10-derived agenda) injects → Lu opens the review
   with the scorecard. Inbound external events reach this class through **intake** (§1): channel →
   journal event → situation match; a situation's response may be a pure agent action (support
   resolves a ticket), with owner moves only on escalation. DEVELOPMENT.md P4's "a situations
   section per field skill" resolves here: situations are module slot 6 / charter item 5, *not* a
   section inside one skill file. A skill's `trigger:` is **list-valued** — monthly-close fires from
   the calendar *and* when the owner asks mid-month (task-matched); one skill, both triggers.

**The situation-rule format** (the authorable record — map entries and skills declare rules in this
shape; the falsifiable test proved authoring is impossible without it):

```yaml
rule: close-late                     # unique within the owner
class: time                          # time | event
owner: finance/close                 # module, field, or world path
match:                               # time: a calendar-entry spec — recur (monthly day 10, weekly Mon,
                                     #   every N weeks, fixed date), and satisfiedBy: an outcome whose
                                     #   completion cancels/resolves the pending entry
                                     # event: a journal kind (+ optional payload predicate)
guard: outcome-not-met               # optional derived-state check before firing (never a stored flag)
response: open-turn                  # open-turn | shape-turn | agent-action
skill: monthly-close                 # injected on fire
moves: [finish-now*, show-blockers, accept-late]   # owner moves (* = recommended); empty for agent-action
```

Two consequences the format encodes: recurrence and cancellation live in the calendar entry
(`recur` + `satisfiedBy`), and **stateful predicates** ("variance ≥10% *twice*") live in artifact
payloads (a counter field), never in the rule — rules stay stateless matches. Modules declare the
journal kinds they **emit** alongside the rules they match (map.md's slot-6 convention), so
cross-module wiring (close emits `budget_variance_breached`; forecast matches it) is authored on
both sides.

**The end-to-end trace** (every step: real file or explicit gap). Intent: *"invoice my client for
the March work."*

| Step | What happens | Today in code |
|---|---|---|
| 1. Map | orchestrator resolves intent → `work/company/finance` | `DEPARTMENTS` const has `finance`; routing is prompt-vibes, no map object — **gap** |
| 2. Field gate | finance active? if dormant → its scoping fragment first | `Department` row exists as stub; activation derivation only for engineering (`agent/setup.ts`) — **gap** |
| 3. Module | task routed to `finance/receivables`; outcome "invoice sent + tracked" instantiated from its vocabulary with an acceptance predicate | no modules, no outcome objects — **gap** |
| 4. Skill | `skillsFor(receivables, task-matched)` injects the invoicing procedure into the executing agent | loader is flat + single-consumer (`agent/skills/index.ts`) — **gap** |
| 5. Tool-loop | the executor runs with the module's tools — per the executor rule: `lu` while receivables is advisory (draft the invoice doc), the Finance agent once a billing port ships and the module promotes to actuation | agent runtime pattern exists (`generateText` loops, system.md §1) ✅; finance tools/port — **gap** |
| 6. Artifact | the invoice doc (typed payload) files to Library → Finance | `Artifact` row ✅; typed payloads + folder-from-path — **gap** (`docFolder()` hardcodes General/Engineering) |
| 7. Verify | acceptance predicate checked empirically (invoice exists in the billing system) | verification pattern exists for engineering (`verify_acceptance`) ✅; per-module verifiers — **gap** |
| 8. Check | scorecard slice updates (DSO, AR aging); situation `invoice_overdue` (time-class) arms | nothing — **gap** |
| 9. Report | journal event + thread report-back with the situation's moves | `AgentEvent` + `postToThread` + `meta.choices` ✅ |

Steps 5, 6(row), 7(pattern), 9 exist as machinery; 1-4, 6(typing), 8 are the framework's build
surface. The same trace with *"ship the pricing page"* runs today end-to-end through hardcoded
equivalents — which is the proof the generalization is extraction, not invention.

**Today in code:** one skill, one consumer, one trigger class. The engineering skill does not exist —
the reference module's craft is trapped in `engineering.ts` prompt strings.

## §5 — The UI translation contract

Every framework concept has **exactly one primary surface, or is declared invisible.** No concept
may ship UI outside its row; no surface may render a concept that has no row. This table is the
contract that prevents the next four-competing-trees incident.

| Concept | Primary surface | Also appears as | Invisible? |
|---|---|---|---|
| The map | — | (routing behavior only: who speaks, what files where) | **yes — the loop is invisible** |
| Field | the **department workspace** (§6) + its canvas hub | Library folder · dock scope chip | |
| World | its own canvas — one canvas per world, a **world switcher** in the dock (the company canvas is `work/company`'s; `personal` gets its own, not company hubs) | — | |
| Steering module | Home + the dock (not a tab — §3's convention) | the weekly-review turn | |
| Root (YOU) | — | personalization of every surface · the *You* folder (person-context doc) | **yes** |
| Module | a **panel** (tab) inside its field's workspace | its doc types in the Library folder · its scorecard tiles | |
| Intake | — | its events in the journal · the situations it triggers | **yes** |
| Skill | — | journal evidence ("used the delivery playbook") | **yes** |
| Agent | a worker chip *inside* the department workspace/hub — pulses while working | canvas hub caption | |
| Situation | its **moves** on Lu's message (the choice card) | Home's Suggested Next (the one frontier) | |
| Move | the choice card ON the message | Home next-list · (later) Slack buttons | |
| Current outcome | the workspace header + the weekly-review opener | — | |
| Task | card / row / page (product.md §1 — unchanged) | canvas badges | |
| Artifact | the Library (doc viewer) | its module's panel | |
| Scorecard | the workspace scorecard strip | the weekly review's opener | |
| Approval | where you are: chat card · task page · Slack | — | |
| Heartbeat/reset | a Lu turn in the thread (time-fired situation) | — | |

Consequences worth stating: the canvas renders **departments as hubs and agents as workers within
them** (D6 — `lib/canvas/graph.ts`'s `AGENTS` array is superseded); the dock's five tabs survive
unchanged; the Library grows folder-by-folder with activation exactly as today.

**Today in code:** task sizes, moves, approvals, Library, canvas hubs: live (product.md, verified).
Module panels, scorecard strips, outcome headers, worker chips: not started. The department route
renders from the fictional canvas registry — superseded by this table.

## §6 — The department workspace anatomy

What the owner sees inside a department. Two layers, and one rule that makes it a framework rather
than a mockup list:

> **workspace(field) = the universal shell + one panel per active module, and a module's panel
> renders its owned artifact types.** Authoring a module *implies* its UI.

**The universal shell** — the same five elements for every field, with archetype-driven variants:

1. **Header** — field name · **current outcome** · the scorecard strip (the module slices, 5-15
   numbers, heartbeat-fresh).
2. **Module tabs** — one per active module (dormant modules absent, not disabled — the honesty rule).
3. **Work rail** — the field's open tasks (rows → task page) and pending approvals.
4. **Library slice** — this field's folder, inline (doc preview cards → the doc viewer).
5. **Lu rail** — the conversation, scoped to this field (same thread, filtered lens; the chat is
   still the log).

**Shell variants.** The shell is not company-flavored by default; elements derive from what the
field's modules actually declare. A field whose modules are all `advisory` (most of `personal/*`)
drops what its modules can't produce: no approvals in the work rail (advisory modules have no gated
actions), no agent worker chips (no `department-agent` executor), and the work rail leans on the
obligations calendar (the next due beats) rather than a task queue. `personal/health`'s workspace is
header (goal + adherence streak) · program/habits panels · its Library docs · the Lu rail — a
coaching surface, not a department with an approvals queue. Same shell, honestly derived.

**The per-module panel** — the varying part, derived from slots 2-3 of the module package:

| Field / module | Panel renders |
|---|---|
| engineering/**delivery** | task selector · live preview iframe · request-changes · publish gate *(= today's "workplace")* |
| engineering/**database** | schema · migrations · storage/auth/users · gated key actions *(= today's console)* |
| engineering/**system-architecture** | the architecture doc · decision records log |
| design/**design-system** | token board · component gallery · usage guidelines |
| design/**brand-identity** | brand kit · moodboards · concept decks (rounds tracked vs the cap) |
| design/**asset-production** | the asset gallery · template library |
| finance/**receivables** | invoice list + aging · dunning queue |
| finance/**close** | P&L / balance sheet / cash-flow · close checklist |
| sales/**pipeline** | the stage board · per-deal next actions |

(The full set per field: map.md. The pattern to notice: every panel is *artifact types + the module's
gated actions* — nothing else is allowed in a panel.)

**The competitive read (cofounder.co, researched 2026-07-19; details → COMPANY.md's competitive
frame).** Cofounder 2's macro shape — canvas → department → focused workspace with its own agents,
tasks, files, rules, and context — is the shape users will arrive expecting, and Lu adopts it. The
divergence is this section's rule: Cofounder's workspaces are generic containers; Lu's panels are
*derived from modules* — the panel IS the module's artifacts and gates, which is why Engineering
shows a database console and Design will show a token board, not a files list.
(Sources: [cofounder.co](https://cofounder.co/) · [docs.cofounder.co](https://docs.cofounder.co/) ·
[DataCamp tutorial](https://www.datacamp.com/tutorial/cofounder-2-tutorial) ·
[AgentAya review](https://agentaya.com/ai-review/cofounder/).)

**Today in code:** Engineering's shell+panels exist in pieces (`components/canvas/CompanyCanvas.tsx`
hub → department route → workplace + console per product.md §4) but hand-built and duplicated across
`department/`, `dept/`, `team/`, `workspace/` trees. The shell/panel split exists nowhere; S4
schedules the consolidation; the framework makes it derivable.

## §7 — State, memory, and the Library along the tree

- **Context flows down.** The executing agent's prompt is assembled root-first: person-context (YOU)
  → world context docs → field context → module scoping answers → the task. Never upward; a parent
  sees a child's *outcomes*, not its internals. Today: org memory + situational block approximate
  the world level (`agent/orgMemory.ts`, `situational.ts`); per-field context slices don't exist.
- **Outcomes cascade.** A module's instantiated outcome must serve the field's current outcome, which
  serves its parent's. Lu proposes child outcomes derived from the parent's — the authored-boundary
  rule applied to goals.
- **Situations bubble up.** A module's situation surfaces wherever the owner is; you hear about a
  broken build without being "in" engineering. Today: report-backs post to the one thread ✅ — the
  bubbling is trivially true with one thread and must stay true when field-scoped lenses arrive.
- **The Library mirrors the map.** Folder = field path; a document's type = a module's artifact
  type; filing is determined by the producing module. **Typed payloads (spec):** every artifact type
  declares a schema (the doc-type registry lives with the map, one Zod schema per type, shared by
  producer tools and every renderer). Defensive re-parsing at consumers (`live.ts`, `setup.ts`,
  `ActivationGate.tsx`) is retired by construction. Implementation downstream. **Registry
  conventions** (from the falsifiable test): type ids are kebab-case (`pnl`, `balance-sheet`,
  `close-checklist`); a type is owned by exactly one module (world-shared types like `plan` are
  owned by steering); cross-module *reads* are declared in the consumer's map entry ("consumes:
  forecast's budget"), never silent; progress surfaces (checklists) are real artifact types, not
  UI-only state — §6's panel law stays absolute. Scorecard values are **derived at heartbeat read**
  from the latest relevant artifact payloads and journal rows — no stored scorecard state (the
  "state is derived, never invented" rule applied to numbers). Advisory modules' generic doc tools
  are backed by the **Store port**; their `requires:` may name only `store`.
- **Memory.** Working memory (thread) and core memory (consolidated) stay org-level; field-level
  memory is the module scoping answers + the field's context docs — structured rows, not vector
  recall. pgvector/AST index remain the paper's semantic-index tier, unblocked but unchanged by this
  framework (system.md §8).

**Today in code:** one thread, one memory tier, two Library folders, untyped payloads — all listed
with their files above.

## §8 — The authoring recipe (for Lu, and for us)

The successor to system.md §10 — which described adding a *worker*; this describes adding
*capability*. It is also, deliberately, the team's own working process: the product roadmap is a
module list (D2), and DEVELOPMENT.md's NOW task should name the module it ships.

**To author a module** (the unit of work):

1. **Charter it in map.md** — fill the nine slots (§3). If you cannot fill slot 2 (outcome
   vocabulary) or slot 6 (situations), you don't understand the capability yet — research first (the
   Field Book's per-domain research is the input).
2. **Write its skills** — SKILL.md folder(s) under the field path, frontmatter attachment, procedure
   < ~150 lines, references for depth. Fork/adapt an anthropics/skills catalog entry where map.md
   names one.
3. **Declare its artifact types** — names + payload schemas into the doc-type registry.
4. **Define its tools** — reuse ports where they exist; a new external system = a new port first
   (system.md §5's recipe still applies at this layer).
5. **Arm its situations** — event-class rules keyed to journal kinds it emits; time-class entries
   for its obligations.
6. **Its panel comes free** — the workspace renders slots 2-3; review that the derived panel is
   right, don't design a bespoke one.
7. **Verify like we verify everything** — the falsifiable test: hand the module's map.md entry +
   skills to a fresh session and ask it to execute one outcome end-to-end (for `advisory` modules:
   to the produced artifact and the moved scorecard, per §3's archetypes); if it must invent
   structure, the module isn't authored yet.

**To author a field:** charter (§2) + minimum module set + scoping script (sequenced from module
fragments + field-level forks — Part III remains the reference for world-depth scripts) + cadence
declaration. A field with an empty module list is a routing target, not a field.

**To author a world:** a field + a setup arc (scope → connect → blueprint → first verified ship —
extracted from Part III chapters 0-4) + its standing-loop situation set (chapter 5's table is the
template).

**Today in code:** the recipe's every step lands somewhere real: map.md (S3), the skills tree (§4),
the doc-type registry (§7), `*Tools.ts` + ports (system.md §5), the situation rules (P4), the
workspace (§6). What retires: system.md §10's step 6 ("department pill on the canvas; app cards") —
surfaces are now derived, not hand-added.

---

*Instantiation of every field on the map — with modules, skills (anthropics catalog mappings), and
workspace specs: [map.md](./map.md). Superseded: roadmap.md Part II. Scheduled by S4: DEVELOPMENT.md
resequencing (registry unification, skills-tree loader, typed payloads, workspace consolidation,
lockfile deletion, Lead Answered purge).*
