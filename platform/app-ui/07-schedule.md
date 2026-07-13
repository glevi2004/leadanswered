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
chip UI are NEW — route + windows render from mock `RoutePlan` fixtures, unlabeled (00 §4).

## 2. Layout

Tabs under the header: **Calendar** (default) · **Availability**. Calendar tab has a view toggle:
**Week** (default) · Day · Month · List. All times rendered in the organization's zone (America/New_York
for Apex).

**The Posts layer (Levi, 2026-07-13 — Content and Schedule work together):** a **"Posts" toggle**
in the toolbar (pink·cyan dot pair; ON by default, persisted in `schedule_show_posts`) overlays
04-content's scheduled/published items on this calendar — the owner's week is jobs AND marketing
in one glance. Posts render as **day-banner chips** (the all-day lane in Week, a "going live"
row in Day, labeled rows in Month), never as blocks in the hour grid — a publish time is not a
work block. Chips use the content kind colors (KIND_META: blog pink · Facebook cyan) and
deep-link to `/content/[id]`. Data stays decoupled: content projects into a read-only
`SchedulePost` shape; `ScheduleItem` never learns about posts. The toggle only appears when the
content module isn't `coming_soon`/`hidden` (gating composes). List view stays appointments-only
(v1). The month grid's construction is extracted as the shared **`CalendarMonth`** — 04's
Calendar tab renders the same grammar (one calendar language app-wide).

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

- Multi-day **jobs** render as an all-day banner row above the time grid, spanning exactly their
  own days (grid-column span); timed items (60-min estimates, single-visit jobs, blocks) render as
  blocks. `✦` marks items Sarah booked.
- Hours outside standing availability are dimmed (`░`); the highlighted routable gap (`▒`) appears
  only on days with 2+ located stops (preview).
- Clicking any item opens the **item sheet** (below). Clicking a day header opens Day view.

**Calendar behaviors (built 2026-07-12 — the Tier 1+2 pass):**

- **Create on the grid:** click (or drag across) an empty slot → the **Add dialog** prefilled with
  that day/time/duration: kind segment (Estimate / Job / **Block time**), name, date, 30-min time
  steps, duration, address, note. Toolbar `+ New` opens the same dialog. Created items are
  local-state for now (no owner-create endpoint yet) — the dialog says so honestly in real mode.
  Blocks immediately subtract from `openSlots`, so Sarah stops offering those times.
- **Drag to reschedule:** drag a block to any day/slot (30-min snap; duration preserved; live
  time label while dragging). Real estimates commit through `rescheduleAppointmentAction` — same
  hard gate, Sarah asks before texting the customer; failure reverts the move with an error toast.
  Jobs/blocks/demo move locally. A click without movement still opens the item sheet.
- **Resize:** drag the bottom edge to change duration (jobs/blocks/demo estimates; real estimates
  are fixed 60-min server-side, so no handle).
- **Kind tints (identity, not status):** estimate = blue tint, job = violet tint, block = hatched
  gray. Status modifies the block: `proposed` dashed + lighter, past faded, `no_show` red tint.
  Borders use OPAQUE weights (`border-blue-300 dark:border-blue-800`) — alpha oklab borders
  composite to a yellow fringe in Chromium, learned the hard way.
- **Overlap lanes:** items at the same time render side-by-side (greedy lane assignment per
  overlap cluster), never stacked/hidden.
- **Now-line:** red current-time line on today's week column (updates every minute); Day view gets
  a red "now" divider between past and upcoming items.
- **Jump to date:** the range label is a popover with a mini month picker (`ui/calendar`).

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
- ~~map stub~~ — SHIPPED as a live Leaflet + OSM map (see §8 Q4): numbered pins in route order,
  base marker, dashed connectors until real road-routing ships.

**Month** (built) = 6-week grid, Mon-first; each cell lists up to 3 items as kind-colored dots +
"9a Name" lines, then "+N more"; multi-day jobs appear on every day they span; today's number is
inverted; any cell click-throughs to Day. **List** = the current appointments page, upgraded: a
`DataTable` of upcoming/past with kind, contact, time, town, status, actions.

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
type ScheduleItemKind = 'estimate' | 'job' | 'block'
    // 'estimate' maps from Appointment; 'job' and 'block' are NEW (no backing model yet).
    // A block is owner-personal busy time — no contact/address; contactName holds its label
    // ("Personal — dentist"); it counts against openSlots so Sarah won't offer those times.

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

**Fixtures (`fixtures/apex.ts`):** a generated **dense fortnight** anchored to the current week's
Monday (`scheduleItem()` helper — so the demo is always busy regardless of when it's viewed):
2–4 estimates every weekday across the service towns, Saturday mornings, one personal block per
week ("Personal — dentist" Tue 2–4, "lunch with supplier" Fri 12–1), a deliberate 10:30 overlap
pair (exercises the lane layout), last-week history whose past items auto-derive `shown`/`no_show`
statuses (exercises the status colors), and coordinates per town (feeds the route map). On top of
the generated set, the curated cast survives: Thursday = `si_thu1` 9:00 estimate `ct_patel`
(Newton), `si_thu2` 11:30 Tom Brennan (Brookline), `si_thu3` 2:00 Ana Rivera (Waltham);
`si_job_dana` = Dana Miller's roof replacement, all-day Mon–Wed banner; `si_g20` = Frank
Sullivan's gutter replacement, Wed–Sat the following week. Thursday `RoutePlan`: legs 15/25/25/15
min (base → Newton → Brookline → Waltham → base), buffer 10, gaps: 25 min at 10:25
(`usable: false`), **40 min at 1:00** (`usable: false` — that's the point of showing it), totals
80 min / 30.7 mi.

## 5. Actions

| Action | Mechanism | Real? |
|---|---|---|
| **Cancel item** | `real.ts` → existing Express api `POST /appointments/change` `{ cid, appointmentId, action: 'cancel' }` (HMAC `cid` via `signOrganizationHandoff` — exactly today's `cancelAppointmentAction`) | **Real** |
| **Reschedule item** | Slot picker (open slots from `getOpenSlots`) → same endpoint, `action: 'reschedule', newStartIso`. The endpoint already supports it; only the web UI is new | **Real** |
| **Customer notice (both above)** | The api's `applyOrganizationChange` stages Sarah's draft + the hard gate — customer is texted only on the owner's explicit yes (inline "Review & send" or an Approval card). Never auto-sent | **Real** (api) |
| **Save availability** | Server action writing `Organization.standingAvailability` windows JSON (cells merge → ranges, round-trip exact — SCOPE §6 tests). Same write path as onboarding/Settings today | **Real** |
| **Mark showed / no-show** | Item sheet's "How did it go?" on past estimates → `markAppointmentOutcomeAction`: direct `Appointment.status` write (`shown` \| `no_show`), tenant-guarded — no customer text, so no api round trip. Feeds no-show tracking (SCOPE Phase 5) | **Real** (built 2026-07-12) |
| **Drag to reschedule** | Week-grid drag commits through the same `POST /appointments/change` reschedule (real estimates; hard gate applies); optimistic move, revert on failure | **Real** (built 2026-07-12) |
| **+ Block time / Add job / Add estimate (owner)** | The Add dialog (toolbar `+ New` or click-an-empty-slot). Local state only — no backing model yet (open question 1); blocks still subtract from `openSlots` immediately. Real mode says so in the dialog | Mock (built) |
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
  all-day banner row spanning real days, dimmed off-hours, overlap lanes, pointer-based
  drag-move/resize/drag-create — all hand-rolled in `ScheduleClient.tsx`). The one genuinely new
  big component.
- **`CreateDialog`** — the Add dialog (kind segment / name / date / time / duration / address /
  note), prefilled from the clicked or dragged-over slot.
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
4. ~~**Day-route map**~~ — *resolved (Levi go-ahead, 2026-07-12): shipped as Leaflet + OSM
   (zero keys) — numbered pins in route order + base marker, deliberately DASHED straight
   connectors until real road-routing ships api-side (then upgrade to Google directions
   polylines). Fail-open: renders only when stops carry lat/lng (demo fixtures have coords;
   real geocoding is TRAVEL_ROUTING backend work). ItemSheet gained the "Get directions"
   deep link.*
5. **Confirm surface for the customer notice:** inline "Review & send" dialog on this page vs.
   always routing through the Sarah widget's Approval card — pick ONE pattern (it becomes the
   template for Quotes/Invoices sends too).
6. ~~**Month view in v1?**~~ — *resolved (Levi go-ahead, 2026-07-12): built in the Tier 1+2
   calendar pass, alongside create-on-grid, drag-to-reschedule/resize, now-line, kind tints,
   overlap lanes, the date-jump popover, mark showed/no-show (real), and the dense demo fortnight.*


## 9. Reconciliation note (2026-07-12 audit)

**§4 data contract — reconciled to the shipped types (`lib/data/schedule/types.ts`):**
- `sync` object → flat `syncState?: string` (maps from `Appointment.syncState`); the
  `local_only/pending_push` states, `syncedAt`, and `CalendarSyncStatus.lastSyncedAt` /
  `pushFailures` are deferred with the sync-chip failure states.
- `RouteLeg` fields are `from` / `to` / `approx: boolean` (≈ prefix) — not
  `fromId/toId/source`; `RoutePlan.gaps` carry a prebuilt `label` instead of `start/end`.
- `status` uses **`shown`** (+ `rescheduled`) per the Prisma enum — `completed` never ships from
  the DB; `markAppointmentOutcomeAction` writes `shown | no_show` for real.
- `ScheduleItem.label` (new): job descriptor kept separate from the name — banners render
  "Job — Dana Miller · roof replacement" without doubling.
- `arrivalWindow` — deferred entirely (field + UI) until travel routing ships.
- No `ScheduleProvider` interface: the module exports `listItemsMock/listItemsReal/getRouteMock`;
  open-slots is computed client-side (`openSlots()` in `ScheduleClient`) — reusing the api's
  `computeOpenWindows` is deferred with the provider-seam refactor (00 §11).

**§2/§6 — as built:** no Ask-Sarah/"+ Block time" header buttons (toolbar `+ New` opens the
Add dialog; Block time is a kind segment in it) · the route rail carries NO amber preview badge
(no banners anywhere, 00 §4) · `RouteRail`/`SlotPicker` live inline in `ScheduleClient`;
`AvailabilityGrid` = the reused `AvailabilitySection` from `components/config/sections` ·
Settings now cross-links "Availability lives in Schedule →" (`/schedule?tab=availability` deep
link honored).

**Deferred:** back-at-base ETA on the rail · routable-gap chips on the WEEK grid (day rail has
them) · sync-chip failure states (`⚠ n didn't sync`, `needs_reconnect`) · travel-buffer hatch
segments on the timeline · the mobile pass (day-default, swipeable columns, one-day
availability painting, header overflow menu).