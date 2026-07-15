# 08 — Invoices: send, track, get paid by text

> Module spec per `../APP_UI_PLAN.md` §4. Builds on `00-foundation.md` (shell, widget, gating,
> data seam, shared types — referenced, never redefined). Fronts **Pillar 3 — Invoicing (L)** in
> `../FEATURES.md`. Sales promise (`../landing-page/REBRAND-PLAN.md` §3.4, verbatim):
> **"Invoicing — Send and track invoices by text."** Pairs with Quotes (`06-quotes.md`) and
> Follow-ups (`10-followups.md`).

## 1. Purpose

The get-paid module. Every invoice Apex Roofing sends lives here: drafted (usually by Sarah, or
converted in one click from an accepted quote), sent to the customer **by text** with a link to a
branded pay page, tracked (sent → viewed → paid, with aging when it goes overdue), and closed out
— in v1 mostly by *marking* paid, because roofing money still arrives as checks and Zelle. The
screen answers the owner's only real question — "who owes me money?" — and makes the marketed
loop literal: quote accepted → "invoice the Miller job" → text with a pay link → paid. Overdue
invoices don't just sit here; Sarah chases them (via Follow-ups), which is what "track" actually
means in the pitch.

**Real today vs. mock:** entirely mock today. There is no `Invoice` model, no send flow, no pay
page, no payments rail — every read comes from `fixtures/apex.ts` through `invoices/mock.ts`, and
every mutation returns success + a toast per the 00 §5 seam. Module status defaults to `preview`
(demo accounts) / `coming_soon` (real partners).

## 2. Layout

> **Competitive pass (Levi, 2026-07-13 — baselined against Jobber / Housecall Pro / QuoteIQ /
> Workiz).** Additions, all mock-seam:
> - **Real creation, visible — on the compose model (Levi 2026-07-13, mirrors 06):** *+ New
>   invoice ▾* → "From an accepted quote" (picker over accepted, un-invoiced quotes) opens the
>   **composer pre-filled** — line items copied, deposit already applied, due date defaulted —
>   you're *confirming*, not composing; "From scratch" opens the same composer empty
>   (`/invoices/new`). Drafts open AS the composer (no Edit toggle, ever); only sent invoices
>   render the read-only detail with Mark-paid/Remind/Void.
> - **Row ⋯ menus** (Open · Resend · Remind · Mark paid · Void) so the index is operable.
> - **Payments, not just paid:** `Invoice.payments[]` (Workiz-style partials — resolves §8 Q5
>   for the UI): a quote's deposit arrives as the first recorded payment; Mark paid records an
>   amount (default = balance) + method; **balance due** renders everywhere, and `paid` derives
>   from balance 0 — not from a single flip.
> - **Structured totals** mirror 06 (subtotal → discount → total; tax still out).

### Index — `/invoices`

```
┌──────────────────────────────────────────────────────────────────────┐
│ Invoices                                      [preview]  [Ask Sarah] │
│                                                                      │
│ ┌ Outstanding ────┐ ┌ Overdue ────────┐ ┌ Paid this month ──┐        │
│ │    $3,380       │ │   $2,400 · 1    │ │     $14,200       │        │
│ └─────────────────┘ └─────────────────┘ └───────────────────┘        │
│                                                                      │
│ [ search… ]  [ status ▾ ]                          [ + New invoice ] │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ #         Customer         Total     Status     Due            ⋯ │ │
│ │ INV-2032  Frank Sullivan   $2,400    overdue    14 days overdue ⋯ │
│ │ INV-2033  Rosa Delgado     $980      viewed     due Jul 22     ⋯ │ │
│ │ INV-2031  Dana Miller      $14,200   paid       paid Jul 2     ⋯ │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

- Summary strip = three `StatCard`s: **Outstanding** (sum of sent + viewed + overdue), **Overdue**
  (sum + count), **Paid this month**. Clicking one filters the table.
- Status filter covers `draft / sent / viewed / paid / overdue / void`. Default sort: overdue
  first (oldest due date), then by `issuedAt` desc. Due column shows aging ("14 days overdue")
  for overdue rows, "due Jul 22" otherwise, "paid Jul 2" when paid.
- Row `⋯` menu: Open · Resend · Remind · Mark paid · Void (items enabled per status).

### Detail — `/invoices/[invoiceId]`

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Invoices   INV-2031 · Dana Miller             [paid]   [Ask Sarah] │
│                                                                      │
│ ┌ Line items ────────────────────────────┐  ┌ Status ─────────────┐  │
│ │ Tear-off + disposal            $2,800  │  │ ● Paid Jul 2        │  │
│ │ Architectural shingles (32 sq) $9,600  │  │   check — recorded  │  │
│ │ Flashing + ridge vent          $1,800  │  │   by Sarah          │  │
│ │ ──────────────────────────────────────│  │ ○ Viewed Jun 18     │  │
│ │ Total                         $14,200  │  │ ○ Sent Jun 18 (SMS) │  │
│ └────────────────────────────────────────┘  │ ○ Created from      │  │
│ ┌ Linked ────────────────────────────────┐  │   quote Q-1042      │  │
│ │ Quote Q-1042 (accepted) →              │  ├─────────────────────┤  │
│ │ Contact: Dana Miller →                 │  │ [Resend]  [Remind]  │  │
│ │ Pay page ↗  /i/[token]                 │  │ [Mark paid] [Void]  │  │
│ └────────────────────────────────────────┘  └─────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

- Line items are read-only once sent; editable while `draft` (same line-item shape and editor as
  quotes — see §6). Status rail = full event history, newest first. Action buttons enable per
  status (e.g. Mark paid hidden once paid; Remind only when unpaid + past `sent`).
- "Linked" card cross-links the source quote (06), the contact's unified timeline (05), and the
  public pay page.

### Customer pay page — `/i/[token]` (public, no auth; 00 §7)

```
┌────────────────────────────────┐
│         ◆ Apex Roofing         │
│   Invoice INV-2031 for Dana    │
│                                │
│  Tear-off + disposal    $2,800 │
│  Arch. shingles (32sq)  $9,600 │
│  Flashing + ridge vent  $1,800 │
│  ────────────────────────────  │
│  Total due             $14,200 │
│  Due July 2                    │
│                                │
│  ┌──────────────────────────┐  │
│  │      [ Pay $14,200 ]     │  │ ← rail placeholder (§8 Q2)
│  └──────────────────────────┘  │
│  How to pay: check or Zelle —  │
│  instructions from Apex here.  │
│                                │
│  Questions? Text (617) 555-0119│
└────────────────────────────────┘
```

- Branded with the organization's name/logo, mobile-first (it opens from a text). Loading the
  page records a view (flips `sent → viewed`). Paid state replaces the pay block with a green
  "Paid — thank you" banner; void/unknown token shows "This invoice link is no longer active."
- The pay button is a placeholder until a rail is chosen (§8); v1 ships instructions-only
  (check/Zelle copy from Settings) and the owner marks paid in the app or by texting Sarah.

### Mobile

Index: summary strip becomes a horizontal scroll of `StatCard`s; `DataTable` hides Due behind
responsive column hiding (aging folds into the status badge line). Detail: single column — line
items, then Linked, then the status rail; actions in a sticky bottom bar. Sarah launcher stays
bottom-right above it (00 §2). Pay page is already single-column.

## 3. Sarah

- **What she did (visible here + in her activity log):** "Sent INV-2033 to Rosa Delgado ·
  $980" · "Marked INV-2031 paid — Marcus texted that the Millers dropped off a check" ·
  "Reminded Frank Sullivan about INV-2032 (14 days overdue)". Each is a `SarahAction`
  (`module: 'invoices'`, deep link `href` to the invoice).
- **The flagship ask:** owner texts (or types in the widget) **"invoice the Miller job"** →
  Sarah finds accepted quote `q_1042`, drafts `inv_2031` with its line items, and raises a
  hard-gate approval card: summary "Invoice → Dana Miller · $14,200", preview = the exact SMS
  with the `/i/[token]` link. On yes, code sends. **Gap: `Approval.kind` (00 §6) has no
  `'invoice'` value** — this spec needs one; flagged in §8, not redefined here.
- **Chasing:** overdue invoices become chase items in Follow-ups (10-followups owns the rules
  and cadence). Sarah drafts each reminder text; every reminder is hard-gated as an approval
  before it reaches the customer. "Remind" on this screen is a shortcut into that same flow.
- **Recording money:** "Frank paid by check" → Sarah marks INV-2032 paid (method: check) — a
  state change, not a customer send, so no approval needed; it's logged as a `SarahAction`.
- **Page context (00 §3):** on `/invoices/inv_2032` the widget sends
  `{ module: 'invoices', entityId: 'inv_2032' }`, so "remind him" and "he paid cash" need no
  names.
- **Suggestion chips** (`MODULES['invoices'].sarahChips`): "Invoice the Miller job" · "Who owes
  me money?" · "Chase everyone overdue".
- **Approval cards from this module:** invoice sends (needs the new kind) and overdue-reminder
  texts (`kind: 'customer_message'` today, unless §8 Q1 adds a dedicated kind).

## 4. Data contract

Owned here: **`Invoice`** (per 00 §6 registry) plus its sub-shapes below. `Quote` /
`QuoteLineItem` are owned by `06-quotes.md` and referenced by name; `Contact`, `TimelineEvent`,
`SarahAction`, `Approval` come from 00 §6.

```ts
type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'void'
// 'overdue' is derived at read time (unpaid, unvoided, dueAt < now) — see §8 Q3.

interface Invoice {
  id: string                       // 'inv_2031'
  organizationId: string
  contactId: string                // → Contact (00 §6)
  number: string                   // 'INV-2031' — human-facing, per-org sequence (§8 Q5)
  status: InvoiceStatus
  lineItems: QuoteLineItem[]       // shape owned by 06-quotes §4 — conversion copies them 1:1
  subtotalCents: number            // Σ line items (2026-07-13)
  discountCents?: number           // carried from the quote (2026-07-13)
  total: number                    // integer cents (14200_00); subtotal − discount (tax: §8 Q4)
  payments: Array<{                // recorded money (2026-07-13; resolves §8 Q5 for the UI):
    at: string                     //   deposit-on-acceptance arrives as the first entry;
    amountCents: number            //   balance due = total − Σ payments; 'paid' derives from
    method: 'deposit' | 'check' | 'cash' | 'zelle' | 'card' | 'other'
    note?: string                  //   balance 0, never a bare status flip
  }>
  quoteId?: string                 // set when converted from an accepted Quote (06)
  token: string                    // public pay-page token → /i/[token]
  payInstructions?: string         // v1 rail: "check or Zelle" copy shown on the pay page
  issuedAt?: string                // ISO, org timezone rendering per 00 §9; set on send
  dueAt?: string                   // default net-14 from issuedAt
  paidAt?: string
  paidMethod?: 'check' | 'cash' | 'zelle' | 'card' | 'other'
  history: InvoiceEvent[]          // the status rail, newest last
  createdAt: string
}                                  // maps from: none (new Prisma model)

interface InvoiceEvent {
  at: string
  type: 'created' | 'converted' | 'sent' | 'viewed' | 'reminder' | 'paid' | 'voided'
  via?: 'sms' | 'app'              // who/where: 'Sent Jun 18 (SMS)'
  note?: string                    // 'check — recorded by Sarah'
}

interface InvoiceSummary {         // the index strip; all integer cents
  outstanding: number              // sent + viewed + overdue
  overdue: number
  overdueCount: number
  paidThisMonth: number
}

interface PublicInvoice {          // the /i/[token] read model — no internal ids beyond number
  businessName: string; businessPhone: string
  invoiceNumber: string; contactFirstName: string
  lineItems: QuoteLineItem[]; total: number; dueAt?: string
  state: 'open' | 'paid' | 'void'
  payInstructions?: string
}

interface InvoicesProvider {       // 00 §5 seam: invoices/{types,provider,mock,real}.ts
  list(): Promise<{ invoices: Invoice[]; summary: InvoiceSummary }>
  get(id: string): Promise<{ invoice: Invoice; contact: Contact; quote?: Quote } | null>
  getPublic(token: string): Promise<PublicInvoice | null>       // anon, token-scoped
  createDraft(input: { contactId: string; lineItems: QuoteLineItem[]; dueAt?: string;
    quoteId?: string }): Promise<Invoice>
  updateDraft(id: string, patch: Partial<Pick<Invoice, 'lineItems' | 'dueAt'>>): Promise<Invoice>
  send(id: string): Promise<Invoice>
  resend(id: string): Promise<Invoice>
  remind(id: string): Promise<void>                             // → Follow-ups chase (10)
  markPaid(id: string, input: { method: Invoice['paidMethod']; note?: string }): Promise<Invoice>
  voidInvoice(id: string): Promise<Invoice>
  recordView(token: string): Promise<void>                      // pay-page beacon
}
```

**Fixtures (`fixtures/apex.ts`):** `inv_2031` — Dana Miller (`ct_dana`), $14,200, **paid** Jul 2
by check, converted from `q_1042`, sent/viewed Jun 18. `inv_2032` — **Frank Sullivan**
(`ct_sullivan`, imported repeat customer from batch `imp_qb1`), gutter replacement, $2,400,
issued Jun 12, due Jun 26 → **14 days overdue**, one reminder sent. `inv_2033` — **Rosa Delgado**
(`ct_delgado`, also from `imp_qb1`), chimney flashing repair, $980, sent + viewed Jul 8, due
Jul 22. `ct_sullivan` and `ct_delgado` are new cast additions this doc introduces to
`fixtures/apex.ts` (consistent with the 214-customer import story in 00 §5).

## 5. Actions

| Action | Surface | Mechanism | Sarah engine? |
|---|---|---|---|
| New invoice (blank draft) | index `+ New invoice` | server action | no |
| **Convert quote → invoice** | accepted quote detail (06) "Create invoice"; also `+ New invoice → From a quote` here | server action — copies `lineItems` from the `Quote` verbatim, sets `quoteId` | no |
| Edit draft (line items, due date) | detail, `draft` only | server action | no |
| **Send by text** | detail / draft banner | api call (HMAC-`cid`, per 00 §5) — Twilio SMS with the `/i/[token]` link; sets `issuedAt`, `dueAt` | yes — sends through the messaging pipeline; owner clicking Send **is** the explicit yes, no approval card |
| Resend | detail / row menu | api call — re-sends the same SMS | yes |
| **Remind** | detail / row menu | api call — creates/boosts a chase item in Follow-ups (10); Sarah drafts the reminder → hard-gate approval → send | yes |
| **Mark paid** | detail / row menu → dialog (method: check/cash/Zelle/card/other + note) | server action; sets `paidAt`/`paidMethod` | no (but Sarah can do it from a text — §3) |
| Void | detail / row menu → confirm dialog | server action; deactivates the pay-page token | no |
| Pay-page view | `/i/[token]` load | public route handler → `recordView`; `sent → viewed` | no |
| Collect payment | pay page button | **not built** — rail undecided (§8 Q2) | — |

Every status transition appends an `InvoiceEvent` and emits a `TimelineEvent`
(`type: 'invoice'`, per 00 §6) onto the contact's CRM timeline (05); Sarah-initiated ones also
emit a `SarahAction`. Mock mutations follow 00 §5: mutate nothing, return success + toast, and
enqueue a fake `SarahAction` where natural (send, remind, mark paid).

## 6. Components

- From 00 §8: `PageHeader` (title, `+ New invoice` action), `DataTable`
  (search, status filter, responsive hiding, empty-state slot), `StatCard` ×3, `StatusBadge`
  (extend the map with the six invoice statuses — overdue red, paid green, viewed blue, draft
  gray, void muted), `Timeline` on the linked contact page, `EmptyState` / `GatedState`,
  `dialog` (mark paid, void confirm), `dropdown-menu` (row actions), sonner toasts,
  `loading.tsx` skeletons.
- **Missing from the kit — flag for shared build:**
  - `LineItemsTable` / `LineItemEditor` — render/edit `QuoteLineItem[]` with a money footer.
    Needed identically by 06-quotes; build once (06 is the natural owner), reuse here.
  - `PublicDocLayout` — the minimal no-shell branded page (logo, business name, card, footer)
    shared by `/q/[token]` (06) and `/i/[token]`. Lives outside the `(app)` route group (00 §7).
  - `MoneyInput` — integer-cents input formatted as `$14,200` (00 §9 money convention).

## 7. States

- **`preview`** (today's default for demo accounts): full UI on the Apex fixtures, no banner
  or badge (00 §4).
- **`coming_soon`** (real partners until this ships): `GatedState` teaser with the REBRAND §3.4
  promise verbatim — **"Invoicing — Send and track invoices by text."** — plus "Ask Sarah about
  it" (opens the widget). Never a broken or empty screen.
- **Live, no data yet:** *"We're setting up invoicing for you. When a job wraps, tell Sarah to
  invoice it — or turn any accepted quote into an invoice in one click."* One `EmptyState`, Ask
  Sarah action. Never "Create your first invoice."
- **Error:** `(app)` group `error.tsx`; all action results toast success/failure (00 §8).
- **Pay page states:** open (line items + pay block) · paid ("Paid — thank you") · void/unknown
  token ("This invoice link is no longer active" — same layout, no data leaked). The public
  route never reveals whether a token existed.

## 8. Open questions

1. **`Approval.kind` `'invoice'`** — *resolved: 00 §6 now includes it.* Still open: do overdue
   reminders ride `'customer_message'`, or warrant their own kind for the approvals UI?
2. **Payments rail:** Stripe vs. QuickBooks vs. none-for-v1. Recommendation: ship v1 as
   mark-paid-only with check/Zelle instructions on the pay page (matches how partners actually
   get paid today); pick the rail when a design partner pulls for card payments. The pay button
   placeholder and `paidMethod: 'card'` keep the seam open.
3. **Overdue mechanics:** purely read-time derived (cheap, but nothing "happens" at due date) or
   a worker job that stamps it and triggers the Follow-ups chase automatically? Interacts with
   10-followups' rules — decide there together.
4. **Tax:** none in v1 (labor is commonly untaxed for these trades, varies by state) vs. an
   invoice-level tax line. Affects `Invoice.total` composition and the pay page.
5. ~~**Deposits / partial payments**~~ — *resolved for the UI (2026-07-13): `payments[]` is
   modeled now (deposit + partials + balance due); the payments RAIL stays post-decision (Q2).*
