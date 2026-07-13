# 12 — Team: your crew texts Sarah too, with the permissions you set

> Module: `team` · Route: `/team` · Status today: `preview` (demo) /
> `coming_soon` (real partners). Builds on `00-foundation.md` (shell, widget, gating, seam, cast);
> fronts FEATURES.md → Platform: **Team accounts + permissions (M)** and Pillar 4 → **Team**.

## 1. Purpose

The Team page is where the owner puts their crew on the payroll of the AI: who Sarah knows, what
each person can ask her by text, and what each person can see or do in the app. It makes the
REBRAND §3.4 promise literal — *"Your team — your crew can text Sarah too, with the permissions
you set."* The magic is the SMS side: a member is added by **name + phone**, Sarah texts them a
hello, and from that moment she recognizes their number — Danny gets his Thursday route by texting
her, with **zero app onboarding**. App access (email login) is optional and layered on top. Roles
stay trades-simple — **Owner / Office / Crew** — three named presets with an advanced
per-permission view for the rare owner who wants to tweak.

**Real today vs. mock:** entirely mock. Today auth is ONE owner login per business
(`Organization.ownerEmail`, `packages/db/prisma/schema.prisma`) plus env-var admin emails
(`ADMIN_EMAILS`, `apps/web/src/lib/auth.ts`); anyone whose phone matches a
`NotificationRecipient` is treated as the owner with full powers when they text in
(`apps/api/src/conversationService.ts` — `fromIsOwner`). A real `User`↔`Organization` role model
(members, roles, scoped Sarah recognition) is new backend per FEATURES.md.

## 2. Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ PageHeader: Team   [preview]            [+ Add someone]  [Ask Sarah] │
├──────────────────────────────────────────────────────────────────────┤
│ 3 people · 3 can text Sarah · 2 have app logins                      │
│                                                                      │
│ [ Members ]  [ Roles & permissions ]                    ← tabs       │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ ◉ Marcus Reed   Owner   (617) 555-0100   App: active   now    ⋯ │ │
│ │ ◉ Kayla         Office  (617) 555-0134   App: active   2h ago ⋯ │ │
│ │ ◉ Danny         Crew    (617) 555-0177   Texts only    45m ago ⋯│ │
│ └──────────────────────────────────────────────────────────────────┘ │
│   phone column caption: "The number Sarah knows them by."            │
│   row ⋯ menu: Change role · Permissions · Notifications ·           │
│               Resend hello · Remove (owner-only items locked)        │
│                                                                      │
│ Roles & permissions tab:                                             │
│ ┌ Owner ─────────┐ ┌ Office ────────┐ ┌ Crew ──────────┐            │
│ │ Everything,    │ │ Runs the desk: │ │ Their own jobs:│            │
│ │ incl. approvals│ │ CRM, invoices, │ │ schedule, route│            │
│ │ & this page.   │ │ schedule.      │ │ job notes.     │            │
│ │ [View matrix]  │ │ [View matrix]  │ │ [View matrix]  │            │
│ └────────────────┘ └────────────────┘ └────────────────┘            │
│ [View matrix] expands the advanced grid: rows = app modules +       │
│ Sarah capabilities, columns = the three roles (see/act toggles).    │
└──────────────────────────────────────────────────────────────────────┘
```

- **Member detail** opens as a right-side sheet (desktop) / full-screen sheet (mobile): identity
  (name, phone, optional email, avatar), role select, an **Advanced permissions** disclosure
  showing this member's effective matrix (preset + any overrides), and their notification
  subscriptions (which events text/email them — booking confirmed, new qualified lead, …).
- **Add someone** is a dialog: name + phone (required), role (default Crew), optional email with
  helper text *"Add an email to give them the app too — otherwise they just text Sarah."*
- **Owner-only zone:** role changes, permission edits, member removal, and anything touching
  approval rights render disabled with a lock tooltip for non-owner viewers of this page.
- **Mobile:** the DataTable collapses to member cards (avatar, name, role chip, app-access chip,
  last active); tabs stay; add/detail are full-screen sheets; `[+ Add someone]` becomes a sticky
  bottom action above the Sarah launcher.

## 3. Sarah

Sarah is the whole point of this page: the permissions matrix is **her briefing** — the engine
consults it on every inbound text and every app question to decide what this person may ask and
what slice of the business they see.

- **What she did here:** membership `SarahAction`s — "Texted Danny his Thursday route",
  "Said hello to Kayla — she can text me now", "Danny asked to move the Waltham job; moved it."
- **Scoped answers (the demo beats):** Danny (Crew) texts *"what's my Thursday?"* → Sarah answers
  with **his** stops only, not the whole board. Kayla (Office) can tell Sarah to send invoice
  `inv_2031` — but *"knock 10% off the Alvarez quote"* gets *"That's one for Marcus — want me to
  ask him?"* Only Marcus approves hard-gate sends (quotes, review asks, customer messages).
- **Owner can run this page by voice:** "Add my new guy Tomas, 617-555-0190, crew" · "What can
  Danny ask you?" · "Make Kayla office." Sarah executes these directly (they're owner-gated by
  role, confirmed in-thread) — they are **not** Approval cards, since nothing customer-facing is
  sent. The one message Team triggers — the hello text to a new member — goes to the crew, not a
  customer, so it sends without the hard gate.
- **Widget contract (per 00 §3):** suggestion chips for `MODULES.team.sarahChips` —
  *"Add someone to the team"* · *"What can Danny ask you?"* · *"Who gets booking texts?"*
  Approval-card kinds originating here: **none**.

## 4. Data contract

Owned here per 00 §6: **`Member`**, **`Role`**. References `ModuleKey` (00 §4) and
`SarahAction` (00 §6).

```ts
type RoleKey = 'owner' | 'office' | 'crew'      // v1: three presets, no custom roles (§8 Q2)

type ModuleAccess = 'none' | 'view' | 'act'     // see it / act in it

interface SarahCapabilities {                   // what texting (or asking in-app) gets you
  askSchedule: 'none' | 'own' | 'all'           // "what's my Thursday?" → own route vs whole board
  moveJobs: 'none' | 'own' | 'all'              // reschedule/cancel via Sarah
  askCrm: 'none' | 'own' | 'all'                // look up contacts/jobs ('own' = assigned jobs)
  requestQuotes: boolean                        // may ask Sarah to DRAFT a quote…
  sendInvoices: boolean                         // may tell Sarah to send/track an invoice
  changePricing: boolean                        // edit quote amounts/line items
  approveHardGates: boolean                     // quotes, review asks, customer messages —
}                                               //   Owner-only, enforced in code (§8 Q1)

interface Role {
  key: RoleKey
  name: string                                  // "Owner" | "Office" | "Crew"
  blurb: string                                 // one plain-trades sentence (cards in §2)
  modules: Record<ModuleKey, ModuleAccess>      // app-side access per module
  sarah: SarahCapabilities                      // text-side access
}                                               // maps from: none (new)

interface Member {
  id: string                                    // 'mem_marcus' | 'mem_danny' | 'mem_kayla'
  name: string                                  // maps from: NotificationRecipient.name
  phone: string                                 // E.164 — the number Sarah recognizes them by
                                                // maps from: NotificationRecipient.phone
  email?: string                                // present ⇒ app access possible
                                                // maps from: NotificationRecipient.email
  avatarUrl?: string                            // maps from: none (new)
  roleKey: RoleKey                              // maps from: none (new — see migration note)
  overrides?: {                                 // advanced per-permission tweaks off the preset
    modules?: Partial<Record<ModuleKey, ModuleAccess>>
    sarah?: Partial<SarahCapabilities>
  }
  smsStatus: 'pending_hello' | 'active' | 'opted_out'   // Sarah's side of the relationship
  appAccess: 'none' | 'invited' | 'active'      // Supabase auth side (email invite mechanics)
  notifications: Array<{                        // which events text/email this person
    eventType: string                           // maps from: NotificationSubscription.eventType
    channels: 'sms' | 'email' | 'both'          // maps from: NotificationSubscription.channels
  }>
  lastActiveAt?: string                         // ISO; latest text-to-Sarah or app session
  createdAt: string
}
```

Preset defaults: **Owner** = `act` everywhere, all Sarah capabilities, `approveHardGates: true`.
**Office** = `act` on crm/quotes/invoices/schedule/followups, `view` on the rest;
`askSchedule/askCrm: 'all'`, `sendInvoices: true`, `requestQuotes: true`, `changePricing: false`,
`approveHardGates: false`. **Crew** = `view` on schedule only, `none` elsewhere;
`askSchedule/moveJobs/askCrm: 'own'`, everything else false.

**Migration note (flagged, not designed here):** `Member` generalizes today's
`NotificationRecipient` (+`NotificationSubscription`) — a one-time backfill turns each recipient
into a Member carrying its subscriptions, and the owner-recognition check in
`conversationService.ts` (any recipient phone ⇒ full owner powers) becomes a Member lookup that
scopes the reply by role. Which role existing recipients backfill to is §8 Q5 — today they
effectively have owner powers, so a silent downgrade changes live behavior for real partners.

**Fixtures (`fixtures/apex.ts`):** `mem_marcus` (Marcus Reed, Owner, app `active`, email set,
last active now) · `mem_kayla` (Kayla, Office, app `active`, email set, subscriptions:
new_qualified_lead + booking_confirmed via both, last active 2h) · `mem_danny` (Danny, Crew,
**no email — texts only**, sms `active`, last active 45m: asked Sarah for his Thursday route).

## 5. Actions

| Action | Who | Surface → mechanics | Sarah engine? |
|---|---|---|---|
| Add member | Owner (Office may add Crew — §8 Q4) | Dialog → server action: create `Member`; if email given, fire the existing Supabase invite mechanics (same admin `inviteUserByEmail` flow used for owner onboarding today — mapping, not new) → `appAccess: 'invited'` | Yes — api call (HMAC-`cid`): Sarah texts the hello ("Hey Danny — it's Sarah, Marcus's assistant at Apex Roofing…"), member `pending_hello → active` |
| Change role | Owner only | Row menu / detail sheet → server action | No — engine reads role at next inbound |
| Edit permission overrides | Owner only | Detail sheet advanced grid → server action; `approveHardGates` not offered (code-locked to Owner) | No |
| Edit notifications | Owner; members may edit their own | Detail sheet → server action (writes what is today `NotificationSubscription`) | No |
| Resend hello / resend app invite | Owner | Row menu → api call / Supabase invite re-send | Hello: yes |
| Remove member | Owner only | Row menu → confirm dialog → server action: revoke app session, Sarah stops recognizing the number; past timeline attributions kept (§8 Q3) | No |

Mock providers (per 00 §5) mutate nothing: each action returns success + a sonner toast and, for
add-member and the hello, enqueues a fake `SarahAction` ("Said hello to Tomas — he can text me
now") so the demo feels alive. Real `MemberProvider` = Supabase service-role reads scoped by
`organizationId`, server actions for writes, api call only where Sarah sends the hello.

## 6. Components

- **From 00 §8:** `PageHeader` (title, `+ Add someone` action) · `DataTable`
  (members; responsive column hiding drops last-active first) · `EmptyState` / `GatedState` ·
  `StatusBadge` (role chip; app-access chip; `pending_hello` amber) · toasts via sonner.
- **From the kit additions (00 §8):** `avatar` (initials fallback) · `dialog` (add member,
  remove confirm) · `dropdown-menu` (row ⋯) · `select` (role) · `tabs` (Members / Roles &
  permissions). Detail sheet reuses the existing shadcn `sheet`.
- **Missing from the kit — flag:** `switch` (per-permission toggles in the advanced grid) — add
  via shadcn CLI alongside the 00 §8 list.
- **Module-local (not ui-kit):** `PermissionsMatrix` — rows = app modules + Sarah capabilities,
  columns = roles (read-only on the Roles tab) or a single member (editable, showing
  preset-vs-override state). Lives in `src/components/app/team/`.

## 7. States

- **`coming_soon`** (real partners until this ships): `GatedState` teaser with the REBRAND §3.4
  promise verbatim — *"Your team — Your crew can text Sarah too, with the permissions you set."*
  — plus "Ask Sarah about it" (opens the widget).
- **`preview`** (demo accounts / `?demo=1`): full UI on the Apex fixtures, no banner or badge
  (00 §4).
- **Live, owner-only so far:** never an empty table — the owner is always row one (backfilled
  from `Organization.ownerEmail`). Beneath it, the setup voice: *"It's just you so far. Add your
  crew and Sarah introduces herself by text — no app setup, they just text her like you do."*
  Never "create your first member."
- **Pending states inline, not blocking:** `pending_hello` and `invited` chips on the row with a
  resend action — the page never gates on delivery.
- **Error:** `(app)` group `error.tsx`; every server-action failure toasts with a retry;
  `loading.tsx` skeleton = header + stat line + 3 table-row skeletons.
- Timestamps in the organization's timezone; copy says "app," never "dashboard" (00 §9).

## 8. Open questions

1. **Is `approveHardGates` permanently Owner-only in code**, or may an owner delegate it (e.g.
   Kayla approves invoice sends)? The spec assumes code-locked to Owner; delegating changes the
   approvals model in 02-sarah.
2. **Custom roles in v1?** Spec assumes no — three presets + per-member overrides. A role builder
   changes `RoleKey`, the Roles tab, and the matrix component.
3. **Remove vs. deactivate:** does removal keep the Member row (for timeline attribution and
   "Danny moved this job" history) as a `removed` state, or hard-delete? Spec assumes keep-history.
4. **Can Office manage Crew** (add/remove crew members, not roles/permissions), or is the whole
   page owner-only-write? Changes the owner-only-zone gating.
5. **Backfill role for existing `NotificationRecipient`s:** today any recipient phone gets full
   owner powers by text — do they backfill as Owner-equivalent (no behavior change) or Office
   (safer, but silently downgrades live partners)?
6. **Crew app experience:** members with app access — full nav filtered by `modules` access, or a
   stripped "my day" view for Crew? Filtered-nav is assumed (cheapest); a dedicated crew view is
   its own screen.
