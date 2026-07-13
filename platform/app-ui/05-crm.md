# 05 — CRM: every lead and customer, one timeline, your history imported

> Module: `crm` (Win the work). Route: `/crm`, `/crm/[contactId]` (00 §7). Fronts FEATURES.md
> Pillar 4 **CRM (L)** + **Data import (M)** and Pillar 2 **Lead response (✅ live)**. Absorbs
> today's `dashboard/leads` pages. Uses `Contact`, `TimelineEvent`, `SarahAction`, `Approval`
> from 00 §6; **owns `PipelineStage` and `ImportJob`** (00 §6 registry).

## 1. Purpose

The CRM is the single place every person the business talks to lives — **"every lead and
customer, organized and worked automatically"** (REBRAND §3.4), plus **"Your history — bring
your customer list in; Sarah reads it and knows your business day one."** There is no Leads
page: a lead is just a contact at an early pipeline stage, a customer is the same contact later.
The index is the pipeline over one table; the contact detail is the **unified timeline** — the
SMS thread, appointments, quotes, invoices, reviews, escalations, and notes for that person, in
one chronological stream. Import ("Your history") lives here because it's what mints the
customer side of the pipeline — and it's the prerequisite for the Reviews campaign (09), the
day-one ROI. Per FEATURES §5, import → CRM customer entity → reviews/analytics: this screen is
the substrate the growth modules act on.

**Real today vs. mock:** leads, their SMS threads, appointments, and escalations are REAL
(`Lead`/`Conversation`/`Message`/`Appointment`/`Escalation` — the module defaults to `live`,
00 §4). NEW/mock: the `customer` kind, pipeline stages beyond today's `LeadStatus`, import
(`ImportJob`), notes, tags, email, and the quote/invoice/review timeline events (which arrive
with 06/08/09).

## 2. Layout

### Index — `/crm`

```
┌ PageHeader: CRM ──────────────── [Import your history] [Ask Sarah] ┐
│ ◦ Qualifying 3 · Paid 1 · Past customer 214          (stage strip) │
├────────────────────────────────────────────────────────────────────┤
│ [ All 218 ] [ Leads 3 ] [ Customers 215 ] [ Needs follow-up 2 ]    │
│ [🔍 Search name, phone, town…]   [Stage ▾] [Source ▾] [Tag ▾]      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Name              Stage           Source      Last activity    │ │
│ │ Jorge Alvarez ⚠   ● Qualifying    website     Quote sent · 3d  │ │
│ │ Sam & Priya Patel ● Qualifying    missed call Estimate Thu 9a  │ │
│ │ Linda Tran        ● Qualifying    website     Went quiet · 2d  │ │
│ │ Dana Miller       ● Paid          website     ⭐ Review · 2d    │ │
│ │ Mike O'Brien      ● Past customer import      Imported · 5d    │ │
│ │ … (214 more from imp_qb1)                     ‹ 1 2 3 … 11 ›   │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

- **Stage strip** (top): count per `PipelineStage`, empty stages hidden; clicking a chip applies
  the stage filter below. It's a summary strip, not a kanban board (see §8).
- **View tabs**: `All` / `Leads` (`kind: 'lead'`) / `Customers` (`kind: 'customer'`) /
  `Needs follow-up` (derived: open escalation, quiet-lead nudge armed, or an unanswered quote —
  same items Follow-ups (10) is chasing; cross-linked both ways). ⚠ marks an open escalation.
- **DataTable** (00 §8): search (name/phone/town), filters (stage, source, tag), sort (last
  activity default, newest first), pagination. Columns responsive-hide on smaller widths
  (phone → town → source), exactly like today's leads table.
- Row click → `/crm/[contactId]`. Row overflow menu: change stage · edit tags · ask Sarah.

### Contact detail — `/crm/[contactId]` (e.g. `/crm/ct_dana`)

```
┌ ← CRM                                                              ┐
│ Dana Miller  [customer] [● Paid ▾]     tags: roof-replacement +    │
│ (617) 555-0142 · 41 Birch St, Newton · source: website             │
│ [Ask Sarah about Dana]                [You take over  ◯──  soon]   │
├───────────────────────────────────────────────┬────────────────────┤
│ [All][Messages][Appts][Quotes][Invoices]      │ UP NEXT            │
│ [Reviews][Notes][Escalations]  (filter chips) │  Nothing scheduled │
│                                               │                    │
│  ┌ Dana: We have a leak after the storm… ┐    │ MONEY              │
│  └───────────────────────────── 9:14 AM ─┘    │  q_1042 $14,200 ✓  │
│    ┌ Sarah: So sorry to hear that — I can ┐   │  inv_2031 paid ✓   │
│    └ get you an estimate…  ── 9:15 AM ────┘   │                    │
│  ── 📅 Estimate — Tue 10:00 · confirmed ──    │ QUICK FACTS        │
│  ── 📄 Quote q_1042 · $14,200 · accepted ──   │  First seen May 12 │
│  ── 💵 Invoice inv_2031 · $14,200 · paid ──   │  6 messages        │
│  ── ⭐⭐⭐⭐⭐ "Apex was fantastic…" ──          │  1 job · $14,200   │
│  ── 📝 Note (Marcus): referred her sister ──  │                    │
│  [ Add a note… ]                              │                    │
└───────────────────────────────────────────────┴────────────────────┘
```

- **Header**: name, `kind` badge, stage badge (click → stage menu), phone, address, tags
  (inline-editable), source. "Ask Sarah about Dana" opens the widget with this contact as
  context. **"You take over"** — a visible but disabled toggle with a `soon` chip; tooltip:
  *"Soon: pause Sarah and text this customer yourself from here."* (Future; ships with 02's
  engine work, not this pass.)
- **Timeline** (center): the 00 `Timeline` component over `TimelineEvent[]`, chronological,
  oldest → newest, auto-scrolled to latest. `message` events render as **chat bubbles exactly in
  the spirit of today's lead detail** (inbound left/muted, outbound right/primary, sender name +
  time caption); all other event types render as slim centered marker rows with icon + summary +
  deep link (quote → `/quotes/q_1042`, etc.). Filter chips toggle event types.
- **Sidebar** (right): Up next (next confirmed appointment), Money (open/latest quote + invoice,
  from 06/08 mocks), Quick facts (first seen, message count, jobs, lifetime value), open
  escalations if any.
- Not-found or another organization's contact → same 404 (as today's lead detail).

### Import — `/crm/import` ("Your history")

Full-page 4-step wizard (route is this doc's addition under `/crm/*`):
`Upload (CSV / QuickBooks export / Jobber export) → Map columns (our guess pre-filled; fix any
column → field) → Preview (first 10 rows as Contact cards + dedupe summary: "3 match existing
contacts — we'll merge, not duplicate") → Import` (progress: *"Sarah is reading your history…
134 of 214"*). Completion state: **"Sarah read your history — she knows your business now."**
214 customers imported · X merged · Y skipped, with two CTAs: *"See them in your CRM"* and
*"Start your review campaign →"* (09 — this import is its prerequisite). Imported contacts get
`kind: 'customer'`, `stage: 'past_customer'`, `source: 'import'`, tag `quickbooks`.

### Mobile

Index: stage strip scrolls horizontally; tabs stay; DataTable collapses to name + stage + last
activity. Detail: single column — header (facts collapse into a disclosure), then timeline;
sidebar cards stack **below** the timeline; "Add a note" and stage control stay reachable in the
header. Sarah widget launcher stays bottom-right above sticky actions (00 §2).

## 3. Sarah

Sarah **is** most of this screen's content: nearly every timeline event is her work — she
answered Dana in 47 seconds, qualified her, booked the estimate, sent the quote and the invoice
and the review ask. Outbound bubbles are labeled with her name (never "the AI", 00 §9).

- **What she did:** `SarahAction`s with a `contactId` deep-link here (e.g. *"Booked Sam & Priya
  Patel — Thu 9:00"* → `/crm/ct_patel`). The timeline is the per-contact view of that log.
- **Approvals landing here:** `customer_message` (her drafted follow-up for a quiet lead like
  Linda Tran), `review_ask` (Mike O'Brien), and `quote` (Jorge Alvarez) can all arrive as
  approval cards in the widget; on the matching contact's page the card carries a "this contact"
  context chip. Hard-gate: nothing sends without an explicit yes.
- **Widget context:** on `/crm` → `{ module: 'crm' }`; on `/crm/ct_dana` →
  `{ module: 'crm', entityId: 'ct_dana' }` so "quote this job" / "nudge them" needs no names.
- **Suggestion chips** (`MODULES.crm.sarahChips`): index — *"Who needs a follow-up?"*,
  *"What came in this week?"*, *"Import my customer list"*. Detail — *"What's the story here?"*,
  *"Draft a follow-up text"*, *"Book them an estimate"*.
- **Import:** the wizard speaks as her (*"Sarah is reading your history…"*); on completion she
  can proactively suggest the review campaign in the widget thread.
- **You take over** (future): pausing Sarah on one thread and typing as yourself — stubbed
  visibly (disabled toggle) so partners see where it's going.

## 4. Data contract

References 00 §6: `Contact`, `TimelineEvent`, `SarahAction`, `Approval` — never redefined here.
Owned here (registered in 00 §6):

```ts
// The pipeline — a superset uniting today's lead statuses with the customer side.
type PipelineStage =
  // lead side — maps from: Lead.status, 1:1
  | 'new' | 'contacted' | 'qualifying' | 'booked' | 'disqualified' | 'no_response'
  // customer side — maps from: none (new; a contact crosses to kind 'customer'
  // when a job is scheduled or it arrives via import)
  | 'job_scheduled'   // quote accepted, job on the calendar (07)
  | 'job_done'        // work complete, invoice pending (08)
  | 'paid'            // invoice paid — ct_dana lands here
  | 'past_customer'   // history: imported contacts (ct_obrien) or long-settled jobs

// "Your history" — one import batch (imp_qb1 = 214 QuickBooks customers).
interface ImportJob {
  id: string                             // 'imp_qb1'
  source: 'csv' | 'quickbooks' | 'jobber'
  fileName: string                       // 'apex-customers.csv'
  status: 'uploaded' | 'mapping' | 'previewing' | 'running' | 'done' | 'failed'
  mapping: Record<string,               // source column → Contact field
    'name' | 'phone' | 'email' | 'address' | 'town' | 'zip' | 'lastJobAt' | 'note' | 'skip'>
  totals: { rows: number; imported: number; merged: number; skipped: number }
  progress?: number                      // 0..1 while running
  error?: string                         // when failed
  createdAt: string; finishedAt?: string
}                                        // maps from: none (new; worker-backed job)
```

Screen-local read models (not in the shared registry):

```ts
interface ContactQuery {
  view: 'all' | 'leads' | 'customers' | 'needs_followup'
  search?: string
  stage?: PipelineStage; source?: string; tag?: string
  sort?: 'lastActivity' | 'name' | 'createdAt'
  page: number; pageSize: number
}

interface ContactSidebar {
  nextAppointment?: { id: string; startAt: string; status: string }   // maps from: Appointment
  openQuote?: { id: string; totalCents: number; status: string }      // mock until 06
  openInvoice?: { id: string; totalCents: number; status: string }    // mock until 08
  openEscalations: number                                             // maps from: Escalation
  facts: { label: string; value: string }[]  // first seen, messages, jobs, lifetime value
}

interface CrmProvider {
  listContacts(q: ContactQuery): Promise<{
    rows: Contact[]; total: number
    viewCounts: Record<ContactQuery['view'], number>
    stageCounts: Partial<Record<PipelineStage, number>>
  }>
  getContact(id: string): Promise<
    { contact: Contact; timeline: TimelineEvent[]; sidebar: ContactSidebar } | null>
  updateStage(id: string, stage: PipelineStage): Promise<void>
  addNote(id: string, body: string): Promise<void>
  setTags(id: string, tags: string[]): Promise<void>
  createImport(file: File, source: ImportJob['source']): Promise<ImportJob>
  setImportMapping(id: string, mapping: ImportJob['mapping']): Promise<ImportJob> // → preview
  runImport(id: string): Promise<ImportJob>
  getImport(id: string): Promise<ImportJob>                          // polled while running
}
```

`real.ts` (lead side, live today): `Contact` rows from `Lead` (mapping per 00 §6 — `contactName`,
`contactPhone`, `fullAddress`, `serviceTown/Zip`, `status → stage`, `source`); timeline from
`Message` (chat bubbles), `Appointment`, `Escalation`, ordered by timestamp. `lastActivityAt` =
latest of those. Customer-side stages, tags, notes, email, quotes/invoices/reviews, and imports
come from `fixtures/apex.ts` until their backends ship. Demo cast rows: `ct_dana` (customer ·
paid), `ct_alvarez` (lead · qualifying · ⚠ esc_301, quote `q_1043` $1,850 sent 3d), `ct_patel`
(lead · qualifying · estimate Thu 9:00 Newton), `ct_tran` (lead · qualifying · quiet, nudge
armed), `ct_obrien` (customer · past_customer · from `imp_qb1`) + the rest of imp_qb1's 214.

## 5. Actions

| Action | Surface | Mechanism | Sarah's engine? |
|---|---|---|---|
| Change stage | Detail header + row menu | Server action. Real for lead-side stages (writes `Lead.status`); customer-side stages mock-toast until the customer entity ships | No — but emits a `SarahAction` (*"You moved Jorge to booked"*) so the activity log stays whole |
| Add note | Detail (composer under timeline) | Server action → `note` TimelineEvent. Mock until note storage ships | No |
| Edit tags | Detail header + row menu | Server action; mock (tags are new) | No |
| Ask Sarah about this contact | Header button, row menu, chips | Opens widget with `{ module:'crm', entityId }` → api (HMAC-`cid`, owner-agent thread) | **Yes** — full engine; any resulting send is hard-gated |
| Draft follow-up / nudge / quote / review ask | Via widget on the contact | api → engine → `Approval` card | **Yes** — approval-gated sends |
| Upload history file | `/crm/import` step 1 | api call → creates `ImportJob` (worker parses) | No |
| Confirm mapping / run import | Steps 2–4 | api calls advancing `ImportJob.status`; worker imports + merges by phone match; mock: simulated progress over imp_qb1 | No — but completion enqueues a `SarahAction` (*"Read your history — 214 customers"*) and unlocks 09 |
| You take over (toggle) | Detail header | **Stub — disabled**, `soon` chip; no mutation | Future (02 engine work) |
| Approve / edit / decline an approval | Widget card | api (existing hard-gate flow) | **Yes** |

Mock mutations follow 00 §5: mutate nothing, toast success, enqueue a fake `SarahAction` where
natural. All results toast via sonner.

## 6. Components

From 00 §8: `PageHeader` (title, actions: Import + Ask Sarah), `DataTable` (index),
`Timeline` (detail — **this doc is its primary consumer**), `StatusBadge` (stage + kind badges;
extend `lib/dashboard-ui.ts` maps to `PipelineStage`), `EmptyState`, skeletons via `loading.tsx`.
Kit additions already planned in 00 §8 and used here: `tabs` (views), `select` + `popover`
(filters), `dropdown-menu` (row/stage menus), `dialog` (confirm import run), `progress`
(import), `avatar` (contact initials), `sonner`.

**Flagged missing from the kit** (build in `components/app/`, shareable):

- `ChatBubble` — the message-event renderer inside `Timeline`; port of today's lead-detail
  bubbles (inbound muted-left / outbound primary-right, name + time caption). 02 reuses it.
- `TimelineMarker` — the slim centered non-message event row (icon · summary · time · link).
- `StageStrip` — count-per-stage chip row (clickable filters).
- `FilterChips` — toggleable event-type chips on the timeline (09/10 will reuse).
- `TagInput` — inline tag add/remove (popover + command).
- `ImportWizard` — 4-step stepper (Upload → Map → Preview → Run); the mapping table and
  dropzone live inside it. Candidate reuse: any future data-import surface.

## 7. States

- **Gating:** `crm` defaults to `live` (00 §4) — no preview banner. Lead-side data is real;
  customer-side surfaces (import, tags, notes, money cards) run on fixtures behind the same
  provider until their backends ship. In demo mode (`?demo=1`) the full Apex cast + imp_qb1
  renders.
- **Running-with-no-data-yet** (live, fresh partner): *"Sarah's ready. The moment someone texts
  your number, calls and misses you, or fills out your site's form, they'll appear here."* +
  one CTA: *"Bring your history in — Sarah reads it and knows your business day one"* →
  `/crm/import`. Never "Add your first contact."
- **Empty filtered views:** Customers tab with no import yet → the same import CTA. Needs
  follow-up empty → *"Nothing needs you — Sarah's on top of it."* Search/filter no-match →
  plain "No contacts match" + clear-filters.
- **Import states:** per `ImportJob.status` — `running` shows the progress voice (*"Sarah is
  reading your history… 134 of 214"*), safe to navigate away (job continues; index shows a
  slim in-progress banner); `done` shows the completion state (§2) with the 09 cross-link;
  `failed` keeps the uploaded file, shows the row-level error, offers retry from the mapping
  step. Duplicate upload of the same file warns before creating a second job.
- **Error:** `(app)` group `error.tsx` (00 §8); action failures toast with retry; contact
  not-found/foreign → 404.

## 8. Open questions

1. **Where does `PipelineStage` live in the schema?** A new `Contact` table that `Lead` folds
   into (migration), or `PipelineStage` as a read-model overlay on `Lead.status` until the
   customer entity ships? Changes `real.ts`, the import worker, and the 09 campaign's targeting
   query — the single biggest build decision in this doc.
2. **Mixed real + mock on one `live` screen:** for a real partner (not demo mode), do fixture
   customers/imports render at all (badged "demo"), or does the live provider show lead-side
   data only until import ships? Affects provider composition in `index.ts`.
3. **Import merge policy:** phone-number match merges into the existing contact (updating kind
   lead → customer?) vs. flags for manual review. Changes the `ImportJob` contract (`merged`)
   and the worker's write path.
4. **Manual "Add contact":** allowed (walk-in/phone-book cases) or excluded per "we set it up
   for you" (leads arrive via Sarah, customers via import)? Affects index header actions and
   whether `CrmProvider` needs `createContact`.
5. **Customer-side stage ownership:** are `job_scheduled`/`job_done` driven by Schedule (07) and
   Invoices (08) events, or manually set here? Double-entry risk if both.


## 9. Reconciliation note (2026-07-12 audit)

**As built (doc statements superseded):**
- ALL stage/status color comes from the central **`statusChip`** registry (00 §9) — table Stage
  cells, the stage strip, the filter labels, the detail header dropdown, timeline markers, and
  the sidebar's Up-next/Money lines (small pills). The old `StatusBadge`/`stageBadge` layer is
  DELETED; `accepted` (emerald) and `overdue` (red) joined the registry for quote/invoice
  states.
- **"Ask Sarah about {name}" now passes the record**: `openWidget({ entity: c.name })` → the
  composer context chip reads "On: CRM · Dana Miller". The §3 context contract is met at the
  UI level (the api `sendTurn` envelope stays future).
- Timeline quote/invoice markers no longer link to the `/quotes`//`invoices` coming-soon stubs —
  the record lives on this timeline until those modules exist (then restore per-record links).
- Money sidebar: Dana carries Q-1042 accepted + INV-2031 paid (the doc's hero example renders
  now); Sullivan (`ct_imp_0`, INV-2032 overdue) and Delgado (`ct_imp_1`, INV-2033 sent) ground
  Home's "Awaiting payment" numbers with real, clickable records.
- Sarah chips (registry): "Who needs a follow-up?" · "What do you know about this lead?" —
  one set per module, index and detail alike.
- Import wizard exists at `/crm/import` (4 steps, mock run with progress).

**Deferred:** `CrmProvider` abstraction + real `ImportJob` wiring · import hardening
(index banner while running, `failed` state + retry, duplicate-upload warning, 10-row preview)
· `TagInput` (tag add is a prompt; no removal) · row overflow menu · Tag filter + saved
filters + numbered pagination · empty-state "Bring your history in" CTA button (currently
ask-Sarah affordance + prose link).