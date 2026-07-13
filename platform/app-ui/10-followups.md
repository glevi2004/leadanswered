# 10 — Follow-ups: the chase board

> Module spec per `../APP_UI_PLAN.md` §4. Builds on `00-foundation.md` (shell, widget, gating,
> data seam, cast). Route: `/followups`. This doc owns
> `FollowUpRule` and `ChaseItem` (foundation §6 registry).

## 1. Purpose

Show the owner everything Sarah is keeping warm — the leads, quotes, invoices, and estimates that
went quiet — and the rules she chases them by. It fronts the **Follow-ups** feature
(FEATURES.md Pillar 3: quiet-lead nudge ✅, generalization to quotes/invoices/estimates ⬜) and
makes the sales promise literal: *"She chases the leads and quotes that go quiet, so nothing
slips"* (REBRAND-PLAN §3.4). The page's deeper job is **trust in the agent**: every chase shows
when Sarah will act next and why, and every decision — including the decision to *stay silent* —
is visible with its reason (SCOPE §5.3: one mechanism, context-aware message or silence,
lifecycle-gated, one nudge per interaction, skipped during open escalations, deferred outside
business hours, every decision logged).

**Real today vs. mock:** the quiet-**lead** nudge engine is real — a BullMQ job
(`apps/api/src/queue.ts`, 30-min delay, per-lead jobId) processed by the worker with a
business-hours guard, delegating to `proactiveTurn.ts` which sends a context-aware line or skips
with a logged reason. This entire UI is new, and the generalization to quote/invoice/estimate
chases is new (depends on Quotes 06 / Invoices 08).

## 2. Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Follow-ups                                    [Ask Sarah]           │ PageHeader
├─────────────────────────────────────────────────────────────────────┤
│ [3 being chased] [1 waiting on you] [12 nudges → 5 replies, 30d]   │ StatCards
│                                                                     │
│ [ Board ]  [ Rules ]  [ History ]                                   │ Tabs
│ ─────────────────────────────────────────────────────────────────  │
│ QUIET LEADS (1)                                                     │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ Linda Tran · website lead              ● armed              │    │
│ │ Went quiet after giving her address (41 Pond St)            │    │
│ │ Last touch 2:12pm · attempt 0 of 1 · next nudge 2:42pm      │    │
│ │ Sarah's angle: "No rush, Linda — want me to hold a time     │    │
│ │ Thursday for that estimate?"                                 │    │
│ │ [Nudge now] [Pause] [Resolve]              View thread →    │    │
│ └─────────────────────────────────────────────────────────────┘    │
│ QUIET QUOTES (1)                          [preview chip]           │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ Jorge Alvarez · quote q_1043 — $1,850   ⏸ held             │    │
│ │ Sent 3 days ago, unanswered                                  │    │
│ │ Sarah decided not to text — he's waiting on YOU:            │    │
│ │ open question "Do you install copper gutters?" (esc_301)    │    │
│ │ [Pause] [Resolve]                          View thread →    │    │
│ └─────────────────────────────────────────────────────────────┘    │
│ UNPAID INVOICES (1)                       [preview chip]           │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ Frank Sullivan · invoice inv_2032 — $2,400  ● armed        │    │
│ │ Due 14 days ago · attempt 1 of 2                             │    │
│ │ Next nudge tomorrow 9:15am — she waits for business hours   │    │
│ │ [Nudge now] [Pause] [Resolve]              View thread →    │    │
│ └─────────────────────────────────────────────────────────────┘    │
│ NO-SHOW ESTIMATES (0) — nothing here. Sarah's watching.            │
└─────────────────────────────────────────────────────────────────────┘
                                                          ┌───┐
                                                          │ ✦ │ Sarah widget
                                                          └───┘
```

- **Board tab (default):** chase cards grouped by kind — quiet leads · quiet quotes · unpaid
  invoices · no-show estimates. Each card: contact, what's stalled, last touch, attempt count
  (`n of max`), **next nudge time** (with the business-hours deferral spelled out when it applies:
  *"tomorrow 9:15am — she waits for business hours"*), and **Sarah's planned angle in her voice**
  where the engine has one drafted. Held/skipped cards replace the next-nudge line with the
  reason, in plain words.
- **Rules tab:** one `FollowUpRule` card per kind (see §5/§6). Non-negotiables surface as fixed
  facts, not toggles: *"One nudge per interaction."* · *"Only during your business hours."* ·
  *"If they're waiting on you (open question), she stays quiet."*
- **History tab:** a `DataTable` of recent decisions — nudges sent (with outcome: replied /
  still quiet / booked / paid) **and skipped-with-reason rows**. Silence entries read like:
  *"Skipped Jorge Alvarez — open question, they're waiting on you."*
- **Mobile:** StatCards collapse to a horizontal scroll row; tabs stay; group headers become
  sticky; card actions collapse into a `dropdown-menu` (⋯) with "View thread" kept inline.
  Widget launcher stays bottom-right above sticky actions (foundation §2).

## 3. Sarah

- **What she did:** `SarahAction` rows from this module feed Home/`/sarah` — *"Nudged Linda Tran
  — she replied 8 minutes later"*, *"Held the Alvarez quote chase — he's waiting on your copper
  gutters answer."* Each links back to the chase card (`href: /followups`).
- **What she's asking approval for:** nothing, today. **Lead nudges are autonomous** — the
  engine sends without a hard gate (they're operational follow-ups, not new outreach). Whether
  quote/invoice chases should arrive as `Approval` cards (`kind: 'customer_message'`) instead is
  an open question (§8.1); the spec renders them autonomous in preview.
- **What you can tell her (widget suggestion chips, `MODULES.followups.sarahChips`):**
  *"Who's gone quiet?"* · *"Nudge Linda now"* · *"Why haven't you texted Jorge?"* ·
  *"Pause the Sullivan invoice chase."*
- **Voice rule:** the page never says "the system skipped." Skips are Sarah explaining herself:
  *"Sarah decided not to text — they're waiting on you."* Transparency about silence is the
  feature.

## 4. Data contract

Owned here (foundation §6 registry): `FollowUpRule`, `ChaseItem`. `ChaseLogEntry` is
module-local support (lives in `data/followups/types.ts`, not the shared registry).

```ts
type ChaseKind = 'lead' | 'quote' | 'invoice' | 'estimate'

interface ChaseItem {
  id: string
  kind: ChaseKind
  contactId: string                    // → Contact (foundation §6)
  contactName: string                  // denormalized for the card
  targetId?: string                    // quoteId | invoiceId | appointmentId; absent for 'lead'
  stalledSummary: string               // "Quote q_1043 — $1,850, unanswered 3 days"
  status: 'armed' | 'held' | 'paused' | 'resolved' | 'exhausted'
  holdReason?: string                  // required when 'held': "Open question — waiting on you (esc_301)"
  lastTouchAt: string                  // ISO, rendered in org tz
  nextNudgeAt?: string                 // ISO; absent unless 'armed'
  deferredForHours: boolean            // true → render "— she waits for business hours"
  attempts: number
  maxAttempts: number                  // mirrors the rule at arm time
  plannedAngle?: string                // Sarah's drafted angle, her voice, when the engine has one
}
// maps from: 'lead' kind ≈ the live BullMQ delayed job (`nudge-<leadId>`) + Conversation.gathered
// .nudgedAt + open-Escalation check — a DERIVED read model, no ChaseItem table exists today.
// 'quote' | 'invoice' | 'estimate': none (new; depends on 06/08 entities).

interface FollowUpRule {
  kind: ChaseKind
  enabled: boolean
  delaysMinutes: number[]              // one entry per attempt, from the stall moment
                                       // defaults — lead: [30] · quote: [4320, 10080] (3d, 7d)
                                       // invoice: [0, 10080] (on due, +7d) · estimate: [60]
  maxAttempts: number                  // === delaysMinutes.length (displayed, not edited apart)
  businessHoursOnly: true              // literal type — the guard is a fact, never a setting
  onePerInteraction: true              // literal type — SCOPE §5.3, surfaced as copy
  requiresApproval: boolean            // lead: false (autonomous today); others: see §8.1
  toneNote?: string                    // "friendly, zero pressure" — fed to the proactive prompt
}
// maps from: none (new). The lead delay is code-constant today (NUDGE_DELAY_MS = 30 min in
// apps/api/src/queue.ts); real.ts needs a per-org rules store (new JSON column or table).

interface ChaseLogEntry {              // the History tab; transparency feed
  id: string
  at: string                           // ISO
  chaseId: string
  contactId: string
  kind: ChaseKind
  decision: 'sent' | 'skipped' | 'deferred'
  reason?: string                      // required for skipped/deferred: 'open_escalation' |
                                       // 'already_nudged' | 'lead_replied' | 'terminal' |
                                       // 'outside_business_hours' (rendered in Sarah's words)
  body?: string                        // the message text, when sent
  outcome?: 'replied' | 'still_quiet' | 'booked' | 'accepted' | 'paid'
}
// maps from: the structured `[proactive]` log lines (sent + every skip, with reason) — real
// today as logs only, NOT queryable; real.ts needs these persisted (new table).
```

**Fixtures (`fixtures/apex.ts`):** Linda Tran (`ct_tran`) — lead chase `armed`, attempt 0 of 1,
next nudge 30 min out, planned angle above. Jorge Alvarez (`ct_alvarez`) — quote chase on
`q_1043` ($1,850 = `185000` cents), `held`, holdReason tied to `esc_301`. Frank Sullivan
(`ct_sullivan`, 00 §5 — shared with 08-invoices) with invoice `inv_2032`
($2,400 = `240000` cents, gutter replacement), due 14 days ago, invoice chase `armed`, attempt
1 of 2, `deferredForHours: true`, next nudge tomorrow 9:15am. History includes one `sent` +
`replied` entry (a past Tran-style nudge) and one `skipped` + `open_escalation` entry (Alvarez).

## 5. Actions

| Action | Surface | Mock (`mock.ts`) | Real (`real.ts`) | Sarah's engine? |
|---|---|---|---|---|
| **Nudge now** | card button / widget | toast "Sarah's on it" + fake `SarahAction` | api call (HMAC-`cid`) → run the proactive turn immediately for this chase. The engine still gates: it may reply *"Sarah looked and decided not to text — {reason}"* as a toast. Honest > obedient. | yes |
| **Pause chase** | card button | flips card to `paused` | server action: set paused; for leads, remove the delayed BullMQ job (`nudge-<leadId>`) | no |
| **Resume chase** | paused card | flips back to `armed` | server action: re-enqueue with remaining delay | no |
| **Resolve (stop)** | card button | card leaves the board, toast | server action: mark resolved, remove queued job; logs a `ChaseLogEntry` | no |
| **Edit rule** | Rules tab dialog | updates local state, toast | server action: persist `FollowUpRule` per org (new store, §4) | no (config only) |
| **View thread** | card link | — | navigation → `/crm/[contactId]` (unified timeline) | — |

Follow-up **sends are autonomous for leads today** — no approval step; the audit trail is the
History tab plus `SarahAction`s. Nothing in this module creates `Approval`s yet (see §8.1).

## 6. Components

- Foundation kit: `PageHeader` (title + Ask Sarah), `StatCard` ×3, `Tabs` (Board/Rules/History),
  `StatusBadge` (chase status enum — extend the shared mapping), `DataTable` (History tab:
  search + filter by kind/decision), `EmptyState`, `dialog` (rule editing), `dropdown-menu`
  (mobile card actions), `popover` (full skip-reason detail on truncated cards), `sonner` toasts,
  `skeleton` via `loading.tsx`.
- **ChaseCard** — module-local composition (contact line, stalled summary, meta row, planned
  angle in a quote style, action row). Built from existing primitives; nothing new needed in the
  shared kit.
- **RuleCard** — module-local: cadence summary sentence ("3 days after sending, then again at 7"),
  attempts, tone note input, enabled switch, and the fixed-facts footer (business hours ·
  one-per-interaction · silence-with-reason). No missing kit pieces.

## 7. States

- **Gating:** module status **`live`** — the lead-nudge engine runs in prod and the board's
  quiet-leads group reads real data via `real.ts`. The **quote / invoice / estimate groups are
  per-group preview**: they render mock fixtures with a small `preview` chip ("ships with
  Quotes/Invoices — ask Sarah about it") keyed off the `quotes`/`invoices` module statuses in the
  registry. No whole-page banner ever (00 §4 — previews render unlabeled).
- **Running-with-no-data:** the good news state, in the product voice — *"Nothing's gone quiet.
  Sarah is watching every open lead, quote, and invoice — anything that stalls shows up here."*
  Never "create your first follow-up." Empty groups collapse to their one-line header + that
  sentence.
- **Error:** `(app)` group `error.tsx`; action failures toast via sonner with retry. If the api
  is unreachable for "Nudge now," the toast says the chase stays armed — the queued job is the
  source of truth, the button is just "sooner."

## 8. Open questions

1. **Approval for quote/invoice chases:** lead nudges are autonomous today. Do generalized
   chases (bigger dollar amounts, payment asks) go through the `Approval` hard-gate as
   `customer_message` cards, or stay autonomous with the same transparency? Changes §3/§5 and
   the engine contract.
2. **Rule editability:** can owners edit `delaysMinutes` (full cadence control) or only
   enabled + tone note, with cadence as our defaults? The lead delay is a code constant today;
   full editability means a per-org rules store plus engine reads from it.
3. **"Nudge now" vs. business hours:** an explicit owner click at 9pm — send anyway (owner
   intent overrides the guard) or defer like the engine does? Spec assumes the engine decides
   and explains; confirm.
4. **Where the generalized engine lives:** new `proactiveTurn` situations
   (`quote_followup`, `invoice_followup`) on the existing mechanism (SCOPE §5.3 says ONE
   mechanism) — plus persisting `ChaseLogEntry` (today decisions exist only as `[proactive]`
   log lines). Confirm the one-mechanism route before `real.ts` is planned.
5. **No-show estimate chases:** depend on show-confirmation/no-show tracking (SCOPE Phase 5,
   unbuilt). Keep the empty group on the board as a promise, or hide the group until it ships?


## 9. Built note (2026-07-13)

Kept after an explicit should-this-exist debate (Levi): the board earns its place as the
watch-the-agent-think surface — autonomy AND restraint on one screen. Built complete on the
mock seam (`FollowupsClient` + `lib/data/followups/types.ts` + the `APEX_CHASES` /
`APEX_FOLLOWUP_RULES` / `APEX_CHASE_LOG` fixtures):

- **Board** — all four groups populated with cross-page-coherent cast: Linda Tran (lead, armed,
  attempt 1 of 2 — matches act_4 + her timeline nudge), Jorge Alvarez (quote, HELD on esc_301),
  Frank Sullivan (INV-2032, armed, business-hours deferral), Maria Santos (Saturday no-show from
  the schedule fixture, rebook angle). Cards show attempt counts, next-nudge times, hold reasons
  in Sarah's words, and her planned angle.
- **The payoff beat:** the held card's [Answer — she picks it back up] prefills the widget/dock
  with the escalation answer; SENDING it re-arms the chase live (held → armed, new angle, next
  nudge tomorrow 9:15) — stats update in place. §8 Q3 resolved as spec'd: "Nudge now" on a held
  chase gets "Sarah looked and decided not to text — {reason}" (honest > obedient).
- **Nudge now** increments attempts, logs a History entry, and exhausts honestly ("out of
  planned attempts — she stops here") with a [Try once more] override. Pause/Resume/Resolve
  all live (local state).
- **Rules** — per-kind cards: enabled switch, cadence-in-words, editable tone note, and the
  non-negotiables as fixed facts. Cadence itself not editable (§8 Q2 default stands).
- **History** — DataTable of sent/skipped/deferred decisions with reasons in Sarah's words and
  outcome chips (booked/replied/still quiet).
- Chase vocabulary joined the central `statusChip` registry: armed=blue, held/skipped/still
  quiet=amber, deferred/out-of-attempts=gray, resolved=emerald.
- Gating: module stays `coming_soon` for real accounts (GatedState); demo renders the full
  board. The §7 "live with per-group preview chips" model is DEFERRED until the lead group's
  `real.ts` read model exists.
