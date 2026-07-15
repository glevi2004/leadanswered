# WORKSPACE-ASSEMBLY — setup flows, the onboarding sequencer, and growing a workspace

> ## ⛔ SUPERSEDED (2026-07-15)
>
> **This spec describes the app-store / "assembled workspace" model we KILLED.** Its core moves —
> a **Library** you browse, **install / uninstall** capabilities, per-capability **first-run**, a
> **dynamic per-org nav** composed from installed modules, and `composedWidgets` built from a
> capability registry — are **no longer the product.**
>
> **The final model is a fixed shell.** See **`PLATFORM-VISION.md`** (authoritative):
> - **One assistant (Lu) + a small, fixed set of surfaces, identical for every business** —
>   Dashboard · Lu · Customers · Schedule · Money · Team · Agents · Sites · Settings. **No dynamic
>   nav, no install/uninstall, no Library.**
> - **Per-business adaptation lives *inside* the surfaces** and in a **customizable Dashboard widget
>   board** (pinned "Needs you" + free-form drag/resize widgets from a **curated catalog** that each
>   surface declares) — *not* in the chrome. New orgs are **honest-empty**, not a different shape.
>
> **What still carries over (the parts worth keeping):** the **two-panel Lu-guided setup** pattern
> survives as **preset setup** for Sites & Agents; onboarding is still a **sequenced set of setup
> conversations** that write the **code of conduct**; skipped steps still surface as **"Needs you"**
> rows. What dies is the *assembled-from-a-catalog* framing — §1's `SetupFlow` abstraction, §2's
> dynamic queue, §4's `capabilities`-driven dynamic nav, §6's Library + composed Home, and §7's
> capability registry. **Read the rest of this file as historical design context only.**

---

## 0. The reframe (and what does NOT change)

> **⛔ Historical (superseded — see header + `PLATFORM-VISION.md`).** The "assembled by a subset of
> setup flows / dynamic nav / Library" thesis below is retired. The surviving idea is narrower:
> onboarding is a **sequence of setup conversations** over a **fixed** set of surfaces, each writing
> the code of conduct; there is no per-business chrome assembly.

The workspace is **assembled by running a subset of setup flows in sequence.** Two truths:

1. **Onboarding barely changes for the shared part.** Up to Team, nearly everyone runs the same
   flows we already built — What-you-do, Links, Learning, Handle, Assistant, (Email, Phone,
   Availability, Calendar), Team. We keep them. We just make each a **standalone flow** and make a
   few **conditional** (show or not).
2. **The new part comes after:** a **discovery** step (business? team? what do you need?) that
   **identifies which modules** you'd use, then runs **each of those modules' own setup flows**,
   then hands you the assembled **dashboard**.

It stays **sequential** the whole way — not a free-form agent. The only "agentic" moment is
discovery, and even that just decides *which* deterministic flows to append.

**The load-bearing principle:** every part is a **reusable setup flow**. The exact same flow runs
(a) inline during onboarding and (b) standalone when you configure/add that capability later. Build
the part once; use it in both places.

## 1. The core abstraction — a Setup Flow

> **⛔ Historical.** The `SetupFlow` abstraction below was built to drive *installable capabilities*
> and a *dynamic nav*. Those are removed. The two-panel Lu-guided setup it describes survives, but as
> **preset setup for the fixed Sites & Agents surfaces**, not as a catalog primitive.

Every part (Links, Handle, Assistant, Availability, Team, Invoices, Reviews, Payments, Website…)
is a `SetupFlow`:

```ts
interface SetupFlow {
  key: CapabilityKey;              // "handle" | "assistant" | "invoices" | "reviews" | ...
  label: string;                   // "Your space", "Meet Lu", "Invoices"
  tier: "base" | "module";         // base = shared spine; module = discovered/installed later
  applies: (w: WorkspaceDraft) => boolean;   // conditional inclusion (some base parts skip)
  steps: SetupStep[];              // the ordered screens (the two-panel Lu-left / preview-right)
  providers?: Array<"native" | ConnectorKey>; // if the capability can be native/connect/off
  surface?: "page" | "agent" | "dashboard" | "none"; // what it adds to the workspace
  dependsOn?: CapabilityKey[];     // must be set up first
}

interface SetupStep {
  render: (ctx: FlowCtx) => ReactNode;   // reuses the onboarding two-panel + streaming
  applies?: (w: WorkspaceDraft) => boolean;
}
```

- A flow **reads** the workspace-so-far (`WorkspaceDraft`) and **writes** its slice of it.
- A flow is skippable; the sequencer handles back/skip/progress generically (we already have the
  back-history + skip + dev-jump machinery — it generalizes).
- **Two entry points, one component:** `<Flow inline sequencer/>` in onboarding · `<Flow standalone/>`
  from Settings or the Library. Standalone = the same steps, prefilled with current config, with a
  Save instead of Continue.

This is the whole foundation. If §1 is right, the rest is declarations.

## 2. The sequencer

Onboarding is a `<Sequencer>` over an **ordered, dynamic queue** of flows:

```
queue = [
  ...BASE_FLOWS.filter(f => f.applies(w)),     // Phase A (spine)
  DISCOVERY,                                    // Phase B — writes w.chosenModules
  // Phase C is appended by DISCOVERY on completion:
  //   ...moduleFlowsFor(w.chosenModules)
  FINISH,                                       // Phase D → dashboard
]
```

- **Conditional inclusion**: `applies(w)` filters flows against the answers so far.
- **Dynamic tail**: the discovery flow, when done, **enqueues the chosen module flows** before
  FINISH. So the tail is computed, not fixed.
- The sequencer owns: current index, back (pop), skip (advance), "jump to any flow" (the dev bar,
  generalized), and progress.

## 3. The phases (the actual sequence)

### Phase A — the shared spine (sequential, some parts conditional)
Mostly what we have, each now a flow. Show-conditions in brackets:

| Flow | Collects → writes | Show when |
|---|---|---|
| **Welcome** | — | always |
| **What you do** | role/trade/what-you-do | always |
| **Links** | site + socials | [they have any] |
| **Learning** | Lu "studies" you → profile/vocabulary | always (light if no links) |
| **Handle** | `{handle}` — your space name | always (everyone gets a space) |
| **Assistant** | assistant name (default Lu) + persona | always |
| **Email** | `{handle}@lu.computer` inbox | [wants an assistant inbox] |
| **Phone** | assistant line + owner cell | [wants Lu answering a line] |
| **Availability** | standing hours | [takes appointments] |
| **Calendar** | connect Google | [uses a calendar] |
| **Team** | people (the org graph) | [has a team] |

A **personal** user runs Welcome → What-you-do → Learning → Handle → Assistant, maybe Calendar,
and stops. A **business** user runs more. Same spine, filtered.

### Phase B — discovery (the one agentic pivot)
A real-Haiku flow (the `/api/team/chat` pattern, generalized to a workspace-assembly tool set).
Lu asks the few things she can't infer — *business or just you? a team? how do people pay you?
want me contacting customers?* — infers the rest from What-you-do + the scrape, and **proposes a
module set** with **native/connect/off per capability**. Tools: `install_capability`,
`connect_tool`, `add_agent`, `set_vocabulary`, `propose_workspace`. Output → `w.chosenModules`
(ordered) + provider choices. The right panel shows the **proposed workspace** to confirm/subtract.

### Phase C — module setup flows (sequential, from B)
For each chosen module, run **its** `SetupFlow` (`tier: "module"`): Invoices, Quotes/Agreements,
Payments (native or connect-Stripe), Reviews-agent, Website, Content, Analytics, Follow-ups… Each
declares its own steps + provider choices. This is where "each module has an onboarding" lives —
and it's the exact flow you'd re-run to configure that module later (§5).

### Phase D — finish → dashboard
Building screen → the **assembled dashboard**: a workspace whose sidebar/home reflect exactly the
capabilities, agents, and widgets that got installed (§4, §6).

## 4. What the flows write — the assembled Workspace

One record, written by the flows, read by the dashboard, edited by later config. Extends today's
`OrgProfile`:

```ts
interface Workspace {
  // base config (Phase A)
  companyName?: string; ownerName?: string;
  assistantName: string; persona?: string;
  vocabulary?: Record<string, string>;         // job→matter, quote→engagement letter…
  handle?: string; email?: string; line?: string; standingAvailability?: …; gcalConnected?: boolean;
  team?: Member[];

  // capabilities = the installed "modules" (Phase C)
  capabilities: Partial<Record<CapabilityKey, {
    installed: boolean;
    provider: "native" | { connector: ConnectorKey };
    surface: "page" | "agent" | "dashboard" | "none";
    config: unknown;                            // per-capability
  }>>;
  agents: Agent[];                              // each with a leash
  connectors: ConnectorKey[];

  // setup progress (drives "Needs you" + Settings completeness)
  setup: Partial<Record<CapabilityKey, "todo" | "done" | "skipped">>;
}
```

The dashboard renders **from `capabilities`** — dynamic nav + home, not a fixed 10.

## 5. Later configuration = re-running one flow

The reason each part must be a flow:

- **Settings** = a list of installed capabilities → click one → **run its SetupFlow standalone**
  (prefilled, Save-mode). No separate settings UI to maintain — Settings *is* the flows.
- **Library → "add Invoices"** → run the Invoices flow → installs + configures in one pass.
- **"Reconfigure X"** (from anywhere) → same flow, current config prefilled.
- **Skipped-in-onboarding** capabilities live in the Library / "Needs you" and run their flow when
  you get to them (the unlock pattern we built, generalized).

One flow, three doors: onboarding · Settings · Library.

## 6. The living dashboard — modules make it, the Library + Lu grow it

> **⛔ Historical — this whole section is retired.** There is **no Library**, no install/uninstall,
> and the Dashboard is **not** composed from installed modules' widgets. The final Dashboard is a
> **fixed home** with a pinned "Needs you" + a **customizable free-form widget board** drawn from a
> **curated catalog each fixed surface declares** (glance + deep-link, honest-empty, Lu-arrangeable).
> **Analytics is widgets, not a page.** See `PLATFORM-VISION.md` §3 + §8.

Onboarding's discovery step never really ends. It becomes the way the workspace keeps growing, via
three linked ideas: **(a) Home is composed from the installed modules' widgets** (different modules
→ different dashboard), **(b) the Library** is the always-open catalog to add more, and **(c) Lu**
is the conversational door to the same thing.

### 6.1 Home is composed from module widgets
Each capability contributes **dashboard widget(s)** to Home (on top of its nav entry + optional
page/agent surface). **Home = the grid of widgets from your installed capabilities**, ordered by
priority — so the dashboard *literally reflects what you assembled*:
- Billing → an "Awaiting payment" tile · Pipeline → "New leads / Booked" · Reviews-agent → a
  review-funnel card · Schedule → "Today / this week" · a personal user with just Lu → a near-empty
  Home with a **"Grow your workspace"** card.
- Widgets are small + declarative (`{ title, value|soon, hint, href, size }`), the StatCard/card
  idiom we already have. A capability declares `0..n`. Install invoicing → the money tile appears;
  remove it → it's gone. **No fixed Home.**

### 6.2 The Library (the direct door)
One catalog of every block type (capabilities/modules, agents, connectors, workflows), grouped by
primitive (Pipeline · Billing · Growth · Docs · Comms…). Per item: **Installed · Available ·
Recommended-for-you**. Each card shows what it does, its native/connect options, and what it adds
(a page? an agent? which widgets?). Actions: **Add** (→ runs its SetupFlow, §1/§5) or **Set up with
Lu**. Search + "recommended for [your business kind]" (from the registry's discovery hints, §7).
Open it from a sidebar **"＋ Add / Library"** entry and ⌘K.

### 6.3 Lu as librarian (the conversational door)
Say *"I need to send invoices"* / *"how do I collect deposits?"* → Lu has a
`search_library` / `suggest_capability` tool, finds the right capability(ies), explains native vs
connect, and offers to set it up. On yes she **launches that capability's SetupFlow inline** in the
two-panel chat — the *same* flow as the Library "Add." This is the Phase-B discovery step, on
demand, forever. She also **nudges proactively**: *"You've booked 10 jobs — want me to turn on
invoicing?"* → a "Needs you" row → launches the flow. (The setup rows we already shipped are the
seed of this.)

### 6.4 The unification (why §1 is the foundation)
Onboarding-discovery, the Library, Lu-as-librarian, the "Needs you" nudges, and Settings are all the
**same action: choose a capability → run its SetupFlow.** Installing writes `Workspace.capabilities`
→ the dashboard re-renders (nav + widgets grow). **One mechanism, five doors.** We already have the
write→re-render pattern (the Needs-you → module-live unlock).

## 7. The capability registry (what declares it all)

Generalizes today's `MODULES`. Each capability declares:

```ts
interface Capability {
  key: CapabilityKey;
  label: string;
  tier: "base" | "module";
  flow: SetupFlow;
  applies?: (w) => boolean;          // base show-condition
  providers: Array<"native" | ConnectorKey>;
  surface: "page" | "agent" | "dashboard" | "none"; // its own screen, if any
  homeWidgets?: WidgetSpec[];        // what it contributes to the composed Home (§6.1)
  dependsOn?: CapabilityKey[];
  discovery?: { keywords: string[]; defaultFor: BusinessArchetype[] }; // helps Phase B + Library pick it
}

interface WidgetSpec {
  id: string; title: string; size: "sm" | "md" | "lg";
  href?: string; priority: number; // ordering on Home
  // renders from the capability's own read model (or "soon"/empty until it has data)
}
```

The registry is the single source: the sequencer reads it, discovery + the Library pick from it,
Home composes its widgets, and the nav renders from it.

## 8. The spectrum, concretely

| | Personal ("just me") | Business ("I run X") |
|---|---|---|
| Phase A | Welcome, What-you-do, Learning, Handle, Assistant (+ Calendar) | full spine incl. Phone/Availability/Team |
| Phase B | "just me" → few/no modules | full discovery → module set + providers |
| Phase C | maybe Notes/Files, an inbox agent | Pipeline, Billing, Reviews-agent, etc. |
| Dashboard | Lu + a couple things | a full operation |

Same sequencer, same flows, different subset. Growth is continuous: a personal user later says "I'm
starting a business" → Library/discovery adds the module flows. No re-onboarding, no modes.

## 9. What changes from what we have (no attachment)

- **`OnboardingSketch`'s linear `StepKey` script** → a **Sequencer + per-part SetupFlows**. Extract
  each current step (trade, links, learning, handle, assistant, site, email, phone, sms, hours,
  gcal, team) into a `SetupFlow` with an `applies()`. The two-panel + streaming + back + dev-jump
  stay — they move into the sequencer.
- **Fixed nav of 10 modules + "coming soon"** → **dynamic nav from `Workspace.capabilities`**; the
  "soon" concept dies, replaced by **installed vs in-Library**.
- **`OrgProfile`** → the richer **`Workspace`** (§4). Same cookie/store seam, bigger payload.
- **Settings** → **flow-driven** (§5); most of the current settings form is replaced by re-running
  flows.
- **`MODULES` registry** → the **capability registry** (§7).
- **The fixed Home cards** → a **grid composed from installed modules' widgets** (§6.1); a new
  **Library** surface + Lu-as-librarian are how you add more.
- **The "New org = a roofer"** demo profile → **example workspaces** (personal / roofer / lawyer /
  startup) so we can feel different assemblies; the Mature/New toggle becomes an example picker.
- **New to build:** the discovery flow (B), module flows (C), the dynamic dashboard, the Library,
  the connectors surface.

## 10. Build order (foundation-first)

1. **Setup-flow abstraction + Sequencer** — refactor the current onboarding *as-is* into flows
   behind a sequencer (no behavior change; proves the abstraction).
2. **Capability registry** — declare the Phase-A flows + conditions in it.
3. **Conditional spine** — wire `applies()` so parts show/skip; add the "personal vs business"
   signal early so the spine filters.
4. **Discovery flow (B)** — the Haiku assembly conversation → `chosenModules` + providers, with the
   propose-workspace panel.
5. **Two module flows (C)** — a native one (e.g. Invoices) and a connect one (e.g. Payments →
   Stripe) to prove native/connect. Plus Reviews as an **agent** flow (proves agent surface).
6. **Dynamic dashboard** — nav from `Workspace.capabilities`, and **Home composed from each installed
   capability's `homeWidgets`** (§6.1). This is what makes different modules feel like a different app.
7. **The Library** — the catalog surface (§6.2): browse → **Add** runs a SetupFlow → the workspace
   grows (nav + widgets). Generalizes the "Needs you" setup rows.
8. **Lu as librarian** (§6.3) — give Lu `search_library` / `suggest_capability` tools so
   "I need invoices" → she proposes and launches that flow inline. Same install action, chat door.
9. **Settings reuse** — Settings = the list of installed capabilities, each re-running its flow
   standalone (§5).

## 11. Open decisions

- **Base boundary** — is Team the last base flow, or is "has a team" a discovery question that
  gates it? (Lean: keep Team in the spine, gated by an early "do you have a team?" answer.)
- **Infer vs ask** in discovery — how much Lu proposes vs asks (lean: propose-and-subtract).
- **Connect flows depth** — how far we mock the OAuth/connect handshake in UI (lean: a realistic
  fake "Connect Stripe → connected" like the Google Calendar fake).
- **Vocabulary/skinning** — do we do per-business renaming now (job→matter) or after the assembly
  spine works (lean: after).
- **Agent surface** — do agents get a mini-dashboard route each, or a shared "agents" surface with
  per-agent panels (lean: shared surface first).
