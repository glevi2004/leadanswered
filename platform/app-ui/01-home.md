# 01 — Home (`/home`)

> Module status: **core — always live, never gated.** Builds on `00-foundation.md` (shell, Sarah
> widget, data seam, shared types, Apex Roofing cast). Companion rows: `FEATURES.md` Pillar 0 →
> "The app / owner dashboard" (this is that keystone surface).

## 1. Purpose

Home is the OS home — the first screen after sign-in, and the screen the owner glances at from the
truck. It answers three questions in strict order: **what needs me** (approvals, open escalations,
anything stalled — each actionable right there), **what did Sarah do** (her action feed, deep-linked
into the module records), and **is everything running** (today's route, the headline numbers, a
quiet green status row). It makes the sub-positioning literal: *"Run your business by texting one
assistant"* — the owner's whole business on one screen, already handled, with only the hard-gate
yes/no decisions left for them. It reshapes the current Overview (`apps/web/src/app/dashboard/page.tsx`):
the KPI cards, upcoming appointments, and "Your line" card are absorbed into StatCards, the
schedule strip, and the status row; the recent-leads table is dropped — CRM owns lead lists now.

**Real today vs. mock:** real — lead counts, booked/upcoming appointments, and line
number/verification via `lib/dashboard.ts`-style reads (`getDashboardSummary` re-cut into
`HomeSummary`), plus open `Escalation` rows; mock — the `Approval` queue, the `SarahAction` feed,
quote/review stat tiles, the drive-time route note, and site status (all served from
`fixtures/apex.ts` until their modules ship).

## 2. Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ {PageHeader: "Home" · "Morning, Marcus — here's where things stand." │
│                                              [Ask Sarah]}            │
├──────────────────────────────────────────────────────────────────────┤
│ NEEDS YOUR ATTENTION (3)                                             │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ ⚠ Jorge Alvarez asked: "Do you install copper gutters?"          │ │
│ │   Sarah's waiting on you to relay the answer.   [Answer…] [Open] │ │
│ ├──────────────────────────────────────────────────────────────────┤ │
│ │ ✦ Review ask → Mike O'Brien — "Hi Mike, it's Marcus…"            │ │
│ │                                    [Send it] [Edit] [Not now]    │ │
│ ├──────────────────────────────────────────────────────────────────┤ │
│ │ ◷ Quote q_1043 ($1,850) to Jorge Alvarez — no reply in 3 days.   │ │
│ │   Follow-ups is on it; next nudge tomorrow 9am.  [View quote]    │ │
│ └──────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌───────────────┐ ┌────────────┐       │
│ │ 4          │ │ 3          │ │ 1 · $1,850    │ │ 21 · 4.9★  │       │
│ │ New leads  │ │ Booked     │ │ Quotes await- │ │ Reviews    │       │
│ │ this week  │ │ this week  │ │ ing reply     │ │ collected  │       │
│ │ → /crm     │ │ → /schedule│ │ → /quotes     │ │ → /reviews │       │
│ └────────────┘ └────────────┘ └───────────────┘ └────────────┘       │
├──────────────────────────────────────┬───────────────────────────────┤
│ WHAT SARAH DID   [Today | This week] │ THURSDAY          → /schedule │
│ 09:12 Booked Sam & Priya Patel —     │  9:00  Newton — Patel estimate│
│       Thu 9:00 Newton     → /crm/…   │ 11:30  Brookline              │
│ 08:40 Nudged Linda Tran — quiet      │  2:00  Waltham                │
│       since Tuesday       → /crm/…   │ Routed shortest-drive —       │
│ 08:05 Invoice inv_2031 paid — Dana   │ 40-min gap at 1:00.           │
│       Miller, $14,200  → /invoices/… ├───────────────────────────────┤
│ Yesterday                            │ EVERYTHING'S RUNNING          │
│ 16:22 Quote q_1042 accepted — Dana   │ ● Sarah — answering on        │
│       Miller, $14,200   → /quotes/…  │   (844) 415-7642              │
│ …                                    │ ● Line — verified             │
│ See everything → /sarah              │ ● Website — live              │
└──────────────────────────────────────┴───────────────────────────────┘
                                                            ┌────┐
                                                            │ ✦ 3│  ← widget (00 §3)
                                                            └────┘
```

**Regions.**

- **PageHeader** (00 §8) — title "Home", a one-line time-of-day greeting as the description, the
  standard "Ask Sarah" button. No preview badge, ever (core module).
- **Needs your attention** — full-width stack, at most ~5 items, oldest-first within severity:
  pending `Approval`s (inline approve/edit/decline — the same hard-gate cards as the widget), open
  escalations (`esc_301` with an inline answer box — the owner's reply is relayed by Sarah in her
  own words, exactly like texting her back), and stalled items (quiet quote `q_1043`, quiet lead
  Linda Tran) that deep-link to their record. When empty, the region collapses to one quiet line:
  *"Nothing needs you right now — Sarah's got it."*
- **StatCards** — four `StatCard`s (00 §8) that read as **the pipeline, left to right** (Levi
  review, 2026-07-11): **New leads this week** (hint: median response time — the origin promise)
  → `/crm`, **Booked this week** → `/schedule`, **Quotes out** (count + $ waiting on a yes) →
  `/quotes`, **Awaiting payment** ($ outstanding, overdue highlighted in red; "Owed to you"
  rejected as too harsh — Levi 2026-07-12) → `/invoices`. Reviews
  are NOT a tile — reputation moves to a compact card in the right column (with the schedule
  glance + status row): count + average in demo, promise copy until 09 ships.
- **What Sarah did** — the `SarahAction` feed, Today / This week tabs, grouped by day, each row
  time + summary + deep link (`href`). Footer: "See everything →" to `/sarah` (the full activity
  log lives there; Home shows the most recent ~10).
- **Schedule strip** — the next day that has items ("Today", "Tomorrow", or the weekday name):
  time · town · contact per row, plus the route note when a `RoutePlan` exists (*"Routed
  shortest-drive — 40-min gap at 1:00"*). Header links to `/schedule`; rows link to the contact.
- **Everything's running** — three quiet status lines: Sarah (active on the line's number), line
  (carrier verification — absorbs the old "Your line" card), website (live/building; hidden until
  the Website module exists for this account). Green dots when fine; any non-fine state turns the
  row amber and links to where it's fixed. No numbers, no noise.

**Mobile.** Single column, reordered for the glance-from-the-truck: attention → schedule strip →
StatCards (2×2 grid) → Sarah feed → status row. Attention cards keep their inline buttons
full-width; the widget launcher stays bottom-right above everything (00 §2).

## 3. Sarah

Home is Sarah's report to the owner — the whole page is "what she did, what she needs, what's next."

- **What she did:** the `SarahAction` feed is the page's centerpiece — booked the Patels, nudged
  Linda Tran, `inv_2031` paid, `q_1042` accepted. Every row deep-links into the module record so
  Home is the hub, never a dead end.
- **What needs approval:** pending `Approval`s render as cards in Needs-your-attention — same
  card, same three buttons (approve / edit / decline) as the widget and `/sarah`. **All five
  `Approval.kind`s can surface here** (`customer_message`, `quote`, `review_ask`, `post`,
  `social_post`) — Home aggregates every module's hard-gate. Approve/decline act inline; **Edit
  hands off to `/sarah`** with the approval focused (drafting UI lives there, 02-sarah).
- **Escalations:** open ones (`esc_301` — "Do you install copper gutters?") appear with an inline
  answer box; submitting sends the owner's answer through the existing relay flow and Sarah texts
  Jorge back in her own words.
- **What you can ask:** anything — the widget on this page carries context
  `{ route: '/home', module: 'core' }`. Suggestion chips for `/home`:
  - "What needs me today?"
  - "What's the schedule look like Thursday?"
  - "Anything gone quiet I should know about?"
  - "How'd we do this week?"

## 4. Data contract

This doc owns **`HomeSummary` only** — a read model composed from the shared types in 00 §6
(`SarahAction`, `Approval` referenced, never redefined). Provider per 00 §5:
`data/home/{types,provider,mock,real}.ts`, `interface HomeProvider { getSummary(): Promise<HomeSummary> }`.

```ts
import type { SarahAction, Approval } from '../shared'   // 00-foundation §6

interface HomeSummary {
  greetingName: string          // maps from: Organization.name (owner display name)
  attention: AttentionItem[]    // derived — merge of the three sources below, capped at 5
  stats: HomeStats
  sarahFeed: SarahAction[]      // maps from: none (new — 00 §6; api emits on tool success)
  schedule: ScheduleGlance
  status: RunningStatus
}

type AttentionItem = { id: string; at: string /* ISO */; href: string } & (
  | { kind: 'approval'; approval: Approval }
      // maps from: none (new — Approval, 00 §6); href → /sarah?approval={id}
  | { kind: 'escalation'; escalationId: string; contactId: string
      contactName: string; question: string }
      // maps from: Escalation.id / .question / .status='open'; name via Lead.contactName
  | { kind: 'stalled'; contactId: string; contactName: string
      summary: string            // "Quote q_1043 ($1,850) — no reply in 3 days"
      nextStep?: string }        // "Follow-ups is on it; next nudge tomorrow 9am"
      // maps from: derived today (quiet-lead nudge state + quote age); owned by
      // ChaseItem (10-followups) once that ships — Home reads, never computes, after that
)

interface HomeStats {
  newLeadsThisWeek: number      // derived — count Lead.createdAt >= start of week (org tz)
  medianResponseSecs?: number   // derived — first outbound minus lead createdAt (the <60s promise)
  bookedThisWeek: number        // derived — count Appointment.status='confirmed', startAt this week
  quotesAwaiting: number | null // maps from: none (new — Quote, 06-quotes); null → soon tile
  quotesAwaitingCents?: number  // maps from: none (new — 06); integer cents per 00 §9
  owedCents: number | null      // maps from: none (new — Invoice, 08); null → soon tile
  overdueCents?: number         // maps from: none (new — 08); rendered destructive
  reviewsCollected: number | null // maps from: none (new — ReviewRequest, 09); right-column card
  reviewsAvg?: number           // maps from: none (new — 09); e.g. 4.9
}

interface ScheduleGlance {
  dayLabel: string              // derived — "Today" | "Tomorrow" | weekday of next day with items
  items: Array<{
    appointmentId: string       // maps from: Appointment.id
    startAt: string             // maps from: Appointment.startAt (render in org tz)
    contactId?: string          // maps from: Appointment.leadId (→ Contact id)
    name: string                // maps from: Lead.contactName
    town?: string               // maps from: Lead.serviceTown
    status: string              // maps from: Appointment.status
  }>
  routeNote?: string            // maps from: none (new — RoutePlan, 07-schedule)
}

interface RunningStatus {
  sarahActive: boolean          // derived — Organization.numberStatus === 'active'
  lineNumber?: string           // maps from: Organization.twilioNumber
  lineStatus: 'verified' | 'verifying' | 'needs_attention'
                                // maps from: Organization.verificationStatus (pending→'verifying')
  siteStatus?: 'live' | 'building'
                                // maps from: none (new — Site, 03-website); omitted → row hidden
}
```

Mock fixture values (from `fixtures/apex.ts`, 00 §5): attention = [`esc_301` Jorge Alvarez copper
gutters, `Approval` "Review ask → Mike O'Brien", stalled `q_1043` $1,850 / Linda Tran quiet];
stats = 4 new / 3 booked / 1 awaiting ($1,850) / 21 reviews · 4.9★ (the `imp_qb1` campaign);
schedule = Thursday 9:00 Newton (Patel) · 11:30 Brookline · 2:00 Waltham, routeNote "Routed
shortest-drive — 40-min gap at 1:00"; feed includes "Booked Sam & Priya Patel — Thu 9:00",
"Nudged Linda Tran", "Invoice inv_2031 paid — Dana Miller, $14,200", "Quote q_1042 accepted —
Dana Miller, $14,200".

## 5. Actions

| Action | Mechanism | Sarah's engine? |
|---|---|---|
| Approve `Approval` ("Send it") | **api call** (HMAC-`cid` to Express api) — the hard-gate: code sends only on explicit yes | Yes — Sarah sends the draft (SMS/publish per kind), emits a `SarahAction` |
| Decline `Approval` ("Not now") | **api call** — marks declined; Sarah may acknowledge in-thread | Yes — state lives with the agent's queue |
| Edit `Approval` | **navigation** to `/sarah?approval={id}` — no mutation from Home | — (02-sarah owns editing) |
| Answer escalation (inline box) | **api call** — posts the owner's answer to the existing escalation-relay flow | Yes — Sarah relays to the customer in her own words, resolves `esc_301` |
| Dismiss a stalled item | **server action** — hides the card for this owner (bookkeeping only, nothing sent) | No |
| Everything else | navigation only (StatCards, feed rows, schedule strip, status row) | — |

Mock mode per 00 §5: approve/decline/answer return success + a sonner toast and enqueue a fake
`SarahAction` ("Sent the review ask to Mike O'Brien") so the demo feels alive; nothing persists.
All results toast success and failure (00 §8).

## 6. Components

**From 00 §8 (shared):** `PageHeader`, `StatCard` (×4), `StatusBadge` (attention severity +
schedule item status), `EmptyState` (per-region quiet states, §7), `Timeline` is **not** used here
(the feed is action rows, not a contact timeline), route-level `loading.tsx` skeletons, sonner
toasts, `(app)` `error.tsx`.

**ui-kit:** `card`, `badge`, `button`, `tabs` (Today / This week), `avatar` (contact initials on
feed rows), `separator`, `skeleton`, `sonner`, `textarea` (inline escalation answer).

**Missing from the kit — flag for 00 §8:**

1. **`ApprovalCard`** — the approve/edit/decline card is rendered in three places (widget, Home,
   `/sarah`) and must be one shared component in `components/app/`. 00 §3 describes it inside the
   widget but §8 doesn't list it as shared. Home consumes it; 02-sarah should own its spec.
2. **`SarahActionRow`** (or `SarahFeed`) — the `SarahAction` list item (time · summary · deep
   link) is shared between Home and the `/sarah` activity log; belongs in `components/app/`.

No DataTable on this page — Home never shows tables (that framing died with the Overview).

## 7. States

- **Gating:** none for the page — Home is core, always live, no preview banner. But StatCards and
  regions summarize *other* modules: a tile whose module is `preview` shows the Apex fixture number
  with a small `preview` dot-badge (tapping through lands on that module's own preview banner); a
  tile whose module is `coming_soon` renders muted with a `soon` chip and links to the teaser.
  The site-status line hides entirely until Website exists for the account. Home itself never
  looks broken because a sibling module isn't built.
- **Running, no data yet** (real account, day one): every region speaks in the "we're setting this
  up for you" voice (00 §4) —
  - Attention: *"Nothing needs you right now — Sarah's got it."*
  - Feed: *"Sarah's live on your line. The moment she books, answers, or chases something, it
    shows up here."*
  - Schedule: *"Nothing on the books yet — when Sarah books an estimate, it lands here, routed
    for drive time."*
  - Stats render 0 with no delta — never hidden, never "create your first lead," never any
    build-it-yourself prompt.
- **Partial failure:** each region loads from one `HomeSummary` read; if a mock-vs-real seam
  source fails (e.g. api unreachable for approvals), that region degrades to *"Couldn't load this
  just now — pull to refresh or ask Sarah."* while the rest of the page renders. Full-page failure
  falls to the `(app)` `error.tsx`.
- **Loading:** `loading.tsx` skeletons mirroring the four regions (00 §8).

## 8. Open questions

1. **Stat tiles for `coming_soon` modules** — muted `soon` tile (as spec'd) or drop the tile and
   let the grid reflow to 3/2 cards? Changes `HomeStats` optionality and the grid component.
2. **"Stalled" source of truth** — v1 derives it on Home (quiet-lead nudge state + quote age);
   once 10-followups ships, does Home read `ChaseItem` exclusively (spec'd here) — i.e., do we
   build the derived version at all, or gate stalled items on Follow-ups being live?
3. **Widget chips for core routes** — *resolved in 00 §5:* the registry is keyed
   `ModuleKey | 'home' | 'sarah' | 'settings'`, so Home has its own chips + page-context entry.
4. **Schedule-strip window** — strictly today, or "next day with items" (spec'd: Wednesday night
   already shows Thursday's route)? Changes the `ScheduleGlance` query and the empty-state
   frequency.
5. **Inline escalation answers on Home** — keep the inline answer box (spec'd), or deep-link to
   the CRM contact thread to answer in context? Determines whether Home needs the relay api call
   at all.
