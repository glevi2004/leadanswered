# Lu Computer — onboarding (two phases: sign-up, then Lu onboards you)

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md) §8. Companions:
> [agent-backend.md](./agent-backend.md), [building-agents.md](./building-agents.md); status in
> [DEVELOPMENT.md](../DEVELOPMENT.md). **Status: BUILT (2026-07-17)** — both phases ship (Phase-1 UI, the general
> skill system, onboarding-mode, decision cards, the Business Plan gate, department activation); typechecks
> across both apps. Modeled on cofounder.co's onboarding, adapted to Lu. Supersedes the scripted wizard.
>
> **How it's wired (built):** onboarding-mode is **derived** — an org with no `active` department is onboarding
> (no DB migration). Lu's onboarding "file" is the **general skill system** (`apps/api/src/agent/skills/`):
> `getSkill("onboarding")` returns a markdown procedure the orchestrator injects while onboarding, swapping her
> toolkit to `ask_user` + `propose_decisions` + `draft_business_plan` (`apps/api/src/agent/onboardingTools.ts`).
> Those write **org-level `doc` artifacts** the dock renders (`OnboardingDecisionsCard`, `BusinessPlanCard`, via
> `LuOnboardingTracker` in the thread); `draft_business_plan` stages an `activate_departments` approval, and
> **Accept** resolves it → `provisionDepartments` (Engineering active) → onboarding-mode ends. Phase-1
> (`OnboardingFlow.tsx` → `finishSignup` → `/canvas`) seeds Lu's memory but activates nothing.

Onboarding is **split in two**:

1. **Sign-up** — a short, beautiful, *static* question flow (name → role → idea stage → company name). No AI. It
   exists only to create the account + the company and drop you into the workspace fast.
2. **Lu onboards you** — the *real* onboarding happens **inside the workspace**. Lu (the cofounder at the center
   of the canvas) runs an **onboarding procedure** (her "onboarding file"): she asks about the company, makes a
   few **decisions** with you, drafts a **Business Plan**, and on your OK **activates your departments**.

The point of the split: the heavy "understand the business" work is *Lu's job*, done conversationally in the
product — not a form you fill before you've seen anything.

> **Framing.** This flow adopts the **builder/startup** framing (matches the attached design + the "replace
> Cursor" / Studio-distro direction — [platform-vision]): roles are Product/Engineering/Design/…, stages are
> Pre-idea→Public, the Business Plan talks ICP/mission/values/GTM. It is no longer the "service business" flow.

---

## Phase 1 — sign-up (static, no AI)

Replaces the scripted `OnboardingSketch` at `/onboarding`. Full-screen, editorial: an **ASCII-art wordmark**
("Welcome to Lu Computer") on the left, ONE question on the right, a persistent **Log out** at top-left. Uses the
pixel/editorial design system ([design-system.md](./design-system.md)) — a **pixel emblem** (Lu's own; the
cofounder screenshots use a sunflower — we need Lu's mark) appears on the "Create your company" screens.

| # | Screen | Input | Captures |
|---|---|---|---|
| 1 | **What should we call you?** | text — "Your name" | owner display name |
| 2 | **Which best describes you?** | single-select, numbered `01–08`: Product · Engineering · Design · Marketing · Sales · Operations · Founder / Executive · Other (one shows a checked state) | owner role |
| 3 | **What stage is your idea?** | slider across `Pre-idea · Idea · Pre-MVP · MVP · Customers · Revenue · Public` | idea stage |
| 4 | **Create your company** | intro screen — pixel emblem + **Continue** | (transition) |
| 5 | **Create your company** | text — "Company name" (+ **Back**) | company name |

**On finish:** call `completeOnboarding(config, companyName)` — persists the company + flips
`onboardingComplete=true` (`apps/web/src/app/onboarding/actions.ts`, `lib/organizations.ts::setOrganizationConfig`)
— then land in the workspace (`/home` or `/canvas`). No "your company is live" recap; the workspace IS the next
step.

**What Phase 1 captures → where it goes.** The four answers are thin identity, not a full profile:
- `companyName` → org config `companyName`.
- `owner name`, `role`, `idea stage` → seed Lu's **per-org memory** (`core`/`business` Memory row via
  `resolveOrgMemory` — the seam Lu actually reads; [agent-backend.md §4], `provision.ts:118-128`) so Lu opens
  Phase 2 already knowing who you are and roughly what you're building.
- The legacy `OrganizationConfigInput` fields (service area, project types, availability) stay **honest-empty** —
  or we trim the schema to the builder shape (open decision D3).

> **Data-model note.** Phase 1 needs a couple of small, additive fields (owner `role`, `ideaStage`) — likely on
> the memory seed rather than the org row. No new tables. See Build order.

---

## Phase 2 — Lu onboards you (in the workspace)

You land on the **canvas**: Lu (the "cofounder") node centered in an empty ring (departments not active yet), and
the **right-side dock** (`SarahDock` — `components/sarah/SarahWidget.tsx`) open on a first-run onboarding
conversation. Lu drives; you approve.

**The beats (from the design):**

1. **"Tell me more about your company"** — the composer prompts *"Share what you're building…"*. You type a
   sentence or two.
2. **The Onboarding doc + intro** — an **"Onboarding" doc** (titled `Onboarding · lu.computer · <you>`) appears in
   the thread, and Lu introduces herself: *"Hey <name> — I'm Lu, and I'm excited to build lu.computer with you.
   We'll sharpen the product definition, ICP, mission, values, business model, go-to-market, and classification so
   the brief is grounded enough to build against."* This doc is **her onboarding file made visible** (§ The
   onboarding file).
3. **Decision cards** — Lu asks a small series of **multiple-choice decisions** (the design shows `2/5`), each with
   3–4 options, one flagged **Recommended**, and **Decide this one** / **Decide all** (let Lu pick the rest). e.g.
   *"What is the core orchestration problem you solve first?"* → Multi-agent workflow runtime *(Recommended)* /
   Agent tool-memory-state layer / Observability & control plane / Deployment & scaling / Something else. Answers
   refine the brief.
4. **The Business Plan doc** — Lu drafts a **Business Plan** (sections like **Business Classification** — Company
   Type / Industry / User Type — and **Company Values** — bullets), shown as an editable doc (**Edit** + expand),
   with **Accept & activate departments** at the bottom. *"Ask for follow-up changes…"* revises it (same
   approve / request-changes / revise loop as the plan gate).
5. **Accept & activate departments** — on accept, the company **boots**: departments transition to active (today:
   Engineering for real; the rest as the roadmap), the canvas fills in, and Lu is ready to build. This is the
   real end of onboarding.

### The onboarding file (Lu's procedure)

"Lu has an onboarding file describing what to do" = a **procedure Lu follows on a brand-new org**. **Built as
the general skill system** (D1): `apps/api/src/agent/skills/` — a markdown procedure any agent can load;
onboarding is the first skill. Onboarding-mode is **derived** (org with no `active` department), and while it
holds, the orchestrator injects the skill and swaps Lu's toolkit to `ask_user` + `propose_decisions` +
`draft_business_plan`. ([building-agents.md §8](./building-agents.md).)

---

## What exists vs. what's net-new (grounded)

**Reuse (already built):**
- The **plan → `doc` artifact → approval-card → resolve → dispatch** loop is the exact template: `propose_plan`
  (`orchestratorTools.ts:165`) → `doc` payload → `PlanApprovalCard` → `/api/approvals/:id/resolve`
  (`routes/approvals.ts:63`). The Business Plan "Accept" and the decision cards are variants of this.
- The **right-side dock + one Lu thread**: `SarahDock`/`SarahThread`/`SarahComposer`, `useSarah().sendMessage` →
  `/api/lu/chat` → `apps/api /api/lu` orchestrator. `LuBuildTracker` already renders approval cards inline.
- **Provisioning** exists (`apps/api/src/onboarding/provision.ts`) and is idempotent; `completeOnboarding` already
  calls it.
- **Per-org memory** (`resolveOrgMemory`) is the seam Lu reads — onboarding already seeds a `business` memory.

**Net-new:**
1. **Phase-1 UI** — 5-screen static flow (new components; delete/park `OnboardingSketch`).
2. **A "brand-new org" / "activated" flag** — so `requireOrganization` still lets an un-activated but onboarded
   org into the workspace, and Lu knows to run onboarding-mode. (onboardingComplete already lets them in; add an
   `activated`/`departmentsActivated` flag distinct from it.)
3. **Decision-card tool + renderer** — a new orchestrator tool (multi-choice question, options, a `recommended`
   index, "decide all") + an inline card in the thread (extends `ask_user`, which is single-question today).
4. **Business-Plan doc + renderer** — a `doc` payload `{type:"business_plan", classification, values, …}` + a
   thread renderer (no generic doc renderer exists today — only the plan case is rendered).
5. **Department activation** — a **Store mutation** to flip departments `in_development → active` (none exists) +
   an orchestrator tool/approval action `activate_departments`, wired through the same resolve endpoint.
6. **The onboarding procedure** — the onboarding-mode prompt + seeded Onboarding doc (§ above).

---

## Build order (✅ all shipped 2026-07-17)

1. ✅ **Phase 1 UI** — `OnboardingFlow.tsx` (5 screens) → `finishSignup` → `/canvas`.
2. ✅ **Gate** — no flag needed; onboarding-mode is derived from "no active department." `finishSignup` seeds
   Phase-1 answers into Lu's memory (`POST /api/onboarding/context`).
3. ✅ **Onboarding skill + mode** — `skills/onboarding.ts`; the orchestrator injects it + swaps toolkit when the
   org has no active department.
4. ✅ **Decision-card tool + renderer** — `propose_decisions` + `OnboardingDecisionsCard`.
5. ✅ **Business-Plan doc + renderer + revise loop** — `draft_business_plan` + `BusinessPlanCard` ("Ask for
   follow-up changes" re-prompts Lu).
6. ✅ **Activation** — `activate_departments` approval → `provisionDepartments` (via `routes/approvals.ts`);
   "Accept & activate" resolves it and the canvas fills in.

## Decisions (resolved)

- **D1 — the onboarding file:** ✅ **general skill system** (`apps/api/src/agent/skills/`). Onboarding is the first
  skill; add more by writing a module + registering it.
- **D2 — landing surface:** ✅ **`/canvas`** (`finishSignup` redirects there).
- **D3 — config schema:** kept **honest-empty** for now (`finishSignup` writes a minimal config). Trimming the
  legacy `OrganizationConfigInput` to the builder shape is a later cleanup.
- **D4 — decision content:** ✅ **Lu generates** the decisions per company (`propose_decisions` — she adapts them
  from what the founder describes), rather than a fixed set.

## Follow-ups (polish, not blockers)

- In onboarding-mode the seeded generic dock welcome still shows alongside the "Tell me more about your company"
  empty state — suppress the welcome when onboarding (needs the provider to know onboarding-mode at seed time).
- End-to-end runtime pass (dev servers + a fresh org) — the build typechecks; it hasn't been click-tested live.

---

## Carried over (still true)

- **Waitlist-gated self-serve** (join → admin accepts → invite → set password → onboarding). Unchanged;
  [admin/actions.ts], [SetPasswordForm]. Phase 1 replaces only the post-auth wizard.
- **Provisioning is real, not a cookie mock**; **only Engineering is live**, the rest is the roadmap; **UI = pixel
  + editorial**, motion for personality. ([design-system.md](./design-system.md).)
- **Team graph** is **out of onboarding** — Lu can build the org chart later in the app (the real Haiku
  `add_teammate` conversation still exists; persistence is still a to-do — no `Member` model, team data is a web
  mock at `apps/web/src/lib/data/team/index.ts`).

## Debt to clear

Retire the `OnboardingSketch` scripted wizard (park its parts); replace the assistant glyph with Lu's mark; realign
the stale `/welcome` + admin-wizard copy; flip `assistantName` default to "Lu". Full register in
[design-system.md §5](./design-system.md); also [ROADMAP.md](../ROADMAP.md).
