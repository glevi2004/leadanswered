# DEVELOPMENT — the TODO

> The one file that answers **"what are we doing next?"** Everything else: [paper.md](./paper.md) (theory)
> · [COMPANY.md](./COMPANY.md) (why/what/money) · [docs/system.md](./docs/system.md) (the machine) ·
> [docs/product.md](./docs/product.md) (the experience) · [docs/design-system.md](./docs/design-system.md)
> (the look).

## How we work

- **NOW holds exactly one task**, defined by the outcomes it must produce — observable results, not
  intentions — and "done when" checks we verify before touching anything else.
- **NEXT holds at most 5**, each with a one-line outcome. **LATER** is a parking lot; no detail allowed.
- Nothing gets built that isn't the NOW task. Finishing NOW = verify its outcomes, update the docs it
  touched, promote one thing from NEXT.
- Always check the code before claiming status — docs describe the repo, the repo doesn't describe the docs.

---

## THE PLAN — "running Lu from Lu" (the roadmap, made real)

The end state: Levi signs up fresh and runs the whole company through Lu exactly as
[docs/roadmap.md](./docs/roadmap.md) scripts it — she speaks first, walks the interview tree, the
Business Context lands in the Library, she drives the connects, the architecture, the first ship, and
then the standing loop (situations + the weekly review) carries daily work. **The orchestration is
prompt engineering + derived state, and the moat is the interface**: authored `.md` scripts injected
into Lu's prompt, state derived from real rows (never stored flags), and every beat rendered as
persisted, tappable moves in the thread. Almost no new machinery — the skills loader, the setup/state
derivation, the situational block, `Message.meta`, and the card system already exist; this plan wires
the roadmap through them. Phases P1→P4 below are the NOW pipeline; each promotes when the previous
verifies.

## NOW — P1: The interface substrate (chips + Lu speaks first)

The two UI primitives every later phase renders through. Nothing about the tree ships until moves are
real, persistent objects in the conversation.

**Outcomes:**

1. **Moves live on the message.** The api persists `meta.choices` (question, options, recommended
   index, chosen) on the assistant turn whenever the turn carries options (`ask_user` feeds it);
   history hydration maps `meta` back into the thread; `SarahThread` renders a **ChoiceBar** under
   the LATEST Lu message — tappable chips, one visually primary (Recommended), free composer always
   live. Tapping sends the option as the owner's message; older turns render the chosen option
   inline (the dialogue-history feel). Reload-safe by construction.
2. **One frontier.** Home's Suggested Next reads the same persisted choices (+ pending approvals) —
   the chat chips and Home never disagree.
3. **Lu speaks first.** After Phase-1 sign-up (and for any org whose thread is empty), a kickoff
   orchestrator turn runs server-side with an internal instruction — personalized from the seeded
   memory + the skill — and ONLY the assistant opener is persisted. Idempotent via the thread-empty
   check. The dock's empty-states become fallbacks that real users never see.

**Done when:** a fresh org lands on the canvas with Lu's opener already in the thread (zero typing,
exactly once, reload-safe); a question's chips render under her message, a tap sends it, and the
chosen chip survives reload; Home shows the same moves.

**Status (2026-07-18): BUILT — verifies with the P2 fresh-org pass.** `meta.choices` persisted on
assistant turns (`metaFromActions` in routes/agents.ts; `ask_user` gained `recommended`); hydration +
live-merge map meta → chips/cards; `SarahThread`'s ChoiceBar (tappable on the latest turn, chosen-
highlight history on older ones); Home renders the same `openChoices` frontier; `POST /api/lu/kickoff`
(thread-empty idempotent, real personalized turn, `meta.source=system kind=kickoff`) fired from
finishSignup + the dock's empty-thread fallback; the MOVES RULE added to Lu's prompt.

## NEXT (the P-pipeline + the standing unblock)

1. **P2 — the interview tree via prompt engineering.** `skills/onboarding.md` rewritten as roadmap
   Ch.1: the session contract (10-15 budget, ~3-then-read-back, derive>label>confirm>ask), the trunk
   (intent fork · payroll screen · SBDC basics · owner-dependence), the three wings with their
   modules and menus. `agent/setup.ts` grows SCOPING STATE derivation: captured fields read from the
   **growing Business Context draft** (each answer upserts the doc artifact — the doc builds live in
   the Library during the interview), so Lu always knows the current node and never re-asks.
   `draft_business_plan` → `draft_business_context` with wing-flexed sections. *Outcome: three test
   personas — new SaaS founder, running-agency owner, "build me a website" — get three correct,
   different interviews inside budget, each ending in an agreed 90-day outcome; the doc grows in the
   Library as they answer. This phase's live pass IS the deferred skills/Library walkthrough.*
   **Status (2026-07-18): BUILT + smoke-verified** (`scripts/treeSmoke.ts` against the real model:
   Wing A → riskiest-assumption module with derived options; Wing B → the worst-first screens;
   Wing C → project scoping — three different correct interviews). skills/onboarding.md is the tree;
   `update_business_context` grows the draft live in the Library; `finalize_business_context` stages
   the accept gate; SCOPING STATE injected each scoping turn; plus two real orchestrator fixes the
   smoke caught (trailing-thinking 400 on the forced-reply pass; question-as-body fallback so empty
   turns never narrate machinery). Remaining: the fresh-org live pass.
2. **P3 — chapters 2-4 ride the tree.** The connect chapter consumes the interview's assets answer
   (import path when a repo exists); the architecture doc cites the Business Context; the first-ship
   proposal derives from the agreed outcome; the COMPANY SETUP stage line spans all of it. *Outcome:
   the fresh-org walkthrough runs sign-up → published first build entirely through the script.*
3. **P4 — the standing loop.** Situation rules become authored data (a `situations` section per
   field skill): event-class rules keyed to journal kinds (report-backs carry `meta.choices` — moves
   on every terminal event), and the first time-class beat — **the weekly review**: a scheduled
   worker turn that opens with the L10-derived agenda (scorecard from real rows → outcome progress →
   issues → committed moves). *Outcome: publishing a change yields the published-situation moves;
   Monday brings the weekly review unprompted; a plain question still gets plain prose.*
4. **P5 — the interface polish that is the moat.** Interview progress feel (chips show n/N on
   modules), decision cards keep the 2/5 batch, read-backs render as mini context-cards, the doc
   viewer live-updates during the interview, voice pass on every authored line in the skills.
   *Outcome: the interview feels like the cofounder screenshots — a game, not a form.*
5. **Design-partner unblock** (standing, user-side + small code) — GitHub App public · Vercel
   Integration public/unlisted · regenerate the two chat-exposed OAuth secrets · stop seeding
   platform keys into user terminals. *Outcome: a stranger's org connects all three providers; no
   platform secret reachable.*

## LATER

Canvas grants become real (artifact-backed notes) · Slack activation (manifest ready; then the same
chips render as Slack buttons) · verification screenshots · Railway deploy adapter · re-planning
(plan v2) · pgvector memory + AST index · `Task.model` threading + registry-driven coding model ·
usage-bucket enforcement · Flux/Higgsfield · watch-the-build · Revert All rollback · departments
beyond Engineering (each = authoring a field's seven things) · phone + email channels · presets
beyond Business · Sarah→Lu rename + landing rewrite · prebuilt e2b template · per-task credential
scopes · managed hosting tier.

---

## Shipped-but-unverified

- **Skills-as-files + the Library** *(built 2026-07-18)* — disk-loaded `.md` skills (drop-in
  verified), `draft_doc` + `approve_doc`, Library folders (General/Engineering) with preview cards +
  the Notion-style `/doc/[id]` viewer + the doc chat card. Its live walkthrough now rides P2 (the
  interview rewrite replaces the five-stage playbook before anyone walks the old one).

---

## Shipped (compressed — details in git history)

- **2026-07-18 — the dogfood ladder**: Task Detail page (`/task/[id]`) + card/row/page unification · live
  workspace (working agents, real Request-changes/Retry, wired console actions) · GitHub sandbox-token
  downscoping + branch protection · existing-project import + repo profiles · empirical verification
  (preview fetch + repo tests in sandbox, hard-gated) · Slack channel v1 (dormant) · Supabase build tools
  + the migration gate · web git-connected to Vercel (pushes auto-deploy everything) · API proxy auth ·
  stuck-task reaper · spawn/supervise ordered sub-agents · lu.computer domains.
- **2026-07-18 — BYO through their apps**: GitHub App + Vercel Integration + Supabase OAuth (refresh
  tokens, project picker), install-first connect UX, connect card in chat.
- **2026-07-17 — the flow layer**: AgentEvent journal · situational block · report-backs into the thread ·
  thread rehydration · plan gate + acceptance verification + publish code-gate · onboarding v2 (static
  sign-up + Lu onboards in-workspace) · the skill system (TS v1).
- **Earlier**: the agent runtime (orchestrator, Engineer, e2b, BullMQ durable worker — live), canvas +
  dock, metering + memory + consolidation, waitlist self-serve, model gateway + picker.
