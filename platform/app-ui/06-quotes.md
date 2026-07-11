# 06 — Quotes: draft, send, track, accept

> Module spec per `../APP_UI_PLAN.md` §4. Builds on `00-foundation.md` (shell, widget, gating,
> data seam, shared types — referenced, never redefined). Fronts **FEATURES.md Pillar 2 → Quotes
> (L)**. Sales promise made literal: REBRAND-PLAN §3.4 — *"Draft and send quotes by text.
> → 'Quote the Miller job.'"* — and the §3.3 Mode A exchange this module IS the screen for.

## 1. Purpose

Quotes is where the owner drafts, sends, tracks, and closes quotes — including (headline) the
ones Sarah drafted from a single text: *"Generate a quote for the Miller roof — full replacement,
architectural shingles."* → *"Done ✅ $14,200 quote drafted and texted to the Millers to
approve."* The index is the pipeline (draft → sent → viewed → accepted / declined / expired) with
the money outstanding at a glance; the detail page is one quote's line items, status history, and
customer link; and `/q/[token]` is the customer-facing accept page the lead opens from a text.
Every quote event also lands on the contact's CRM timeline (`TimelineEvent` type `'quote'`,
owned by 00 §6, rendered by 05).

**Real today vs. mock:** entirely mock. There is no `Quote` table in Prisma, no quote tools in
Sarah's engine, no `/q` route — the whole module ships on the mock seam (`quotes/mock.ts` over
`fixtures/apex.ts`) until the Quotes development plan (FEATURES Pillar 2, size L) is built. One
rule shapes everything here: per SCOPE, **Sarah NEVER quotes a price to a lead on her own** —
if a customer asks "how much," she redirects to booking the on-site estimate. Quotes exist only
as **owner-initiated, owner-approved** artifacts: the owner asks for (or writes) the quote, it
lands as an `Approval` of kind `'quote'`, and code texts the customer only on the owner's
explicit yes. That's why the hard-gate isn't UI polish — it's the compliance boundary that lets
a price ever reach a customer.

## 2. Layout

### Index — `/quotes`

```
┌ PageHeader: Quotes · [preview]              [Ask Sarah]  [New quote ▾] ┐
│                                              ├ Ask Sarah to draft      │
│                                              └ Write it yourself       │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌ Draft ┐ ┌ Sent ┐ ┌ Viewed ┐ ┌ Accepted ┐ ┌ Declined ┐ ┌ Outstanding ┐│
│ │   1   │ │  1   │ │   0    │ │    1     │ │    1     │ │   $1,850    ││ ← status strip
│ └───────┘ └──────┘ └────────┘ └──────────┘ └──────────┘ └─────────────┘│   (click = filter)
├─────────────────────────────────────────────────────────────────────────┤
│ DataTable                                    [search…] [status ▾]      │
│  Quote            Contact          Status     Total     Age            │
│  Q-1043 Leak rpr  Jorge Alvarez    ● sent     $1,850    3d  ⚑ chasing  │ → /quotes/q_1043
│  Q-1042 Roof rpl  Dana Miller      ● accepted $14,200   12d            │ → /quotes/q_1042
│  Q-1039 Gutters   T. Chen          ● declined $3,400    3w             │
│  …                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

- Contact cell links to `/crm/[contactId]`; the ⚑ *chasing* chip appears when Follow-ups (10)
  has an active `ChaseItem` for the quote and links to `/followups`.
- Age = time since last status change, in the organization's timezone.

### Quote detail — `/quotes/[quoteId]` (Q-1042 shown)

```
┌ PageHeader: Q-1042 · Roof replacement — Dana Miller · ● accepted        ┐
│                  [Resend] [Edit] [Duplicate] [Convert to invoice] [⋯ ▾] │
├───────────────────────────────────────────────┬─────────────────────────┤
│  Line items                                   │  Status history         │
│  Description                Qty  Unit   Total │  ● Drafted by Sarah     │
│  Tear-off & disposal        28   $85   $2,380 │    Jun 27, 4:02 PM      │
│  Architectural shingles,    28   $335  $9,380 │  ● Approved by you      │
│    CertainTeed Landmark                       │    Jun 27, 4:11 PM      │
│  Ice & water shield +        1   $940    $940 │  ● Sent by text         │
│    synthetic underlayment                     │    Jun 27, 4:11 PM      │
│  Flashing, drip edge,        1  $1,500 $1,500 │  ● Viewed               │
│    ridge vent                                 │    Jun 27, 6:48 PM      │
│  ───────────────────────────────────────────  │  ● Accepted ✓           │
│                              Total    $14,200 │    Jun 28, 9:15 AM      │
│                                               ├─────────────────────────┤
│  Notes & terms                                │  Customer link          │
│  30% deposit on acceptance. Price valid       │  leadanswered.com/q/…   │
│  30 days. Includes permit + cleanup.          │  [Copy link]            │
│                                               ├─────────────────────────┤
│                                               │  Dana Miller            │
│                                               │  (617) 555-0184         │
│                                               │  → View in CRM          │
└───────────────────────────────────────────────┴─────────────────────────┘
```

- `draft` status swaps the actions row for **[Send by text] [Edit] [Delete draft]** and the line
  items render in the inline editor (see §6 `LineItemsEditor`). A Sarah-drafted quote still
  pending approval shows its `Approval` card at the top of the page (approve/edit/decline here
  = same card as the widget).
- `[⋯ ▾]` menu: Mark accepted · Mark declined (for "they said yes on the phone") · Delete draft.

### Customer accept page — `/q/[token]` (PUBLIC, no auth — 00 §7; mobile-first, opened from a text)

```
┌──────────────────────────────┐
│        ◆ Apex Roofing        │
│                              │
│  Quote for Dana Miller       │
│  Roof replacement —          │
│  14 Maple St                 │
│                              │
│  Tear-off & disposal  $2,380 │
│  Architectural        $9,380 │
│    shingles (28 sq)          │
│  Underlayment           $940 │
│  Flashing & ridge     $1,500 │
│  ──────────────────────────  │
│  Total              $14,200  │
│                              │
│  30% deposit on acceptance.  │
│  Price valid 30 days.        │
│                              │
│  ┌──────────────────────────┐│
│  │   Accept this quote  ✓   ││
│  └──────────────────────────┘│
│  [ 💬 Text us with questions ]│  ← sms: link to Apex's number
│                              │
│  Sent via Lead Answered      │
└──────────────────────────────┘
```

- Single column at every width; big tap targets; the org's name/logo + brand color, no app
  chrome, no sign-in. Accept → confirmation state: *"You're all set — Marcus will text you to
  schedule."* Expired → total hidden behind *"This quote has expired — text us for an updated
  price."* Already-accepted revisits show the confirmation state, not a second Accept button.
- "Text us with questions" opens the customer's SMS app to the organization's number — Sarah
  answers, and per the SCOPE rule she never negotiates or restates pricing on her own; quote
  questions escalate to the owner.

### Mobile (the app pages)

```
┌ Quotes            [＋ ▾] ┐   ┌ Q-1043 · ● sent        ┐
│ ◖ strip scrolls → ◗      │   │ Jorge Alvarez · $1,850 │
│ ┌──────────────────────┐ │   │ [Send by text / Resend]│ ← sticky action bar
│ │Q-1043 Jorge Alvarez  │ │   │ line items (stacked)   │
│ │● sent · $1,850 · 3d ⚑│ │   │ notes & terms          │
│ └──────────────────────┘ │   │ status history         │
│ ┌──────────────────────┐ │   │ customer link [Copy]   │
│ │Q-1042 Dana Miller    │ │   │ contact card           │
│ │● accepted · $14,200  │ │   └────────────────────────┘
│ └──────────────────────┘ │     widget launcher stays
└──────────────────────────┘     bottom-right, above bar
```

DataTable collapses to cards (responsive column hiding per 00 §8); detail columns stack with a
sticky primary-action bar; the status strip becomes a horizontal scroller.

## 3. Sarah

Sarah is the headline compose path; the manual editor is the fallback.

- **The Mode A flow (REBRAND §3.3), end to end:** owner describes the job — by SMS, in the
  widget, or on `/sarah` — *"Generate a quote for the Miller roof — full replacement,
  architectural shingles."* Sarah's engine drafts the quote (line items + total from the
  description, the contact record, and prior quotes), saves it as a `Quote` with
  `status: 'draft'`, `source: 'sarah'`, and raises an **`Approval` of kind `'quote'`** (00 §6):
  summary *"Quote → Dana Miller — $14,200 roof replacement"*, preview = line-item summary +
  deep link to the draft. The owner approves on the card (widget / `/sarah` / this page) or by
  texting yes — only then does **code** text the customer the `/q/[token]` link. Sarah phrases
  the confirmation: *"Done ✅ $14,200 quote drafted and texted to the Millers to approve."*
- **What she did (SarahAction rows, `module: 'quotes'`):** "Drafted Q-1042 for Dana Miller —
  $14,200" · "Texted the quote link to Dana Miller" · "Dana Miller viewed her quote" · "Dana
  Miller accepted — $14,200 ✓" (this one also notifies the owner by SMS).
- **What she's chasing:** q_1043 (Alvarez, sent 3 days, unviewed) is Follow-ups' job (10) —
  the chase nudge is a `customer_message` approval owned there; this module just shows the
  ⚑ chip and the eventual `resent` history entry.
- **Page context (00 §3):** on `/quotes/q_1043` the widget sends
  `{ module: 'quotes', entityId: 'q_1043' }`, so "resend it" and "knock $100 off" need no names.
  Edits she makes to a draft re-raise the approval — an edited price never goes out un-approved.
- **Suggestion chips** (`MODULES['quotes'].sarahChips`): *"Draft a quote"* · *"What's still
  unanswered?"* · *"Resend the Alvarez quote"*.
- **The boundary, restated:** customer-side, Sarah never volunteers a price or discusses one —
  price questions get the book-an-estimate redirect (SCOPE hard rule). Owner-side, she drafts
  freely, but nothing reaches a customer without the hard-gate yes.

## 4. Data contract

Owned here per 00 §6 registry: **`Quote`**, **`QuoteLineItem`**. Money is integer cents in every
contract, formatted `$14,200` in UI (00 §9). Lives in `data/quotes/types.ts`.

```ts
type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired'

interface QuoteLineItem {
  id: string
  description: string              // "Architectural shingles — CertainTeed Landmark"
  quantity: number                 // decimals allowed (28 squares, 1.5 hrs)
  unitPriceCents: number
  totalCents: number               // quantity × unitPriceCents, denormalized
}

interface Quote {
  id: string                       // 'q_1042'
  number: string                   // display: 'Q-1042'
  contactId: string                // → Contact (00 §6)
  title: string                    // "Roof replacement — 14 Maple St"
  lineItems: QuoteLineItem[]
  totalCents: number               // 1_420_000 → "$14,200"
  notes?: string                   // terms, deposit, exclusions — free text in v1
  status: QuoteStatus
  source: 'sarah' | 'manual'
  approvalId?: string              // the Approval (kind 'quote') that gated the send
  token: string                    // public accept-page token → /q/[token]
  history: Array<{                 // status rail, oldest → newest
    at: string                     // ISO
    event: 'drafted' | 'approved' | 'sent' | 'resent' | 'viewed'
         | 'accepted' | 'declined' | 'expired' | 'edited'
    actor: 'sarah' | 'owner' | 'customer' | 'system'
  }>
  sentAt?: string; viewedAt?: string; respondedAt?: string   // denormalized from history
  expiresAt?: string               // default sentAt + 30 days
  invoiceId?: string               // set by convert-to-invoice → Invoice (08)
  createdAt: string; updatedAt: string
}

interface QuoteSummary {           // the index status strip
  counts: Record<QuoteStatus, number>
  outstandingCents: number         // Σ totals where status ∈ {sent, viewed}
}

interface PublicQuote {            // the /q/[token] read model — no ids, no auth
  businessName: string; businessPhone: string   // the org's Sarah number
  contactFirstName: string
  title: string
  lineItems: Array<Pick<QuoteLineItem, 'description' | 'quantity' | 'totalCents'>>
  totalCents: number
  notes?: string
  status: Extract<QuoteStatus, 'sent' | 'viewed' | 'accepted' | 'expired'>
  expiresAt?: string
}

interface QuotesProvider {
  list(): Promise<Array<Quote & { contactName: string }>>
  get(quoteId: string): Promise<Quote & { contact: Contact }>
  summary(): Promise<QuoteSummary>
  create(input: Pick<Quote, 'contactId' | 'title'>): Promise<Quote>   // empty draft
  update(quoteId: string, patch: Partial<Pick<Quote, 'title' | 'lineItems' | 'notes' | 'expiresAt'>>): Promise<Quote>
  send(quoteId: string): Promise<Quote>       // the hard-gated text-the-link
  resend(quoteId: string): Promise<Quote>
  duplicate(quoteId: string): Promise<Quote>  // new draft, same line items
  markStatus(quoteId: string, status: 'accepted' | 'declined'): Promise<Quote>
  convertToInvoice(quoteId: string): Promise<{ invoiceId: string }>   // Invoice owned by 08
  deleteDraft(quoteId: string): Promise<void>
  getPublic(token: string): Promise<PublicQuote>      // public seam — also records 'viewed'
  acceptPublic(token: string): Promise<PublicQuote>
}
```

**Fixtures (`fixtures/apex.ts`):** `q_1042` — Dana Miller, roof replacement, four line items
totalling **$14,200**, `source: 'sarah'`, full history drafted → approved → sent → viewed →
accepted, `invoiceId: 'inv_2031'` (the flagship arc, 00 §5). `q_1043` — Jorge Alvarez, leak
repair, two line items totalling **$1,850**, `status: 'sent'` 3 days ago, never viewed —
Follow-ups is chasing it (10). Plus 2–3 background rows (e.g. `q_1039` T. Chen gutters $3,400
declined; one older expired) so every strip status is non-zero-ish and the table has depth.
Each quote also contributes `TimelineEvent`s of type `'quote'` to its contact's timeline.

## 5. Actions

| Action | Where | Kind | Sarah's engine? |
|---|---|---|---|
| New quote → *Write it yourself* | index header | server action `create` → redirect to detail in edit mode | no |
| New quote → *Ask Sarah to draft* | index header | opens the widget pre-focused with a draft prompt | yes — owner-agent tool `draft_quote` creates the draft + `Approval` kind `'quote'` |
| Edit draft (line items, notes, expiry) | detail | server action `update`; totals recomputed server-side | no; if Sarah edits, the approval re-raises |
| Approve / decline a Sarah draft | approval card (widget, `/sarah`, detail) | api call — the shared Approval resolution (02) | yes — approval resolution triggers `send` |
| Send by text / Resend | detail, table row menu | **api call** — the api texts the `/q/[token]` link from the org's number; hard-gate: fires only from an explicit owner action or approval | no (deterministic send) |
| Duplicate | detail ⋯ menu | server action → new draft, opens it | no |
| Mark accepted / declined manually | detail ⋯ menu | server action (confirm dialog) — "they answered by phone" | no; emits SarahAction + timeline event |
| Convert to invoice | detail (accepted only) | server action → creates draft `Invoice` (08), sets `invoiceId`, navigates to `/invoices/[id]` | no |
| Delete draft | detail ⋯ menu | server action (drafts only; sent quotes are immutable history) | no |
| Customer accepts | `/q/[token]` | public server action `acceptPublic` — token-authenticated, idempotent; sets `accepted`, notifies the owner via Sarah SMS + SarahAction, stops the Follow-ups chase (10), emits timeline event | no |
| View tracking | `/q/[token]` first open | side effect of `getPublic`: `sent → viewed`, history entry, timeline event | no |
| Expiry | worker job at `expiresAt` | flips to `expired`; Follow-ups may nudge *before* expiry, never after | no |

Mock providers per 00 §5: mutations mutate nothing — success + sonner toast, and `send`/
`acceptPublic` enqueue a fake `SarahAction` so the demo feels alive.

## 6. Components

- **Shared (00 §8):** `PageHeader` (preview badge, Ask Sarah, actions slot), `DataTable`
  (index), `StatusBadge` — extend the status map with the six `QuoteStatus` values,
  `EmptyState` / `GatedState`, `Timeline` (quote events on the CRM contact page — rendered by
  05, typed by 00), sonner toasts, `skeleton` via `loading.tsx`.
- **Kit additions already planned in 00 §8 used here:** `dialog` (confirm send / mark
  accepted-declined), `dropdown-menu` (New quote ▾, row + ⋯ menus), `select` (status filter),
  `avatar` (contact card).
- **Missing from the kit — flag:**
  - `LineItemsEditor` — inline rows (description, qty, unit price) with add/remove/reorder and
    live cents-safe totals. New; also wanted by 08-invoices — build it shared.
  - `StatusStrip` — the clickable count-per-status + outstanding-$ row. `StatCard` is close but
    this is a filter control, not a stat; small new component.
  - `QuoteStatusHistory` — the vertical dot rail on detail. Trivial; could be a `Timeline`
    variant.
  - `/q/[token]` page shell — a minimal public layout (org branding, no sidebar/widget), shared
    with `/i/[token]` (08). Lives outside the `(app)` route group per 00 §7.

## 7. States

- **Gated:** `quotes` defaults to `preview` for demo accounts, `coming_soon` for real partners
  (00 §4). Preview = full UI on the fixtures above + the standard amber banner. Coming-soon =
  `GatedState` with the REBRAND §3.4 promise verbatim: *"Draft and send quotes by text. →
  'Quote the Miller job.'"* + Ask Sarah.
- **Live, no data yet:** never "Create your first quote." `EmptyState`: *"Sarah's ready to
  draft your first quote — describe the job to her, or write one yourself."* with **Ask Sarah**
  (opens the widget pre-filled with the draft prompt) and a quiet *Write it yourself* secondary.
- **Public page states (`/q/[token]`):** live (Accept + text-us) · already-accepted
  (confirmation, no button) · expired (total hidden, "text us for an updated price") · invalid
  or revoked token → a branded not-found: *"This quote link isn't active — text us and we'll
  send a fresh one."* Never a raw 404, never the app's sign-in.
- **Errors:** `(app)` group `error.tsx`; every action toasts success *and* failure; a failed
  `send` leaves the quote in its prior status with a retry toast (send must be idempotent —
  double-taps must not double-text the customer).

## 8. Open questions

1. **Accept semantics:** is Accept a soft go-ahead (status flip + owner notified + "Marcus will
   text you") or do we need signature/initial capture (lightweight e-sign) for v1? Changes the
   public page and the data model.
2. **Decline on the public page:** Accept-only (declines arrive by text, owner marks manually)
   vs. an explicit Decline button + reason. Affects `PublicQuote`, Follow-ups' stop conditions,
   and the decline analytics in 11.
3. **Tax:** free-text in `notes` for v1 (flat-quoting trades), or a structured
   `taxCents`/org tax-rate now? Retrofitting tax onto sent-quote history is ugly — decide before
   the Prisma model.
4. **Deposit / payment schedule:** plain notes text v1, or a structured field that
   convert-to-invoice (08) can turn into a deposit invoice automatically?
5. **Quote numbering:** per-org sequential (`Q-1042`) needs a counter and collision care —
   worth it v1, or are ids enough until invoicing demands clean numbering?
6. **Public-page branding:** "Sent via Lead Answered" footer on every quote, or white-label per
   org (design partners may care)? Small UI, real positioning decision.
