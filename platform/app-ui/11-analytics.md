# 11 — Analytics: the ROI page (funnel, trends, the numbers that prove it)

> Module spec per `../APP_UI_PLAN.md` §4. Builds on `00-foundation.md` (shell, widget, gating,
> seam, shared types — referenced, never redefined). Route: `/analytics`.

## 1. Purpose

The owner's ROI page. Fronts the **Analytics** feature (FEATURES.md Pillar 4): *"Every visit,
call, lead, quote, and booking in one place for the owner"* — sold on the landing page as
*"Analytics — Every visit, call, and lead in one place."* (REBRAND §3.4). Its job is SCOPE
§10(g) made literal: leads over time, response time, qualification rate, booked rate, show
rate — **"the numbers that prove ROI and justify the price."** One screen, plain English, no
analyst required: a headline row of stats, THE funnel from visit to paid, and four trend charts,
each with a one-line insight in Sarah's voice. Read-only — this page is Sarah's report card,
not a tool you operate.

**Real today vs. mock:** entirely mock today — there is no analytics surface or provider. When
`real.ts` comes, leads-over-time, bookings, qualification/booked rates, and response time are
**derivable from existing tables** (`Lead`, `Appointment`, `Message` timestamps); visits, call
volume, quote/win, revenue, and review metrics **need new event data** (a site/call event feed
plus the Quotes 06, Invoices 08, and Reviews 09 modules shipping their models).

## 2. Layout

```
┌ PageHeader: Analytics · [preview] · [7d | 30d | 90d | Custom ▾] · [Ask Sarah] ┐
│                                                                              │
│ ┌────────┐┌────────┐┌────────┐┌───────────┐┌───────────┐┌────────┐          │  ← headline
│ │ 34     ││ 19     ││ 64%    ││ 42s median││ $28,650   ││ 21     │          │    StatCards
│ │ Leads  ││ Booked ││ Win    ││ ✓ under   ││ collected ││ Reviews│          │    (delta vs.
│ │ ▲ 21%  ││ ▲ 12%  ││ ▲ 5pt  ││   60s     ││ ▲ 34%     ││ 4.9★   │          │    prior period)
│ └────────┘└────────┘└────────┘└───────────┘└───────────┘└────────┘          │
│                                                                              │
│ ── Your funnel ──────────────────────────┬── By source ──────────────────    │
│ Visits        ████████████████████ 1,284 │ Source       Leads  Bkd  Conv     │
│ Calls + leads ██ 34            (2.6%)    │ Website        19    12   63%     │
│ Qualified     ██ 27           (79%)      │ Missed call     9     5   56%     │
│ Booked        █▌ 19           (70%)      │ SMS             6     2   33%     │
│ Quoted        █ 11            (58%)      │ Import*       214     —    —      │
│ Won           ▌ 7             (64%)      │ *63 asked · 21 reviews · 4.9★     │
│ Paid          ▌ 5             (71%)      │  (reactivation, outside funnel)   │
│ ─────────────────────────────────────────┴─────────────────────────────      │
│ ── Response time (the 60-second promise) ─────────────────────────────────   │
│  Median 42s  [✓ under 60 seconds]   97% within target                        │
│  <30s ████████  30–60s ██████  1–5m █  >5m ▏          (this period)          │
│ ─────────────────────────────────────────────────────────────────────────    │
│ ── Trends ────────────────────────┬───────────────────────────────────────   │
│  Leads over time      [chart]     │  Bookings over time     [chart]          │
│  ✦ June: 31 leads, 14 booked —    │  ✦ 14 booked in June — Thursdays         │
│    your best month yet.           │    are your busiest estimate day.        │
│    Ask Sarah about this →         │    Ask Sarah about this →                │
│ ──────────────────────────────────┼───────────────────────────────────────   │
│  Reviews growth       [chart]     │  Revenue by month       [chart]          │
│  ✦ 21 new reviews since the       │  ✦ June: $23,900 collected — Dana        │
│    campaign — you were at 4.      │    Miller's roof was the biggest         │
│    Ask Sarah about this →         │    job ($14,200). Ask Sarah →            │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **One page, no tabs.** Reading order = the sales pitch: what happened (stats) → how work
  flows (funnel) → the origin promise (response time) → where it's heading (trends).
- **Date range** lives in `PageHeader`'s actions slot and drives every section. Presets 7/30/90
  days + custom (popover + calendar). Persisted in the URL (`/analytics?range=30d`) so the page
  server-renders the right window and links are shareable.
- **Deltas** on StatCards compare to the immediately-prior window of the same length.
- **Funnel** = horizontal bars, log-ish visual scale so `visits` doesn't flatten everything;
  each bar shows count + conversion from the previous stage. Stages whose event source doesn't
  exist yet for a live org render dimmed with "counting starts when X ships" (see §7).
- **By source** table sits beside the funnel on desktop; the import row is footnoted — imported
  contacts don't enter the inquiry funnel, their result is the reactivation line (63 asked ·
  21 reviews · 4.9★ from the 214 imported).
- **Trends**: 2×2 grid, one series per chart, shadcn `chart` with the existing `--chart-1..5`
  tokens; granularity follows range (7d/30d → daily, 90d → weekly, custom >120d → monthly).
  Under each chart: a Sarah insight line (§3).
- **Mobile:** StatCards in a 2-col grid; funnel bars full-width stacked; source table becomes
  the DataTable's responsive collapse (source + leads + conv%); response-time strip stacks;
  trend charts stack 1-col, full-width, insight line beneath each. Range picker collapses to a
  segmented control under the title. Widget launcher stays bottom-right per 00 §2.

## 3. Sarah

This page **is Sarah showing her work in numbers** — the module where "what did Sarah do" is
answered in aggregate rather than as a feed.

- **Insight lines.** Every chart and the funnel carry one plain-language line in Sarah's voice,
  computed with the data (part of the contract, §4 `Insight`), e.g. *"June: 31 leads, 14
  booked — your best month yet."* / *"Most of your leads still come from the website — 19 of
  34 this month."* Never chart-speak; always a sentence Marcus would text a friend.
- **"Ask Sarah about this."** Each insight line ends with this link; it opens the global widget
  with the page context extended by the section: `{ module: 'analytics', entityId:
  '<series|funnel|response_time key>' }` plus the insight's `sarahContext` payload, so "why did
  bookings dip in May?" needs no restating of what's on screen.
- **Suggestion chips** (`MODULES.analytics.sarahChips`): *"How's this month vs. last?"* ·
  *"What's my best lead source?"* · *"Am I still answering in under 60 seconds?"*
- **Approval cards from this module: none.** Analytics is read-only; nothing here produces a
  hard-gate draft. (Sarah may *reference* these numbers when proposing work elsewhere — e.g.
  "q_1043 for Jorge Alvarez is 3 days quiet; want me to nudge him?" — but that card belongs to
  Follow-ups 10, not here.)
- **Empty/early voice** is hers too (§7): the page never says "no data," it says what she's
  been doing and when the numbers land.

## 4. Data contract

Owned here per 00 §6: **`FunnelSnapshot`**, **`MetricSeries`**. Everything else below is
module-local (`apps/web/src/lib/data/analytics/types.ts`). These types are the mock fixtures
(`fixtures/apex.ts`) AND the backend's read model.

```ts
type RangePreset = '7d' | '30d' | '90d' | 'custom'
interface DateRange { preset: RangePreset; from: string; to: string }   // ISO dates, org tz

interface HeadlineStat {
  key: 'leads' | 'booked' | 'win_rate' | 'response_time' | 'revenue' | 'reviews'
  label: string                        // "Leads", "Booked", "Win rate", …
  value: string                        // pre-formatted: "34" · "64%" · "42s" · "$28,650"
  sub?: string                         // "4.9★ average" · "collected"
  delta?: { pct: number; direction: 'up' | 'down' | 'flat'; goodIsUp: boolean }
  target?: { label: string; met: boolean }   // response_time only: { "under 60 seconds", true }
}

interface FunnelSnapshot {             // OWNED HERE (00 §6 registry)
  range: DateRange
  stages: FunnelStage[]                // ordered: visits → inquiries → qualified → booked
  sources: SourceRow[]                 //          → quoted → won → paid
}
interface FunnelStage {
  key: 'visits' | 'inquiries' | 'qualified' | 'booked' | 'quoted' | 'won' | 'paid'
  label: string                        // "Visits", "Calls + leads", …
  count: number
  conversionFromPrev?: number          // 0–1; absent on the first stage
  available: boolean                   // false → event source not live yet (render dimmed, §7)
}
// maps from: inquiries/qualified ← Lead (source, status); booked ← Appointment;
// visits ← none (new site/call event feed); quoted/won ← none (06 Quote);
// paid ← none (08 Invoice)

interface SourceRow {
  source: 'website' | 'missed_call' | 'sms' | 'import'
  label: string
  leads: number                        // import: contact count (214)
  booked?: number                      // import: undefined (outside the inquiry funnel)
  conversion?: number                  // booked / leads, 0–1
  note?: string                        // import: "63 asked · 21 reviews · 4.9★"
}                                      // maps from: Lead.source + 05-crm ImportJob + 09 results

interface MetricSeries {               // OWNED HERE (00 §6 registry)
  key: 'leads' | 'bookings' | 'reviews' | 'revenue'
  label: string
  unit: 'count' | 'cents'              // cents per 00 §9; UI formats "$23,900"
  granularity: 'day' | 'week' | 'month'
  points: { t: string; v: number }[]   // t = ISO bucket start, org tz
  insight?: Insight
}
// maps from: leads ← Lead.createdAt; bookings ← Appointment.startAt;
// reviews ← none (09 ReviewRequest outcomes); revenue ← none (08 Invoice.paidAt)

interface Insight {
  text: string                         // "June: 31 leads, 14 booked — your best month yet."
  sarahContext: string                 // compact summary handed to the widget on "Ask Sarah"
}

interface ResponseTimeStat {
  medianSeconds: number                // 42
  p90Seconds: number                   // 71
  targetSeconds: 60                    // the promise, fixed
  withinTargetPct: number              // 0.97
  buckets: { label: '<30s' | '30–60s' | '1–5m' | '>5m'; count: number }[]
  insight?: Insight
}                                      // derived: first outbound Message after Lead.createdAt

interface AnalyticsProvider {          // analytics/provider.ts, per 00 §5
  getHeadline(range: DateRange): Promise<HeadlineStat[]>
  getFunnel(range: DateRange): Promise<FunnelSnapshot>
  getSeries(key: MetricSeries['key'], range: DateRange): Promise<MetricSeries>
  getResponseTime(range: DateRange): Promise<ResponseTimeStat>
}
```

**Apex fixture values** (30-day window, consistent with the 00 §5 cast): funnel 1,284 → 34 →
27 (79%) → 19 (70%) → 11 (58%) → 7 (64%) → 5 (71%). Headline: 34 leads (▲21%) · 19 booked
(▲12%) · 64% win rate (▲5pt) · 42s median (✓ under 60s) · $37,400 invoiced / $28,650 collected
(▲34%) · 21 reviews, 4.9★. Sources: website 19/12, missed call 9/5, SMS 6/2, import 214 (63
asked · 21 reviews). Revenue-by-month June = $23,900 collected incl. `inv_2031` ($14,200,
Dana Miller, paid); `q_1042` $14,200 accepted feeds "won"; `q_1043` $1,850 sits in "quoted,"
not "won" (Jorge Alvarez, unanswered — Follow-ups is chasing).

## 5. Actions

Read-only module — **no mutations, nothing touches Sarah's engine** (the widget conversation is
the widget's, per 00 §3). Only two interactions:

| Action | Kind | Notes |
|---|---|---|
| Change date range | client → URL param → server re-render | `?range=7d|30d|90d` or `?from=…&to=…`; provider re-queried server-side; no state stored |
| Export CSV | server action (streams CSV of funnel + series for the current range) | **Maybe-later — flagged, not in the first build.** Ship only if a design partner asks; mock provider would download the fixture data |

Mock providers here genuinely mutate nothing — there's not even a fake `SarahAction` to
enqueue (00 §5's toast-and-pretend pattern doesn't apply to a read-only module).

## 6. Components

From the kit / shared set (00 §8):

- `PageHeader` — title, `preview` badge, range picker + (later) Export in the actions slot,
  "Ask Sarah."
- `StatCard` — the headline row. **Needs one extension:** optional `target` badge slot (the
  "✓ under 60 seconds" chip on the response-time card). Flagging here; extend the shared
  component, don't fork it.
- `chart` (shadcn, base-nova) — all four trend charts + the response-time bucket bar. One
  series per chart, `--chart-1..5` tokens from `globals.css`; **charts must follow the repo
  `dataviz` conventions at build time** (form, color, axis/tooltip rules) — this spec fixes
  content, not styling.
- `DataTable` — the by-source table (simple variant: no search/pagination, responsive column
  hiding on mobile).
- `popover` + `calendar` date-picker composition — custom range.
- `skeleton` via route `loading.tsx`; `sonner` for the (later) export result.

Module-local (not kit candidates yet):

- `FunnelBars` — the horizontal funnel (bar + count + conversion label + dimmed/unavailable
  treatment). No shadcn funnel primitive exists; build local, promote to the kit only if a
  second module wants it.
- `InsightLine` — ✦ mark + `Insight.text` + "Ask Sarah about this" (opens widget with the
  section context, §3).

## 7. States

- **`coming_soon`** (default for real partners until this ships): `GatedState` teaser with the
  REBRAND §3.4 line verbatim — *"Analytics — Every visit, call, and lead in one place."* — plus
  "Ask Sarah about it."
- **`preview`** (demo accounts / `?demo=1`): full page on the Apex fixtures above + the slim
  amber banner: *"Preview — we're building this with you. Ask Sarah about it."*
- **`live`, early days** (running-with-no-data): never an empty chart wall. Sections render
  with whatever exists and Sarah's voice fills the gap: *"I've been on the job since Tuesday —
  your first full week of numbers lands Friday."* Stat cards show real counts (even small);
  deltas hidden until a full prior period exists.
- **`live`, partial instrumentation:** funnel stages with `available: false` (visits before the
  site event feed; quoted/won/paid before 06/08 ship) render dimmed with *"counting starts when
  your website analytics / quotes / invoices go live"* — real stages never pretend, dimmed
  stages never fake zeros. Same rule for the reviews/revenue trend charts.
- **Error:** `(app)` group `error.tsx` for hard failures; per-section fetch failure renders a
  quiet inline fallback ("Couldn't load this chart — retry") so one bad query doesn't blank
  the ROI page.

## 8. Open questions

1. **Visits source** — what feeds the funnel's top: PostHog on the client sites (03-website),
   a first-party event table, or both? Changes `real.ts` and whether `visits` can ever be
   per-source (today's per-source table starts at leads, not visits).
2. **Window semantics** — headline cards say "this month" in the brief but the picker is
   rolling 7/30/90d. Pick one (rolling windows everywhere vs. calendar-month default) before
   the fixtures freeze; deltas depend on it.
3. **Response-time definition** — first outbound after `Lead.createdAt` works for website
   leads; missed-call leads have no inbound text and import contacts none at all. Confirm the
   denominator (website + SMS inquiries only?) so the 97%-within-target claim is honest.
4. **Show rate** (SCOPE §10g) — requires shown/no-show marking in Schedule (07). Include as a
   seventh headline stat now (mocked) or add only when 07 ships the marking action?
5. **Gating granularity** — revenue/reviews/quote stats before 06/08/09 are live: dim them
   inside a `live` Analytics module (as spec'd in §7), or hold the whole module `coming_soon`
   until at least one money module is real?
