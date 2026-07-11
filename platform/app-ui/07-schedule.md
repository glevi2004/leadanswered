# 07 — Schedule: one calendar, estimates + jobs, drive-time-routed

> Module: `schedule` · route `/schedule` · status **live** (route rail + arrival
> windows **preview**) · absorbs `/dashboard/appointments` (redirects per `00-foundation.md` §7).
> Owns types `ScheduleItem`, `RoutePlan` (00 §6). Companions: `../TRAVEL_ROUTING.md` (the wedge),
> `../GOOGLE_CALENDAR.md` (sync design), `../SCOPE.md` (CalendarProvider port, standing windows,
> the drag-to-paint availability grid), `../FEATURES.md` Pillar 2.

## 1. Purpose

ONE calendar for the whole business: every estimate Sarah books and every job on the books, on a
single week grid, in the organization's timezone, routed by drive time. This is the module that fronts
**Scheduling + Travel routing + Google Calendar** (FEATURES.md Pillar 2: ✅ booking core, 🟡 the other
two) and makes the sales promise literal: *"estimates and jobs on one calendar, drive-time-routed"* —
the thing Jobber/ServiceTitan/Workiz paywall to premium tiers, ours by default (TRAVEL_ROUTING §0/§7).
The day view answers the question the owner actually has — *"what's my day, and does the driving
work?"* — with ordered stops, drive time between them, and the gaps ("40-min gap at 1:00"). Standing
availability (when Sarah is allowed to book) lives here too: the drag-to-paint week grid moves out of
Settings into an Availability tab, because "when can I be booked" is a scheduling decision, not a
setting. Reschedule and cancel are one tap, and Sarah tells the customer — after the owner's yes.

**Real today vs. mock:** booking, availability math, reschedule and cancel are REAL — appointments come
from the `Appointment` table, cancel/reschedule call the existing Express api `POST /appointments/change`
(HMAC `cid`; the current appointments page already wires cancel), and the availability editor writes the
same `standingAvailability` windows the onboarding wizard does. The calendar VIEW itself, `kind: 'job'`
items, the route rail (TRAVEL_ROUTING is researched, not built), arrival windows, and the Google sync
chip UI are NEW — route + windows render from mock `RoutePlan` fixtures behind a preview badge.

## 2. Layout

Tabs under the header: **Calendar** (default) · **Availability**. Calendar tab has a view toggle:
**Week** (default) · Day · Month · List. All times rendered in the organization's zone (America/New_York
for Apex).

**Week view (default):**

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Schedule                                    [Ask Sarah]  [+ Block time ▾]  │
│ [Calendar] [Availability]                                                  │
│ ⟨ Jul 6 – 12 ⟩  Today   [Week] Day  Month  List      ⟳ Google: synced ✓   │
├────────┬─────────┬─────────┬─────────┬───────────┬─────────┬──────┬───────┤
│        │ Mon 6   │ Tue 7   │ Wed 8   │ THU 9     │ Fri 10  │ Sat  │ Sun   │
│ (jobs) │◤ Job — Dana Miller · roof   │           │         │      │       │
│        │  replacement (day 1–3)     ◢│           │         │      │       │
│  8 am  │         │         │         │           │         │ ░░░░ │ ░░░░  │
│  9 am  │         │         │         │┏━━━━━━━━┓ │         │ ░off │ ░off  │
│ 10 am  │         │         │         │┃✦ Est —  ┃│         │ ░░░░ │ ░░░░  │
│        │         │         │         │┃ Patel   ┃│         │      │       │
│ 11 am  │         │         │         │┏━━━━━━━━┓ │         │      │       │
│ 12 pm  │         │         │         │┃✦ Est —  ┃│         │      │       │
│  1 pm  │         │         │         │▒ 40-min ▒ │         │      │       │
│  2 pm  │         │         │         │┏━━━━━━━━┓ │         │      │       │
│  3 pm  │         │         │         │┃✦ Est —  ┃│         │      │       │
└────────┴─────────┴─────────┴─────────┴───────────┴─────────┴──────┴───────┘
```

- Multi-day **jobs** render as an all-day banner row above the time grid; timed items (60-min
  estimates, single-visit jobs) render as blocks. `✦` marks items Sarah booked.
- Hours outside standing availability are dimmed (`░`); the highlighted routable gap (`▒`) appears
  only on days with 2+ located stops (preview).
- Clicking any item opens the **item sheet** (below). Clicking a day header opens Day view.

**Day view (the route):** timeline left, route rail right — the rail is the module's signature.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ⟨ Thursday, Jul 9 ⟩            3 stops · 80 min driving · 30.7 mi    │
├──────────────────────────────┬───────────────────────────────────────┤
│  8a ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │  ROUTE                     [preview]  │
│  9a ┃ ✦ Estimate — Sam &     │  ⌂ Base — Watertown                   │
│     ┃   Priya Patel          │  │ drive 15 min · 6.2 mi              │
│ 10a ┗ Newton · 9:00–10:00    │  ① 9:00  Patel — Newton               │
│     ▤ drive 25 min           │  │ drive 25 min · 8.1 mi              │
│ 11a                          │  ② 11:30 Brennan — Brookline          │
│     ┃ ✦ Estimate — Tom       │  │ drive 25 min · 9.4 mi              │
│ 12p ┗ Brennan · 11:30–12:30  │  ▒ 40-min gap at 1:00                 │
│  1p ▒ 40-min gap ▒           │  ③ 2:00  Rivera — Waltham             │
│  2p ┃ ✦ Estimate — Ana       │  │ drive 15 min · 7.0 mi              │
│  3p ┗ Rivera · Waltham       │  ⌂ back at base ~3:20                 │
│     ▤ drive home 15 min      │  Buffer: 10 min/stop · [map stub]     │
└──────────────────────────────┴───────────────────────────────────────┘
```

- The rail shows ordered stops, per-leg drive minutes/miles, base-to-first and last-to-base legs
  (we count them; Jobber doesn't — TRAVEL_ROUTING §7), the travel buffer, and gaps. Travel buffers
  also render on the timeline as hatched `▤` segments under each block.
- Gaps are labeled with what fits: "40-min gap at 1:00 — too short for an estimate; Sarah keeps it."
- `[map stub]` = a placeholder card for the day-route map (Google Embed `directions` mode is free —
  TRAVEL_ROUTING §5); v1 renders the stub, not a live map (open question 4).

**Month** = compact dots per day + count, click-through to Day. **List** = the current appointments
page, upgraded: a `DataTable` of upcoming/past with kind, contact, time, town, status, actions.

**Availability tab:** the drag-to-paint week grid from onboarding (SCOPE §3 Phase 3), verbatim
behavior — days as columns, 06:00–21:00 in 30-min rows, click-drag paints available blocks,
contiguous cells merge to `{dayOfWeek, start, end}` windows; supports half-hours and split shifts.
Header line: "When Sarah can book you. 60-min visits are offered inside these windows." Save button +
sonner toast. This editor MOVES here from Settings; `13-settings.md` keeps only a cross-link
("Availability lives in Schedule →").

**Mobile:** Day view is the default (agenda list with the route legs inline between cards); Week
becomes horizontally swipeable day columns; Month/List unchanged; the availability grid paints one
day at a time with a day switcher. Item sheet is a full-height sheet. `+ Block time` moves into the
header overflow menu; the Sarah launcher stays bottom-right above it.

## 3. Sarah

Sarah is the booking engine — this calendar is mostly *her output*. The screen shows her work and
lets the owner redirect it:

- **What she did:** items she booked carry the `✦` mark and "Booked by Sarah" in the item sheet,
  with a link to the conversation on the contact timeline (`/crm/[contactId]`). `SarahAction`
  entries ("Booked Sam & Priya Patel — Thu 9:00") deep-link here with the item highlighted.
- **What she asks approval for:** reschedules and cancels notify the customer by text — through the
  existing hard gate. An owner-initiated change stages the draft inline ("Text Sam to let them know?
  [Review & send] / [No]" — GOOGLE_CALENDAR §2/§11); the same draft can arrive as an `Approval` card
  (`kind: 'customer_message'`) in the widget if the owner navigates away before confirming.
- **What you can tell her:** anything the screen does — "move the 2:00 Waltham to Friday morning,"
  "cancel the Patel estimate," "don't book me Saturdays anymore" (edits standing windows), "keep
  Friday afternoon open." The widget's page context (`{ module: 'schedule' }`, plus the focused
  date) means "what's tomorrow look like?" needs no elaboration.
- **Suggestion chips** (registry `MODULES.schedule.sarahChips`): "What does Thursday look like?" ·
  "Move an appointment" · "Block off time" · "When am I free next week?"
- **Approval-card kinds originating here:** `customer_message` (the reschedule/cancel notice).

The demo beat (matches the widget sketch in 00 §3): ask "what's Thursday look like?" → "3 estimates —
9:00 Newton, 11:30 Brookline, 2:00 Waltham. 40-min gap at 1." The calendar is that answer, drawn.

## 4. Data contract

Owned here per 00 §6: **`ScheduleItem`**, **`RoutePlan`**. Availability + sync types are local to
this module (`lib/data/schedule/types.ts`).

```ts
type ScheduleItemKind = 'estimate' | 'job'      // 'estimate' maps from Appointment; 'job' is NEW

interface ScheduleItem {
  id: string                                    // maps from: Appointment.id (estimates)
  kind: ScheduleItemKind
  contactId?: string                            // maps from: Appointment.leadId → Contact
  contactName: string                           // maps from: lead.contactName
  startAt: string; endAt: string                // ISO UTC; maps from: Appointment.startAt/endAt
  allDay?: boolean                              // jobs spanning days render as banners (new)
  status: 'proposed' | 'confirmed' | 'completed' | 'no_show' | 'cancelled'
                                                // maps from: Appointment.status (superset —
                                                // completed/no_show are new; SCOPE §10c)
  address?: string; town?: string               // maps from: lead.fullAddress / serviceTown
  lat?: number; lng?: number                    // maps from: none (TRAVEL_ROUTING §2 block 1)
  arrivalWindow?: { start: string; end: string }// preview; industry-standard framing
                                                // (TRAVEL_ROUTING §1) — "9:00–10:00 arrival window"
  bookedBy: 'sarah' | 'owner'
  sync: { state: 'local_only' | 'pending_push' | 'synced' | 'push_failed'; syncedAt?: string }
                                                // maps from: Appointment.syncState/syncedAt
  notes?: string                                // maps from: none (new)
}

interface RouteLeg {
  fromId: string | 'base'                       // ScheduleItem id or the base location
  toId: string | 'base'
  driveMinutes: number
  miles: number
  source: 'matrix' | 'haversine'                // fail-open marker (TRAVEL_ROUTING §4)
}

interface RoutePlan {                            // computed per organization-local day; PREVIEW (mock)
  date: string                                  // 'YYYY-MM-DD' in the organization's zone
  baseLabel: string                             // "Base — Watertown" (serviceArea.baseLocations)
  stopIds: string[]                             // located, timed items in start order
  legs: RouteLeg[]                              // stopIds.length + 1 legs (base → … → base)
  gaps: { start: string; end: string; minutes: number; usable: boolean }[]
                                                // "40-min gap at 1:00", usable = fits a 60-min visit
  bufferMinutes: number                         // ~10 (TRAVEL_ROUTING §3)
  totalDriveMinutes: number; totalMiles: number
}

interface AvailabilityWeek {                     // maps from: Organization.standingAvailability JSON
  timezone: string                              // IANA; e.g. 'America/New_York'
  windows: { dayOfWeek: 0|1|2|3|4|5|6; start: string; end: string }[]   // local wall-clock 'HH:mm'
}

interface CalendarSyncStatus {                   // maps from: CalendarConnection
  state: 'not_connected' | 'connected' | 'needs_reconnect'
  email?: string
  lastSyncedAt?: string
  pushFailures: number                          // items with syncState = 'push_failed'
}

interface ScheduleProvider {
  listItems(range: { from: string; to: string }): Promise<ScheduleItem[]>
  getRoutePlan(date: string): Promise<RoutePlan | null>   // null until routing ships / <2 stops
  getOpenSlots(day: string): Promise<{ startAt: string }[]>
      // real.ts: the api's CalendarProvider.getAvailability — the SAME computeOpenWindows Sarah
      // uses (standing windows − busy), so the owner's slot picker never disagrees with her
  getAvailability(): Promise<AvailabilityWeek>
  saveAvailability(week: AvailabilityWeek): Promise<{ ok: boolean }>
  getSyncStatus(): Promise<CalendarSyncStatus>
  changeItem(id: string, change: { type: 'cancel' } | { type: 'reschedule'; newStartIso: string }):
    Promise<{ ok: boolean }>
}
```

**Fixtures (`fixtures/apex.ts`):** Thursday = `si_thu1` 9:00–10:00 estimate `ct_patel` (Newton),
`si_thu2` 11:30–12:30 estimate Tom Brennan (Brookline), `si_thu3` 2:00–3:00 estimate Ana Rivera
(Waltham) — Brennan/Rivera are new minor cast (schedule-only leads; ids `ct_brennan`, `ct_rivera`).
`si_job_dana` = Dana Miller's roof replacement, `kind: 'job'`, all-day Mon–Wed banner (her arc's
"job scheduled" beat). Thursday `RoutePlan`: legs 15/25/25/15 min (base → Newton → Brookline →
Waltham → base), buffer 10, gaps: 25 min at 10:25 (`usable: false`), **40 min at 1:00**
(`usable: false` — that's the point of showing it), totals 80 min / 30.7 mi.

## 5. Actions

| Action | Mechanism | Real? |
|---|---|---|
| **Cancel item** | `real.ts` → existing Express api `POST /appointments/change` `{ cid, appointmentId, action: 'cancel' }` (HMAC `cid` via `signOrganizationHandoff` — exactly today's `cancelAppointmentAction`) | **Real** |
| **Reschedule item** | Slot picker (open slots from `getOpenSlots`) → same endpoint, `action: 'reschedule', newStartIso`. The endpoint already supports it; only the web UI is new | **Real** |
| **Customer notice (both above)** | The api's `applyOrganizationChange` stages Sarah's draft + the hard gate — customer is texted only on the owner's explicit yes (inline "Review & send" or an Approval card). Never auto-sent | **Real** (api) |
| **Save availability** | Server action writing `Organization.standingAvailability` windows JSON (cells merge → ranges, round-trip exact — SCOPE §6 tests). Same write path as onboarding/Settings today | **Real** |
| **Mark completed / no-show** | Server action updating `Appointment.status` (new statuses; feeds no-show tracking, SCOPE Phase 5) | New, small |
| **+ Block time** | Paints a one-off busy block so Sarah won't offer it. No backing model yet → mock: toast + fake `SarahAction` ("Blocked Fri 1–5 pm") | Mock |
| **Add job** | Jobs have no table yet (open question 1) → mock: toast + fixture append | Mock |
| **Connect Google** | No mutation here — the sync chip's "Connect" links to `/settings` (integrations card, per GOOGLE_CALENDAR §11). Chip state reads `CalendarConnection` | Real read |
| **Route recompute** | None — `RoutePlan` is read-only preview; when routing ships it's computed api-side (matrix + cache, haversine fail-open) | Preview |

Sarah's engine is involved only in the customer-notice step (her drafted message through the hard
gate) and, later, in travel-feasible slot *offering* — which is the api's `computeOpenWindows`
upgrade (TRAVEL_ROUTING §3), invisible to this screen beyond better-routed days.

## 6. Components

From the kit (00 §8): `PageHeader` (title, "Ask Sarah", `+ Block time`), `tabs` (Calendar /
Availability + the view toggle), `sheet`/`dialog` (item sheet, reschedule picker), `popover`
(week-view item peek), `calendar` + date-picker (jump to date), `dropdown-menu`, `DataTable` (List
view), `StatusBadge` (extend `apptStatusBadge` for the superset), `EmptyState`, `sonner`,
`skeleton`, `badge`.

New — flagged for the kit / `components/app/`:

- **`ScheduleCalendar`** — the week/day/month grid (CSS grid, no library; time gutter, now-line,
  all-day banner row, dimmed off-hours). The one genuinely new big component.
- **`RouteRail`** — renders a `RoutePlan`: base, stops, legs, gaps, buffer note, map stub.
- **`AvailabilityGrid`** — the drag-to-paint editor. **Extract/reuse the onboarding wizard's
  existing grid component** (`apps/web` onboarding), don't rewrite; lift it into
  `components/app/` so onboarding, this tab, and nothing else share one implementation.
- **`SlotPicker`** — day strip + the day's open 60-min starts as chips (from `getOpenSlots`).
- **`SyncChip`** — Google status: `synced ✓` / `not connected · Connect` / `⚠ n items didn't sync`.
- **`ItemSheet`** — composition: who (link → `/crm/[contactId]`), what (kind + title), where
  (address text + map stub + "Get directions" deep link), when (+ arrival window line when
  present), status, `✦ Booked by Sarah` attribution, sync line, [Reschedule] [Cancel] [Mark…].

## 7. States

- **Module status:** `live` (foundation default). Two sub-surfaces carry their own **preview**
  treatment inside the live page: the **RouteRail** + arrival-window lines (amber "Preview — we're
  building this with you. Ask Sarah about it."), rendered from mock `RoutePlan` fixtures even for
  real organizations; and **jobs** (banner demo items appear only in demo/preview mode until the job
  entity exists). Everything else is real data.
- **Running-with-no-data:** calendar renders (never blank) with the empty-state line over today:
  *"Sarah's calendar is live — the next estimate she books lands here."* + [Ask Sarah]. The
  Availability tab is never empty: it shows the windows set at onboarding.
- **Sync states:** `not_connected` → quiet chip, "Connect" → Settings. `needs_reconnect` → amber
  chip. `push_failed` on an item → soft warning line in the item sheet + chip count; **the booking
  stays valid regardless** (DB is the authority; push is best-effort — GOOGLE_CALENDAR §3/§10).
- **Fail-open everywhere:** no `RoutePlan` (missing geocodes, api error) → the rail hides, the
  calendar never blocks; `haversine`-sourced legs render with a "≈" prefix. Slot picker api error →
  "Couldn't load open times — try again" inline, item untouched.
- **Error / loading:** route-level `loading.tsx` (grid skeleton) + the `(app)` group `error.tsx`;
  all mutations toast success/failure via sonner. A failed cancel/reschedule leaves the item as-is
  with the failure toast (the current page's silent `{ ok: false }` is upgraded to a visible toast).

## 8. Open questions

1. **Job entity:** new `Job` table vs. a `kind` column on `Appointment`? Blocks `real.ts` for jobs,
   the Quotes→job handoff (accepted quote becomes a job), and CRM timeline linking. Mock-only until
   decided.
2. **Arrival windows now or later:** adopt the "9:00–10:00 arrival window" framing in UI + Sarah's
   confirmation copy now (industry standard per TRAVEL_ROUTING §1), or keep exact times until
   travel routing actually ships? Changes `ScheduleItem.arrivalWindow` from preview to contract.
3. **Availability editor location:** fully moves here (13-settings holds only a cross-link — the
   spec assumes this) or stays editable in both places? Duplicated editors = drift risk.
4. **Day-route map:** ship the free Google Embed `directions` map in the rail from day one, or text
   rail + map stub until routing is real? (Embed is free/unlimited; the stub is zero risk.)
5. **Confirm surface for the customer notice:** inline "Review & send" dialog on this page vs.
   always routing through the Sarah widget's Approval card — pick ONE pattern (it becomes the
   template for Quotes/Invoices sends too).
6. **Month view in v1?** For a solo operator, Week/Day/List may be enough — Month is the cheapest
   to cut if the calendar grid runs long.
