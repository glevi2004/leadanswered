# 00 — Foundation: app shell, Sarah widget, gating, data seam, shared types

> The base layer every module spec (01–13) builds on. Module docs reference — never redefine —
> what's here. Companion: `../APP_UI_PLAN.md` (page map + template), `../FEATURES.md`,
> `../landing-page/REBRAND-PLAN.md` (product truths: "app" never "dashboard"; "we set it up for
> you"; open-ended module lists).

## 1. Purpose

Give the app one shell, one navigation model, one way to gate unbuilt modules, one typed data
seam (mock ↔ real), one shared vocabulary of types, and one global Sarah surface — so thirteen
module screens can be built in parallel without inventing their own conventions.

**Real today vs. mock:** the shell/sidebar exists (`apps/web/src/components/AppSidebar.tsx`) but
with flat nav and `/dashboard/*` routes; everything else in this doc (widget, gating, seam,
registry, patterns) is new.

## 2. App shell & navigation

```
┌────────────┬──────────────────────────────────────────────────┐
│ ◆ Apex     │  {PageHeader: title · actions}                   │
│   Roofing  │                                                  │
│            │                                                  │
│ Home       │                                                  │
│ Sarah  (3) │                 page content                     │
│            │                                                  │
│ CRM        │                                                  │
│ Schedule   │                                                  │
│ Quotes     │                                                  │
│ Invoices   │                                                  │
│ Follow-ups │                                                  │
│            │                                                  │
│ Website    │                                                  │
│ Content    │                                                  │
│ Reviews    │                                          ┌───┐   │
│            │                                          │ ✦ │◄──┼─ Sarah widget
│ Analytics  │                                          └───┘   │   launcher
│ Team       │                                                  │
│ ────────── │                                                  │
│ Settings   │                                                  │
│ ⏻ Sign out │                                                  │
└────────────┴──────────────────────────────────────────────────┘
```

- **Quo-style frame** (Levi, 2026-07-11): the shadcn sidebar's **inset variant** — the rail sits
  naked on the shell background (no border/card), and every page lives in a **rounded frame**
  (`SidebarInset`: `rounded-2xl` + border + shadow, `m-2`, fixed to the viewport on desktop with
  content scrolling INSIDE the frame). Shell background: soft gray light / near-black dark. RULE:
  `--sidebar` and `--sidebar-accent` (the menu hover/active pill) always move TOGETHER — changing
  the rail color alone makes hovers invisible (happened 2026-07-11).
- **Collapse to an icon rail** (Levi 2026-07-13, Apollo-style): a **«** button next to the
  company name collapses the sidebar to icons-only (tooltips carry the labels; **»** expands;
  ⌘B toggles; state persists via the kit's `sidebar_state` cookie). When expanded it's **drag-resizable**
  (`SidebarResizer`: handle on the rail edge, 192–336px clamp, live via `--sidebar-width`,
  persisted in the `sidebar_width` cookie, double-click resets). Mobile keeps the Sheet drawer +
  its trigger (only way to open it).
- **Unlabeled clusters** — `SidebarGroup`s with NO `SidebarGroupLabel`, separated by vertical
  spacing only. The sales pillars ("Get found," "Win the work," …) are landing-page copy and are
  **never rendered in the app**. Clusters: Home + Sarah on top, then **pipeline** (CRM, Schedule,
  Quotes, Invoices, Follow-ups), then **marketing** (Website, Content, Reviews), then **business**
  (Analytics, Team). Settings pinned at the bottom, above Sign out.
- The **Sarah nav item carries a badge** = pending `Approval` count (same count as the widget
  launcher badge).
- Nav renders from one registry (see §5 `MODULES`) — a module whose status is `hidden` never
  renders; `coming_soon` renders with a small `soon` chip; `preview` renders normally — no
  banner or badge (§4).
- Header per page = `PageHeader` (see §8): title + page actions. No
  Ask-Sarah button here — the widget launcher is the ONE entry point to Sarah (Levi: redundant
  affordances read as clutter); contextual Ask-Sarah CTAs live only inside empty/gated states.
- Mobile: sidebar becomes the existing Sheet drawer; the widget launcher stays bottom-right,
  above any sticky page actions.

## 3. The Sarah widget (global — on every page)

The Apollo/Intercom-style launcher. Same brain, same single owner conversation as SMS and the
`/sarah` page — three surfaces, one thread (the owner agent; see `02-sarah.md` for the full
page + engine contract).

```
                          ┌──────────────────────────────┐
                          │ ✦ Sarah   ● online   ⤢  ✕   │  ⤢ = open /sarah
                          ├──────────────────────────────┤
                          │  [approval card]             │
                          │  ┌────────────────────────┐  │
                          │  │ Review ask → M. O'Brien│  │
                          │  │ "Hi Mike, it's Marcus…"│  │
                          │  │ [Send it]  [Edit] [No] │  │
                          │  └────────────────────────┘  │
                          │  You: what's thursday look   │
                          │       like?                  │
                          │  Sarah: 3 estimates — 9:00   │
                          │  Newton, 11:30 Brookline,    │
                          │  2:00 Waltham. 40-min gap    │
                          │  at 1.                       │
                          ├──────────────────────────────┤
                          │ ⌾ On: Settings               │  ← page-context chip
                          │ [ Ask Sarah anything…    ➤ ] │
                          │ (chips: "Change my hours" ·  │
                          │  "Who gets booking texts?")  │
                          └──────────────────────────────┘
                                                   ┌────┐
                                                   │ ✦ 3│  ← launcher, badge =
                                                   └────┘     pending approvals
```

- **Trigger (Apollo-style, Levi 2026-07-12):** the bottom-right launcher bubble is GONE. Sarah
  opens from a top-right **"✦ Sarah" pill** in the frame's corner-controls cluster (ink-filled
  while open; badge = pending approvals + open escalations — the ONE needs-you number). Two
  display modes, toggled from the panel header and persisted in `sarah_widget_mode`:
  **docked** (default) — a full-height 380px lane OUTSIDE the rounded frame, on the shell
  background (the website builder's chat-lane twin); the frame compresses beside it;
  **floating** — the corner card.
  On mobile the floating card is always the surface (the dock is md+). Components:
  `SarahTrigger` / `SarahDock` / `SarahWidget` share one header + body in `SarahWidget.tsx`.
  The demo-data + theme toggles moved OFF the frame corner into the SIDEBAR footer, above
  Settings (Levi 2026-07-12) — the frame corner holds only the Sarah pill.
  Keyboard `⌘/` toggles. Open/closed state in `localStorage`. Hidden on `/sarah` (that page IS
  Sarah) and in the `/website` builder takeover (the site chat IS the left column — 03 §2).
- **Floating panel:** 380px × min(640px, 100dvh − 6rem) card, bottom-right; full-screen sheet on mobile. Header:
  Sarah + status, expand-to-`/sarah`, close.
- **Page context:** every message sends `{ route, module, entityId? }` (e.g. on
  `/crm/ct_dana` → `{ module: 'crm', entityId: 'ct_dana' }`) so "quote this job" needs no names.
  Shown to the user as the context chip; per-route suggestion chips come from the same registry
  entry (`MODULES[key].sarahChips`).
- **Approvals inline:** pending `Approval`s render as cards at the top of the thread — approve /
  edit / decline without leaving the page (the hard-gate: code sends only on explicit yes).
- **Handoff:** long threads, the activity log, and the full approvals queue live on `/sarah`;
  the ⤢ button and a "See everything →" footer link go there with thread position preserved.
- **Widget contract for module docs:** each module spec's §3 (Sarah) lists its suggestion chips
  and which of its actions can arrive as approval cards. Nothing else about the widget may vary
  per module.

## 4. Module gating

```ts
type ModuleKey =
  | 'crm' | 'schedule' | 'quotes' | 'invoices' | 'followups'   // nav cluster: pipeline
  | 'website' | 'content' | 'reviews'                          // nav cluster: marketing
  | 'analytics' | 'team'                                       // nav cluster: business

type ModuleStatus = 'live' | 'preview' | 'coming_soon' | 'hidden'
```

- Stored per organization: `Organization.modules: Record<ModuleKey, ModuleStatus>` (new JSON column;
  `maps from: none (new)`), with code-level defaults so absent keys resolve sensibly
  (today's defaults: `crm: live`, `schedule: live`, everything else `preview` for demo accounts,
  `coming_soon` for real partners until each ships).
- **`live`** — real data via the real provider. **`preview`** — full UI on mock fixtures,
  **no banner or badge** (Levi 2026-07-12: the whole app is pre-launch, labeling individual
  modules "preview" is noise — revisit only when real partners use live modules alongside mock
  ones). Never a broken or empty screen. **`coming_soon`** — teaser page: the module's one-line
  sales promise (REBRAND §3.4 copy verbatim) + "Ask Sarah about it" (opens widget).
  **`hidden`** — absent.
- **Demo mode:** owner-visible toggle (`DemoToggle` sets the `la_demo` cookie client-side;
  admin-only gating + `?demo=1` deferred) forces every non-live
  module to `preview` — the full-app walkthrough for design-partner calls.
- Empty states inside `live` modules follow the product truth: *"We're setting this up for you"*
  voice — never "Create your first X."

## 5. Typed data layer (the mock ↔ real seam)

Layout under `apps/web/src/lib/data/`:

```
data/
  registry.ts          → MODULES: Record<ModuleKey | 'home' | 'sarah' | 'settings',
                          { label, group?, route, icon, defaultStatus?, sarahChips: string[] }>
                          (nav + gating + widget chips; keyed wider than ModuleKey so the core
                          surfaces get context chips too. `group: 'pipeline'|'marketing'|'business'`
                          is INTERNAL — it orders the unlabeled nav clusters, never renders as text)
  shared.ts            → the cross-module types in §6
  fixtures/apex.ts     → THE demo business (cast below) — the only place mock entities live
  <module>/types.ts    → the module's own contracts (owned per §6 registry)
  <module>/provider.ts → interface <Module>Provider { … }        (reads + mutations)
  <module>/mock.ts     → MockProvider — serves fixtures/apex.ts
  <module>/real.ts     → RealProvider — Supabase service-role reads / server actions / api calls
  index.ts             → getProvider(module, organization) → status === 'live' ? real : mock
                         ^ AS BUILT (2026-07-12): no factory yet — modules export loose
                           listXMock()/listXReal() pairs and pages branch on the demo cookie
                           (crm/schedule) — the per-module `getProvider` refactor is DEFERRED.
```

- Pages stay **server components**; they call `getProvider(...)` and render — a module goes
  mock → real by shipping `real.ts` and flipping status, with zero screen changes.
- `real.ts` follows the established pattern: Supabase service-role reads scoped by
  `organizationId` (like `lib/dashboard.ts`), server actions for writes, HMAC-`cid` fetch to the
  Express api only when Sarah's engine / booking / Google sync is involved.
- Mock mutations mutate nothing: they return success + a toast and, where natural, enqueue a
  fake `SarahAction` so the demo feels alive.

### The demo business (single source: `fixtures/apex.ts`)

**Apex Roofing** — owner **Marcus Reed**, Boston metro (America/New_York), crew: **Danny**
(foreman), **Kayla** (office). Cast (stable ids — every module doc uses these):

| id | who | story |
|---|---|---|
| `ct_dana` | **Dana Miller** — customer | The flagship arc: website lead → estimate booked → quote `q_1042` ($14,200, roof replacement, accepted) → job scheduled → invoice `inv_2031` ($14,200, paid) → ⭐⭐⭐⭐⭐ review. Matches the landing-page demo. |
| `ct_alvarez` | **Jorge Alvarez** — lead | Leak repair. Quote `q_1043` ($1,850) sent 3 days ago, unanswered → Follow-ups is chasing. Open escalation `esc_301`: "Do you install copper gutters?" |
| `ct_patel` | **Sam & Priya Patel** — lead | Missed-call source, qualifying; estimate booked Thu 9:00 (Newton). |
| `ct_tran` | **Linda Tran** — lead | Website lead, went quiet after giving her address → nudge armed. |
| `ct_obrien` | **Mike O'Brien** — customer (imported) | From the QuickBooks import; happy 2024 job, never reviewed → reviews-campaign target. |
| `ct_sullivan` | **Frank Sullivan** — customer (imported) | Gutter replacement; invoice `inv_2032` ($2,400) 14 days overdue → Follow-ups is chasing (one reminder sent). |
| `ct_delgado` | **Rosa Delgado** — customer (imported) | Chimney flashing repair; invoice `inv_2033` ($980) sent + viewed, due Jul 22. |
| `imp_qb1` | import batch | 214 customers from QuickBooks; feeds CRM + the reviews campaign (63 asked · 21 new reviews · 4.9★). |

Thursday's schedule (used by Home/Schedule/Sarah demos): 9:00 Newton (Patel) · 11:30 Brookline ·
2:00 Waltham — drive-time-routed with a 40-min gap at 1:00.

## 6. Shared type registry

Owned **here** (module docs reference by name, never redefine):

```ts
interface Contact {
  id: string
  kind: 'lead' | 'customer'            // maps from: Lead exists; 'customer' is new (CRM entity)
  name: string                         // maps from: Lead.contactName
  phone: string                        // maps from: Lead.contactPhone
  email?: string                       // maps from: none (new)
  address?: string                     // maps from: Lead.fullAddress
  town?: string; zip?: string          // maps from: Lead.serviceTown / serviceZip
  stage: PipelineStage                 // owned by 05-crm; maps from: Lead.status (superset)
  source: string                       // maps from: Lead.source, + 'import'
  tags: string[]                       // maps from: none (new)
  lastActivityAt: string               // ISO; derived (latest Message/TimelineEvent)
  createdAt: string
}

type TimelineEvent = { id: string; at: string; contactId: string } & (
  | { type: 'message'; direction: 'inbound' | 'outbound'; body: string; via: 'sms' | 'app' }
      // maps from: Message (+providerSid); 'via' new
  | { type: 'appointment'; appointmentId: string; startAt: string; status: string }
      // maps from: Appointment
  | { type: 'escalation'; question: string; status: 'open' | 'resolved' | 'expired' }
      // maps from: Escalation
  | { type: 'quote'; quoteId: string; total: number; status: string }       // new (06)
  | { type: 'invoice'; invoiceId: string; total: number; status: string }   // new (08)
  | { type: 'review'; rating: 1 | 2 | 3 | 4 | 5; excerpt?: string }         // new (09)
  | { type: 'note'; body: string; author: string }                          // new
)

interface SarahAction {                // one row of "what Sarah did"
  id: string
  at: string                           // ISO
  module: ModuleKey | 'core'
  summary: string                      // "Booked Sam & Priya Patel — Thu 9:00"
  contactId?: string
  href?: string                        // deep link to the record
}                                      // maps from: none (new; api emits on tool success)

interface Approval {                   // a hard-gate draft awaiting the owner's yes
  id: string
  kind: 'customer_message' | 'quote' | 'invoice' | 'review_ask' | 'post' | 'social_post'
      | 'site_edit'                    // 'invoice' per 08; 'site_edit' per 03 (keeps Content's queue clean)
  createdAt: string
  summary: string                      // "Review ask → Mike O'Brien"
  preview: string                      // the exact draft content
  contactId?: string
  entityId?: string                    // the module record it belongs to (postId, quoteId, siteEditId…) — deep links
  status: 'pending' | 'approved' | 'declined' | 'expired'
}                                      // maps from: none (new; generalizes the SMS hard-gate)
```

**Module-type ownership** (defined in that doc's §4, referenced everywhere else):

| Type | Owner |
|---|---|
| `PipelineStage`, `ImportJob` | `05-crm.md` |
| `SarahThread`, `ActivityEntry` | `02-sarah.md` |
| `Site`, `SeoSnapshot` | `03-website.md` |
| `Post`, `SocialPost` | `04-content.md` |
| `Quote`, `QuoteLineItem` | `06-quotes.md` |
| `ScheduleItem`, `RoutePlan` | `07-schedule.md` |
| `Invoice` | `08-invoices.md` |
| `Campaign`, `ReviewRequest` | `09-reviews.md` |
| `FollowUpRule`, `ChaseItem` | `10-followups.md` |
| `FunnelSnapshot`, `MetricSeries` | `11-analytics.md` |
| `Member`, `Role` | `12-team.md` |
| `SettingsModel` | `13-settings.md` |

## 7. Routes

Root-level module routes (the app lives at `app.leadanswered.com` — no `/dashboard` prefix, per
the "app not dashboard" truth):

| Route | Page | Notes |
|---|---|---|
| `/` | role router (kept) | admin → `/admin`; organization → `/home` |
| `/home` | Home (01) | |
| `/sarah` | Sarah page (02) | |
| `/website`, `/content` | 03, 04 | |
| `/crm`, `/crm/[contactId]` | 05 | contact detail = unified timeline |
| `/quotes`, `/quotes/[quoteId]` | 06 | |
| `/schedule` | 07 | |
| `/invoices`, `/invoices/[invoiceId]` | 08 | |
| `/reviews`, `/followups` | 09, 10 | |
| `/analytics`, `/team`, `/settings` | 11, 12, 13 | |
| `/q/[token]`, `/i/[token]` | customer-facing quote-accept / invoice-pay | **public**, no auth; spec'd in 06/08 |
| `/p/[token]` | site draft preview (Sarah texts it to the owner) | **public**, view-only, signed + expiring token; spec'd in 03 §5 |
| `/dashboard/*` | permanent redirects | `/dashboard`→`/home`, `/dashboard/leads[/:id]`→`/crm[/:id]`, `/dashboard/appointments`→`/schedule`, `/dashboard/settings`→`/settings` |

- Implementation: one `(app)` route group holding the shell layout (sidebar + widget); auth
  pages and `/q|/i|/p` stay outside it. `/website` ALSO lives outside it — the builder is a
  full-viewport takeover (03 §2): the chat replaces the sidebar, no widget, ← back returns to
  the app.
- `middleware.ts` flips from an allow-list of protected prefixes to **protect-everything-except**
  public paths (`/sign-in`, `/forgot-password`, `/auth/*`, `/q/*`, `/i/*`, `/p/*`). Role gating stays
  per-page (`requireOrganization` / `isAdminEmail`), unchanged.

## 8. UI kit additions & shared patterns

**Add via shadcn CLI (base-nova style, Base UI primitives — match existing kit):**
`dialog`, `dropdown-menu`, `select`, `tabs`, `sonner` (toasts), `popover`, `calendar` +
date-picker composition, `avatar`, `chart`, `progress`, `command` (for a later ⌘K; installing
now is fine). Charts follow the `dataviz` conventions when built; chart token vars
(`--chart-1..5`) already exist in `globals.css`.

**Shared components (`src/components/app/`):**

- `PageHeader` — title, actions slot (no preview badge — §4; no Ask-Sarah button — see §2).
- `DataTable` — built on `@tanstack/react-table` + the existing shadcn `table`: search, column
  filters, sort, pagination, responsive column hiding, empty-state slot. Client-side over mock
  fixtures; server-side pagination is a later `real.ts` concern behind the same props.
- `EmptyState` — icon + one sentence in the "we're setting this up for you" voice + optional
  "Ask Sarah" action. `GatedState` — the `coming_soon` teaser (promise copy + Ask Sarah).
- `StatCard` — number + label + delta (Home, Analytics).
- `Timeline` — renders `TimelineEvent[]` (CRM contact detail, and anywhere a thread appears).
- `ApprovalCard` — one component for a pending `Approval` (approve / edit / decline), rendered
  identically in the widget, Home, and `/sarah`. `SarahActionRow` — one feed row for a
  `SarahAction` (Home digest + `/sarah` activity log).
- `LineItemsTable` / `LineItemEditor` — line items + totals, defined with 06-quotes, reused by
  08-invoices. `MoneyInput` — cents-backed currency field. `PublicDocLayout` — the branded
  no-auth page frame shared by `/q/[token]` and `/i/[token]`.
- `StatusBadge` maps per status enum — extends the existing `lib/dashboard-ui.ts` badge approach.
- Every route gets `loading.tsx` (skeletons via existing `skeleton`) and the `(app)` group gets
  `error.tsx`; all server-action results toast via sonner (success + failure).

## 9. States & voice (conventions, enforced in review)

- Coming-soon teaser shape and empty-state voice: exactly as §4; preview surfaces render unlabeled.
- **Categorical colors** (the one place chrome gets color in the monochrome app — approved
  2026-07-11): every `Approval.kind` + the escalation Question has its own hue, shown in the kind
  CHIP only (no edge stripes — seamless); the label always carries the meaning. Registry lives in
  `ApprovalCard.tsx` (`KIND_META`): message blue #3B82F6 · quote violet #8B5CF6 · invoice emerald
  #10B981 · review ask amber #F59E0B · blog post pink #EC4899 · social post cyan #06B6D4 · site
  edit indigo #6366F1 · question orange #F97316. New kinds claim an unused hue there. Home shows
  needs-you as INBOX ROWS (direction A): chip · summary · wait time, actions on hover, full draft
  in the widget.
- **Semantic STATUS colors** (approved 2026-07-12): every status chip app-wide (pipeline stages,
  appointment statuses, campaign/target statuses, line verification, sync, on/off) colors by
  MEANING via six families, one registry — `lib/dashboard-ui.ts` `statusChip()` / `FAMILY_CHIP`:
  **gray** not started/dormant (new, queued, draft, proposed, past customer, off, not connected,
  rescheduled) · **blue** in flight (contacted, sent, running, verifying) · **violet** being
  worked (qualifying, replied, job scheduled, job done) · **emerald** good outcome (booked,
  confirmed, showed, paid, reviewed, completed, verified, synced, on) · **amber** stalled/needs
  an eye (no response, paused, opted out, reconnect) · **red** lost/failed (disqualified,
  cancelled, failed, no-show). Soft-tint chip rendering (10% bg, strong text), same construction
  as the kind chips. Statuses and kinds never share a list, so hue overlap is safe. New statuses
  join a FAMILY in that one registry — never a bespoke color at a call site.
- **Calendar kind tints** (2026-07-12): the Schedule grid colors event BLOCKS by kind — identity,
  not meaning: estimate blue tint · job violet tint · block hatched gray (status then modifies:
  proposed dashed, past faded, no-show red). Same soft-tint construction, but borders use OPAQUE
  weights (`border-blue-300 dark:border-blue-800`) — alpha oklab borders composite to a yellow
  fringe in Chromium. Registry: `itemLook()` in `ScheduleClient.tsx`; details in 07-schedule §2.
- Timezone: every timestamp rendered in the organization's zone (reuse `organizationTz` helpers).
- Money: integer cents in contracts, formatted `$14,200` in UI.
- The PRODUCT is "the app," never "the dashboard," in copy. (Exception, Levi 2026-07-11: the
  overview page's nav label IS "Dashboard" — route stays `/home`.) Sarah is referred to by
  name, never "the AI."

## 10. Open questions

1. ~~Sidebar group labels~~ — *resolved (Levi): nav clusters are UNLABELED, separated by
   spacing only; the sales pillars never render in the app.*
2. ~~Widget keyboard shortcut~~ — *resolved: `⌘/` (and `Ctrl+/`) shipped in `sarah-context`.*
3. Demo mode: is a cookie-persisted `?demo=1` (admin-only) enough, or do you want a dedicated
   always-demo account (e.g. `demo@leadanswered.com` seeded with Apex Roofing)?

## Appendix — code-phase hardening (flagged, not part of the UI build)

- Twilio webhooks (`/webhooks/twilio/sms`, `/voice`) have **no signature validation** — add
  `X-Twilio-Signature` verification when we next touch the api.
- `POST /lead` is unauthenticated in prod — gate it (shared secret at minimum).


## 11. Reconciliation note (2026-07-12 audit)

Code-vs-doc drift verified and resolved this date; what follows is the record.

**Doc corrected to match the build:** monochrome launcher + speech-bubble mark (§3) · panel
height (§3) · demo toggle reality (§4) · `⌘/` resolved (§10) · badge = approvals + escalations
on ALL surfaces: sidebar, launcher, /sarah tab, Home "Needs you" — escalations live in
`SarahProvider` (seeded by the app layout: fixtures in demo, `listOpenEscalations` real).

**Superseded code removed:** `leadStatusBadge` / `apptStatusBadge` / `stageBadge`
(→ `statusChip`, §9), the registry's unused `icon` field (sidebar icons come from the animated
`KIWI_ICONS` set, 14-icons), and `PageHeader`'s `preview` prop (no banners anywhere, §4).

**Deferred (real, but each its own build):** the `getProvider` factory refactor ·
`loading.tsx` for the remaining routes (schedule, reviews, and the unbuilt modules) · public
`/q/[token]` + `/i/[token]` pages (middleware already whitelists them) · admin-gating the demo
toggle.