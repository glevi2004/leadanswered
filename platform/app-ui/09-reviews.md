# 09 — Reviews: the reactivation campaign + ongoing asks

> Module spec per `../APP_UI_PLAN.md` §4. Builds on `00-foundation.md` (shell, widget, gating,
> seam, shared types — referenced, never redefined). Fronts **FEATURES.md Pillar 3 → Reviews —
> reactivation campaign**; makes **REBRAND-PLAN §3.5 (Day-one ROI)** and §3.4 Reviews copy literal.
> Route: `/reviews` (home) · `/reviews/[campaignId]` (campaign detail) · `/reviews/new` (wizard).

## 1. Purpose

This is **the day-one ROI module** — the screen that proves *"paid for itself before you pay us."*
We import the owner's past customers (05-crm), Sarah texts every one who never left a review —
the owner's photo, five stars, a simple ask — and a wave of 5-star Google reviews lands in week
one. The page's job is to make that undeniable: the **results wall first** (new reviews, average
rating, before → after on Google), the reviews themselves, then the machine producing them (the
campaign funnel). After the wave, the module shifts to **ongoing mode**: an automatic ask after
every completed job, through the same approval gate. Everything here is Sarah doing the work and
the owner saying yes — never a bulk-SMS tool the owner has to operate.

**Real today vs. mock:** entirely mock. No `Campaign`/`ReviewRequest` tables, no customer import,
no GBP review link, no campaign worker exist yet — the module depends on **CRM import (05)** for
its audience and ships per its own FEATURES.md development plan. Until then: `preview` on the
Apex fixtures below (`coming_soon` for real partners), served by `data/reviews/mock.ts`.

## 2. Layout

### Module home — `/reviews` (the results wall first; the proof, then the machine)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Reviews                                    [preview]   [Ask Sarah]   │
├──────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐  │
│  │    +22       │  │    4.9 ★     │  │  Google reviews:  53       │  │
│  │ new reviews  │  │ avg rating   │  │  +22 since campaign start  │  │
│  │ 21 campaign  │  │ (new asks)   │  │  ▁▂▃▅▆█  (weekly count)    │  │
│  │ · 1 ongoing  │  └──────────────┘  └────────────────────────────┘  │
│  └──────────────┘                                                    │
│  Recent reviews                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ★★★★★  Dana Miller · Jun 30 · after her roof replacement       │  │
│  │ "Marcus and his crew replaced our roof in two days — spotless  │  │
│  │  cleanup. Wish we'd called years ago."                         │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ ★★★★★  Rich Calloway · Jul 8  "Fast, fair, no surprises…"     │  │
│  │ ★★★★☆  Tam Nguyen · Jul 6     "Solid work on the flashing…"   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  Active campaign — Past-customer reactivation             [View →]  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ running · ▓▓▓▓▓▓░░░░░░░░░░  63 of 187 asked · 21 reviews      │  │
│  │ Next: 15 asks tomorrow from 9:00 · 1 awaiting your OK  [Pause] │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  Ongoing asks — ON · after every completed job, Sarah drafts the     │
│  ask and sends it for your OK.                          [Settings]  │
└──────────────────────────────────────────────────────────────────────┘
```

**Built 2026-07-12 (operability pass — the page became a machine you can run, not a diorama):**

- **Toolbar:** left, the provenance chip — *Google Business Profile: Apex Roofing — Newton ✓*
  (→ Settings; same trust pattern as Schedule's sync chip — numbers must say where they come
  from). Right, **[+ New campaign]** → `/reviews/new` — THE entry point (it was missing entirely;
  the wizard was unreachable).
- **Campaigns card** replaces the single hardcoded "Active campaign": a LIST — running/paused
  rows (status chip · mini progress · asked/reviewed counts · pause/resume · a LIVE
  "N awaiting your OK" link into `/sarah?tab=approvals`, counted from pending `review_ask`
  approvals — no more hardcoded 1) and completed rows (reviews/asks/avg/when → detail). Rows
  click through. Empty state: "No campaigns yet" + the pitch.
- **After every job** (was the bare on/off toggle): its own card — explainer line + the last
  3 post-job asks (name, status chip, detail, [Review] on the one awaiting approval) + the
  toggle. The ongoing machine finally has a face.
- **Feed:** filter chips (All / Campaign / After a job), per-review **"View on Google ↗"**
  link, and the bad-review story: a 3★ item carries a *kept private* chip + "Under 4★, Sarah
  asks what went wrong instead of sending the Google link — this never posted publicly."
- Fixtures: `APEX_CAMPAIGNS` = the running wave + **`camp_test_0` "Newton neighbors test"**
  (completed: 11 reviews from 24 asks, Google 20→31 — the small test that led to the big wave)
  + `APEX_ONGOING_ASKS`.

### Campaign detail — `/reviews/[campaignId]`

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Reviews · Past-customer reactivation        ● running   [Pause]    │
├──────────────────────────────────────────────────────────────────────┤
│  Funnel:   queued 124 ─► sent 63 ─► responded 38 ─► reviewed 21      │
│            opted out 3 · failed 1        audience 187 of 214 imported│
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ⓘ How this runs: 15/day inside your hours (Mon–Sat 9–7,        │  │
│  │   America/New_York) — never a blast · STOP opts anyone out     │  │
│  │   automatically, forever · one ask + one reminder, then we     │  │
│  │   leave them alone · 3 opted out [see who]                     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  Targets                              [search…] [status ▾] [⏸ only] │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Mike O'Brien    queued — draft awaiting your OK   [Review] ⏸  │  │
│  │ Priya Okafor    sent Jul 8 · reminder Fri              ⏸      │  │
│  │ Rich Calloway   reviewed ★★★★★ · Jul 8                        │  │
│  │ Joan Whitfield  opted out Jul 4 — won't be contacted again    │  │
│  │ Ed Sousa        failed — number no longer in service          │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

**Built 2026-07-12:** funnel says **replied** (matches the table status — "responded" was
naming drift) · **[Edit the ask]** and **[Change pacing]** inline sections (mock save, honest
copy: applies to unsent targets only) · **completed** campaigns get a results-summary card
(reviews/asks/avg + Google before→after) and lose the pause button · a fresh queue (no rows
yet) renders "The queue is set — the first asks land in your approvals tomorrow at 9:00."

### Setup wizard — `/reviews/new` (4 steps; we pre-fill everything — the owner confirms, not builds)

1. **Audience** — "Your 214 imported customers" (from `imp_qb1`; cross-link 05-crm import). Shows
   the exclusions we already applied: **already reviewed (19) · opted out (2) · open lead (4) ·
   bad number (2) → 187 will be asked**. *Built 2026-07-12:* **"See the list"** expands the
   eligible names (scrollable, `APEX_AUDIENCE_NAMES`) with per-person ✕ remove / put back — the
   count updates live ("185 will be asked · 2 removed by you"). Zero imported → the step is
   replaced by an import hand-off card → `/crm`. No manual list-building.
2. **The ask** — live `AskPreview` phone mockup: **Marcus Reed's headshot** (MMS) + ⭐⭐⭐⭐⭐ + the
   message, personalized per target — *"Hi Mike, it's Marcus from Apex Roofing…"* — ending in the
   **Google review link** (GBP). Editable template + reminder copy; photo upload; link field.
3. **Pacing** — drip **N/day** (default 15) inside business hours, org timezone. Copy states the
   compliance rules plainly: never a blast, STOP handled automatically, one ask + one reminder max.
4. **Launch** — recap card + a **campaign name** field (prefilled "Past-customer wave — {month}")
   → **"Start the wave."** *Built 2026-07-12:* launch actually CREATES the campaign — stored via
   the `localCampaigns` localStorage seam (UI-first stand-in for the Campaign model) — and lands
   on its detail page with the full queue visible and merged into the home Campaigns list. Sarah
   begins drafting; first sends arrive as `review_ask` Approvals (§3).

### Mobile

Home stacks: stat cards (1-col) → reviews feed → campaign card → ongoing card. Campaign detail:
funnel becomes a vertical list; the targets `DataTable` collapses to row cards (name, status
badge, one-line detail, ⏸); compliance card stays above the table. Wizard is one step per screen
with a sticky Next. Sarah launcher stays bottom-right above sticky actions (00 §2).

## 3. Sarah

Sarah **is** the campaign — every text is hers; this page is the owner watching her work.

- **What she did** (`SarahAction`, module `'reviews'`): *"Asked 8 past customers for a review —
  2 already replied"* · *"New ★★★★★ from Rich Calloway — that's 21 from the campaign"* ·
  *"Dana Miller left 5 stars after her roof replacement"* — each deep-links here or to the
  contact's CRM timeline.
- **Approvals — the hard gate.** Every review ask is a draft until the owner says yes: `Approval`
  kind **`review_ask`** (00 §6). Fixture: Mike O'Brien's pending ask —
  *"Hi Mike, it's Marcus from Apex Roofing — we replaced your roof back in 2024 and you were
  great to work with. If you've got 30 seconds, a Google review would mean a lot: {link}"* —
  approvable from the widget card, `/sarah`, or the target row's **[Review]** button (same
  `Approval`, three surfaces). Approve = send (paced), Edit = amend then send, Decline = target
  skipped. Batch granularity: open question §8.1.
- **Tell her** — suggestion chips (`MODULES.reviews.sarahChips`): *"How's the review campaign
  going?"* · *"Pause the review asks"* · *"Who hasn't been asked yet?"*. Free text works for
  everything on this page: "skip the Whitfields," "bump it to 20 a day," "mention the storm work
  in my ask," "text Dana a thank-you."
- **Page context** (00 §3): on `/reviews/camp_react_1` the widget sends
  `{ module: 'reviews', entityId: 'camp_react_1' }`, so "pause it" needs no names.
- **Ongoing mode** is Sarah's initiative: job completed (07-schedule) / invoice paid
  (08-invoices) → she drafts the ask → `review_ask` Approval → send. Dana Miller's flagship
  ★★★★★ came through exactly this path.

## 4. Data contract

Owned here per 00 §6: **`Campaign`**, **`ReviewRequest`**. Fixtures live in `fixtures/apex.ts`
(cast ids from 00 §5). A target's review also emits the shared
`TimelineEvent { type: 'review', rating, excerpt }` on its contact — CRM shows it in the timeline.

```ts
type CampaignKind = 'reactivation' | 'ongoing'
type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed'

interface Campaign {
  id: string                       // fixture: 'camp_react_1' + 'camp_ongoing_1'
  kind: CampaignKind
  name: string                     // "Past-customer reactivation"
  status: CampaignStatus
  importJobId?: string             // 'imp_qb1' (05-crm ImportJob) — reactivation only
  ask: {
    ownerPhotoUrl: string          // Marcus Reed headshot, sent as MMS
    reviewLinkUrl: string          // GBP review link (paste-a-link v1 — §8.3)
    template: string               // "Hi {firstName}, it's {ownerFirst} from {business}…"
    reminderTemplate: string       // ONE reminder max — compliance-surfaced (§2)
    reminderAfterDays: number      // 3
  }
  pacing: {
    perDay: number                                            // 15 — never a blast
    window: { start: string; end: string; days: number[] }    // '09:00'–'19:00', Mon–Sat, org tz
  }
  audience: {                      // reactivation only; snapshot at launch
    imported: number               // 214
    eligible: number               // 187
    excluded: { alreadyReviewed: number; optedOut: number; openLead: number; badPhone: number }
  }                                // 19 · 2 · 4 · 2
  counts: Record<ReviewRequestStatus, number>
    // fixture: queued 124 · sent 21 · replied 17 · reviewed 21 · opted_out 3 · failed 1
    // funnel renders cumulative: sent 63 (=21+17+21+3+1) → responded 38 (=17+21) → reviewed 21
  results: {
    newReviews: number             // 21 (campaign); module-level wall adds ongoing → 22
    averageRating: number          // 4.9
    googleBefore: number           // 31 — captured at setup
    googleAfter: number            // 53
  }
  startedAt?: string               // '2026-07-02T09:00:00-04:00'
  completedAt?: string
  createdAt: string
}

type ReviewRequestStatus =
  | 'queued' | 'sent' | 'replied' | 'reviewed' | 'opted_out' | 'failed'

interface ReviewRequest {
  id: string
  campaignId: string
  contactId: string                // ct_obrien, …
  contactName: string              // denormalized for the table
  status: ReviewRequestStatus      // latest state; 'replied' = responded, no review yet
  paused: boolean                  // per-person pause — freezes queue slot AND reminder
  approvalId?: string              // pending 'review_ask' Approval (fixture: Mike O'Brien)
  scheduledFor?: string            // next queued send slot
  sentAt?: string
  remindAt?: string; reminderSentAt?: string
  repliedAt?: string; replyExcerpt?: string
  reviewedAt?: string; rating?: 1 | 2 | 3 | 4 | 5; reviewExcerpt?: string
  failReason?: string              // 'undeliverable' (Ed Sousa fixture)
}

interface ReviewFeedItem {         // the results-wall feed (module home)
  id: string; reviewer: string; contactId?: string
  rating: 1 | 2 | 3 | 4 | 5; excerpt: string; at: string
  source: 'campaign' | 'ongoing' | 'organic'   // Dana Miller = 'ongoing'
}

interface ReviewsProvider {        // data/reviews/provider.ts (00 §5 seam)
  getOverview(): Promise<{ results: Campaign['results'] & { newReviewsTotal: number }
                           feed: ReviewFeedItem[]; campaigns: Campaign[] }>
  getCampaign(id: string): Promise<{ campaign: Campaign; requests: ReviewRequest[] }>
  createCampaign(input: CampaignDraftInput): Promise<Campaign>          // wizard
  launchCampaign(id: string): Promise<void>
  pauseCampaign(id: string): Promise<void>; resumeCampaign(id: string): Promise<void>
  setRequestPaused(requestId: string, paused: boolean): Promise<void>
  updateAsk(id: string, ask: Partial<Campaign['ask']>): Promise<void>
  setOngoingEnabled(enabled: boolean): Promise<void>
}
```

## 5. Actions

| Action | Surface | Mock (`preview`) | Real | Sarah engine? |
|---|---|---|---|---|
| Create campaign (wizard save) | `/reviews/new` → server action | returns draft + toast | server action → `Campaign` row | no |
| **Launch campaign** | wizard step 4 / detail | toast *"Sarah's drafting the first asks"* + fake `SarahAction` | **api call** (HMAC-`cid`): Sarah drafts personalized asks → `review_ask` Approvals; worker paces sends | **yes** — drafting + hard-gate send |
| Approve / edit / decline ask | widget card · `/sarah` · target row **[Review]** | Approval flips state, toast | Approval actions (02-sarah owns them) → api sends on yes | **yes** — the hard gate |
| Pause / resume campaign | home card · detail header | status flips | server action → api (worker stops/starts pacing) | no |
| Pause / resume one target (⏸) | target row | `paused` flips | server action; worker skips + holds reminder | no |
| Edit the ask (photo / link / template / pace) | detail → Settings | toast | server action; applies to **unsent** targets only | no |
| Toggle ongoing mode | home card | toggles | server action; api subscribes to job-completed / invoice-paid events (07/08 — §8.4) | **yes** — she drafts each post-job ask |
| STOP received | *(no UI action)* | — | webhook → `opted_out` + org-wide suppression, never contacted again; row + opted-out list update | automatic |
| Reminder send | *(no UI action)* | — | worker, once per target at `remindAfterDays`, inside the window | automatic |
| Review detected | *(no UI action)* | — | request → `reviewed`; emits `TimelineEvent 'review'` + `SarahAction`; wall updates (detection: §8.3) | automatic |

All server-action results toast via sonner (00 §8). Mock mutations mutate nothing (00 §5) —
EXCEPT campaign creation (built 2026-07-12): wizard launch persists to the `localCampaigns`
localStorage seam so the created campaign survives navigation (home list + detail render it);
swap to the real `Campaign` row when the model ships. Edit-the-ask / pacing / pause / per-target
pause are toast-only local state.

## 6. Components

From the kit + 00 §8 additions: `PageHeader` (title, actions slot), `StatCard`
(the wall — plus a small weekly-count spark via `chart`, per `dataviz` conventions), `DataTable`
(targets: search, status filter, paused filter, responsive collapse), `statusChip()` from `lib/dashboard-ui.ts` (the central semantic families, 00 §9: queued=gray ·
sent=blue · replied=violet · reviewed=emerald · opted_out=amber · failed=red), `progress` (campaign bar), `dialog` (pause-campaign confirm),
`avatar` (owner photo, reviewer initials), `tabs` (detail: Targets / Settings), `sonner`,
`EmptyState` / `GatedState`, `skeleton` via `loading.tsx`.

**Missing from the kit — flag:**

- `StarRating` — display-only 1–5 stars (feed, table rows, wall). Trivial; also wanted by 05-crm
  timeline and 11-analytics.
- `AskPreview` — the §3.5 "review ask creative": phone-frame SMS mockup with owner photo + ⭐⭐⭐⭐⭐
  + personalized message. Used in wizard step 2 and the Approval card's expanded view; reusable
  by 06-quotes for message previews.
- `Stepper` — 4-step wizard chrome (numbered steps, back/next). Compose over `tabs` or build thin.
- `FunnelBar` — the horizontal queued → sent → responded → reviewed strip; thin composition over
  `progress`, also wanted by 11-analytics.

## 7. States

- **`coming_soon`** — `GatedState` with the REBRAND §3.4 promise verbatim: *"Sarah texts every
  past customer who never left one. Your first win, day one."* + "Ask Sarah about it."
- **`preview`** (demo default) — full UI on the Apex fixtures, no banner or badge (00 §4).
- **`live`, no import yet** — not empty-empty: the wall shows Google-today (31 · 4.6★) and the
  page says *"First we'll import your customer list — then Sarah asks every past customer who
  never reviewed you. Ask Sarah to start the import."* Links the CRM import (05). Never
  "create your first campaign."
- **`live`, imported, not launched** — *"Your list is in — 214 customers, 187 we can ask. We've
  drafted your campaign — walk through it and launch."* → wizard, pre-filled (§2). "We set it
  up for you," not build-it-yourself.
- **Running** — home + detail as §2; the O'Brien-style awaiting-approval rows carry an
  *"awaiting your OK"* chip that opens the Approval.
- **Paused** — banner on home card + detail: *"Paused — nothing sends until you resume. Queued
  targets and reminders are held."*
- **Completed** — the wall stays up (it's the ROI proof); campaign card flips to a results recap:
  *"187 asked · 21 new reviews · 4.9★."* Ongoing mode carries the module from here.
- **Error** — route `error.tsx` (00 §8); action failures toast and leave state untouched;
  per-target delivery problems surface as `failed` rows, never as page errors.

## 8. Open questions

1. **Approval granularity for the wave.** Per-message approvals × 187 won't scale, but the
   hard-gate is the trust story. Proposal: owner approves the template + the **first day's batch**
   message-by-message; from day 2 Sarah auto-sends within the approved template and posts a daily
   digest (`SarahAction`), with per-message approvals staying on for `ongoing` asks. Batch-approve
   vs. per-message changes the Approval volume, the widget UX, and the engine flow — decide first.
2. **Consent posture for imported customers.** SCOPE §2 requires an affirmative opt-in for every
   SMS; reactivation targets never checked that box. Do we add an explicit consent attestation at
   import time (05) + a documented prior-business-relationship carve-out in `ops/legal.md` before
   the first real campaign? Blocks `real.ts`, not the preview UI.
3. **"Reviewed" detection.** Paste-a-link v1 gives no signal that a target actually reviewed.
   GBP API polling + name-matching vs. manual "mark reviewed" vs. reply-claimed. Changes the
   `ReviewRequest` status machine, and whether the wall's before → after is real or hand-entered.
4. **Ongoing-mode trigger.** Which event fires the post-job ask — schedule job completed (07) or
   invoice paid (08)? And the delay (same evening vs. next morning)? Determines the cross-module
   event contract.
5. **Reminder tuning.** Fixed one-reminder-at-3-days, or owner-configurable copy/timing in the
   wizard? (Contract already carries `reminderAfterDays`; UI exposure is the decision.)


## 9. Reconciliation note (2026-07-12 audit)

**Numbers canon (locked with Levi):** the wall tells the FULL arc — test wave 11 + big wave 21
+ ongoing (Dana) 1 = **+33 new reviews**; Google 20 → 53 as one chain (test 20→31, wave 31→52
— `googleAfter` is wave-only — + Dana = 53). Home's Reputation card (33), Sarah's scripted
review answer, and the SEO fixture's GBP count (53) all agree with the wall now.

**§4 contract — reconciled to `lib/data/reviews/types.ts`:** `completedAt` → `endedAt` ·
`ReviewRequest`'s per-stage timestamps (`remindAt`, `repliedAt`, `replyExcerpt`, …) are
collapsed into one `detail` string + `sentAt`/`rating` (re-expand when the model ships) ·
`ask.ownerPhotoUrl` deferred (AskPreview renders "MR" initials) · wizard-launched campaigns
persist through the `localCampaigns` localStorage seam (stands in for the Campaign row).

**Deferred:** targets-table status + paused-only filters (DataTable's toolbar slot is ready) ·
AskPreview inside the approval card's expanded view · wizard photo upload + reminder-copy
editing (detail's "Edit the ask" edits the main template only) · "[see who]" opted-out list ·
weekly-count spark on the wall · pause-campaign confirm dialog · §7 live-state flows (no-import
/ imported-not-launched page states; the wizard's zero-import hand-off exists) · route
`loading.tsx`/`error.tsx` · the `ReviewsProvider` seam.