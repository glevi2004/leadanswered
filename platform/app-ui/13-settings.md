# 13 — Settings: business profile, service area, Sarah, notifications, your line, billing

> Reshapes the existing Settings page (`apps/web/src/app/dashboard/settings/page.tsx` +
> `components/config/sections.tsx`). Builds on `00-foundation.md` (shell, widget, seam, shared
> types — this doc owns `SettingsModel`). Companions: `../SCOPE.md` §4 (organization fields) +
> §11 (billing/offboarding), `../FEATURES.md` (Platform pillar). Route: **`/settings`**
> (`/dashboard/settings` → permanent redirect, per 00 §7).

## 1. Purpose

Settings is where Marcus tells the system who Apex Roofing is and how it runs: the business
profile, where he takes jobs, what services he sells, how Sarah talks and what she escalates,
who gets which alerts, the dedicated line Sarah answers on, connected integrations, and (later)
the subscription. It fronts the **Platform** pillar (FEATURES §4, Pillar 0) and makes the
"we set it up for you" promise literal — every tab arrives **already filled in** from the
admin-led onboarding; Settings is for adjusting a running system, never for building one.
The single flat form becomes **eight tabbed sections** so each concern reads on its own, and
**weekly availability leaves this page entirely** — it belongs to the calendar and now lives on
`/schedule` (07); Settings keeps only a signpost to it.

**Real today vs. mock:** business profile, service area, services, Sarah persona, notification
recipients, "Your line" (number + verification badge), and Google Calendar connect/disconnect
are all REAL today — same Organization columns, same server-action save path. **Billing is
mock/future** (`preview` treatment; no Stripe columns exist — SCOPE §11). **Availability MOVES
OUT to `/schedule`** (07-schedule owns the grid; this page states the removal and links there).

## 2. Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ PageHeader: Settings                                  [Ask Sarah]  │
├────────────────────────────────────────────────────────────────────┤
│ ℹ Weekly availability moved to Schedule →  (/schedule)             │
├────────────────────────────────────────────────────────────────────┤
│ Business │ Service area │ Services │ Sarah │ Notifications │       │
│ Your line │ Integrations │ Billing°                                │
├────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │  (active tab — e.g. Business)                                  │ │
│ │  Company name   [ Apex Roofing            ]                    │ │
│ │  Owner          [ Marcus Reed             ]                    │ │
│ │  Timezone       [ America/New_York      ▾ ]                    │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ────────────────────────────────────────────────────────────────  │
│         (sticky, appears when dirty)   Saved ✓ | [Save changes]    │
└────────────────────────────────────────────────────────────────────┘
```

- **Tabs** (00 §8 `tabs`), in this order: **Business · Service area · Services · Sarah ·
  Notifications · Your line · Integrations · Billing** (Billing tab carries a small `preview`
  dot/badge). One tab visible at a time; each renders inside a single Card.
- **Tab contents:**
  - **Business** — company name, owner, timezone (the timezone select moves here from the old
    Availability section; it governs every rendered time app-wide).
  - **Service area** — repeatable **base location rows** (ZIP + radius miles, add/remove;
    structured per SCOPE §4 `base_locations`), then the collapsed "Exceptions — optional"
    disclosure exactly in the current editor's spirit: *Always serve these ZIPs* (include
    overrides) / *Never serve these ZIPs* (exclude overrides), now as ZIP chip inputs. The
    "Only book the decision-maker" checkbox stays here (qualification rule).
  - **Services** — project types as the existing **chip picker** (`TagInput`: curated
    suggestions + free-text add). Labels are **verbatim human text** ("Roof repair", never
    slugs) — SCOPE §4; matching normalization is internal and never rewrites them.
  - **Sarah** — assistant name, persona notes framed as **"How Sarah talks"** (textarea,
    placeholder: "Warm, local, always mentions the on-site estimate is free…"), and
    **escalation topics** as chips ("Topics Sarah brings to you instead of guessing").
  - **Notifications** — recipient rows (name · phone · email), per-row **event checkboxes**
    (the seven `NOTIFICATION_EVENT_TYPES`) + a per-row **channel** select (sms / email / both).
    "+ Add recipient." Existing model, unchanged.
  - **Your line** — informational, no form: the dedicated number large (`(877) 555-0142`),
    number type (toll-free), a **verification `StatusBadge`** (pending / verified / failed —
    moves here from the old Overview "Your line" card), copy-number button, and one line of
    copy: "This is Sarah's number — every lead, missed call, and text lands here."
  - **Integrations** — **Google Calendar** row (the current `CalendarCard` verbatim: status +
    connected-as email, Connect / Reconnect / Disconnect) and a **QuickBooks** row marked
    `soon` (feeds Data import / Invoicing — no action yet).
  - **Billing** (preview) — plan card **"Design partner — free"** ("Founder pricing when
    billing turns on — you'll approve it first"), a **Manage subscription** button (Stripe
    customer portal — placeholder), and **Cancel plan** (the SCOPE §11 flow, see §5).
- **Availability signpost:** the slim callout under the header links to `/schedule` — shown to
  every organization (not just post-migration), since "where do I change my hours?" is
  permanent. The grid itself is spec'd in `07-schedule.md`.
- **Mobile:** tab list horizontally scrollable with edge fade; tab content full-width; the
  sticky save bar sits above the Sarah widget launcher. Base-location rows stack; the
  notifications event checkboxes wrap.

## 3. Sarah

- **Widget context:** on `/settings` the context chip reads `⌾ On: Settings`. Suggestion chips
  (registry entry, see §8 Q4): **"Change my service area"** · **"Who gets booking texts?"** ·
  **"How do you talk to customers?"**.
- **Config by conversation is the headline behavior:** anything this page edits, the owner can
  just tell Sarah — and she confirms the change **in plain English, echoing the effect, not
  the field**: "Got it — I'll stop offering Saturdays." / "Done — Acton (01720) is in your
  service area now." / "Kayla now gets an email for every new inquiry." Changes made by chat
  land in the same validated config path as the form (§5) and the page reflects them on next
  load.
- **What Sarah did:** `SarahAction` rows (module `'core'`) surface config changes she applied
  from text, e.g. "Added 01720 to your service area — you asked Tuesday," each deep-linking to
  the relevant tab (`/settings?tab=service-area`).
- **No approvals originate here.** The hard-gate (`Approval`) exists for customer-facing sends;
  the owner changing their own config is owner-initiated — Sarah applies and confirms, no
  approval card.
- **Retention interception hand-off:** if Marcus tells Sarah "cancel my account," she responds
  with the same interception as the UI — offers the call with Levi first, and never cancels
  in-thread without the explicit two-step confirmation.

## 4. Data contract

Owned here per 00 §6: **`SettingsModel`** — the read model uniting the tabs. The real provider
assembles it from the Organization row + related tables (same reads `initialFromOrganization`
does today); the mock serves Apex Roofing from `fixtures/apex.ts`.

```ts
interface SettingsModel {
  business: {
    companyName: string                    // maps from: Organization.companyName
    ownerName: string                      // maps from: none (new column — see §8 Q3)
    ownerEmail: string | null              // maps from: Organization.ownerEmail (read-only; auth identity)
    timezone: string                       // maps from: Organization.standingAvailability.timezone (IANA)
  }
  serviceArea: {                           // structured, never free-text (SCOPE §4/§5.1)
    baseLocations: { zip: string; radiusMiles: number }[]
                                           // maps from: Organization.serviceArea.baseLocations (JSON)
    includeOverrides: string[]             // maps from: Organization.serviceArea.includeOverrides
    excludeOverrides: string[]             // maps from: Organization.serviceArea.excludeOverrides
    requireDecisionMaker: boolean          // maps from: Organization.qualificationRules.requireDecisionMaker
  }
  services: {
    projectTypes: string[]                 // maps from: Organization.projectTypes — verbatim labels
    suggestions: string[]                  // DEFAULT_PROJECT_TYPES (code constant, lib/config.ts)
  }
  sarah: {
    name: string                           // maps from: Organization.sarahName
    personaNotes: string | null            // maps from: Organization.sarahPersonaNotes
    escalationTopics: string[]             // maps from: Organization.escalationTopics
  }
  notifications: {
    recipients: SettingsRecipient[]        // maps from: NotificationRecipient + NotificationSubscription rows
  }
  line: {                                  // informational — read-only in the app (admin edits in /admin)
    number: string | null                  // maps from: Organization.twilioNumber
    numberType: 'toll_free' | 'local'      // maps from: Organization.numberType
    verificationStatus: 'pending' | 'verified' | 'failed'
                                           // maps from: Organization.verificationStatus (SCOPE §4 — informational, never gates Sarah)
  }
  integrations: {
    googleCalendar:
      | { status: 'connected'; email?: string }
      | { status: 'disconnected' | 'needs_reconnect' | 'provisioning' }
                                           // maps from: CalendarConnection (lib/calendar.ts); 'provisioning' = env not configured yet
    quickbooks: { status: 'coming_soon' }  // maps from: none (placeholder)
  }
  billing: {                               // MOCK today — Stripe-driven later (SCOPE §11)
    plan: string                           // fixture: "Design partner — free"
    subscriptionStatus: 'active' | 'past_due' | 'canceled'
                                           // maps from: none (new; Stripe webhooks; the ONE status that gates the product)
    portalUrl?: string                     // maps from: none (Stripe customer-portal session, minted on demand)
    since?: string                         // ISO — fixture: partner start date
  }
}

interface SettingsRecipient {
  id: string
  name: string
  phone?: string; email?: string           // at least one required (recipientSchema refine)
  subscriptions: { eventType: NotificationEventType; channels: 'sms' | 'email' | 'both' }[]
}                                          // NotificationEventType: the 7-value union in lib/config.ts
```

Apex fixture: base `02458 · 25 mi`; include `01720`; exclude `02101`; projectTypes "Roof
repair" · "Roof replacement" · "Gutter installation" · "Roof inspection"; escalation "insurance
claims" · "commercial jobs"; recipients Marcus (all events, both), Kayla (new_inquiry +
new_qualified_lead, email), Danny (booking_confirmed, sms); line verified; Calendar connected
as marcus@apexroofingma.com; billing `{ plan: "Design partner — free", status: 'active' }`.

## 5. Actions

| Action | Kind | Mechanics |
|---|---|---|
| Save changes (global sticky bar) | server action | Current mechanics kept verbatim: one shared client model; Save calls `saveOnboardingAction(buildConfig(state))`, zod-validated by the full `organizationConfigSchema` mirror in `apps/web/src/lib/config.ts`, which upserts the Organization JSON columns + rewrites recipient/subscription rows. **Mapping note:** tabs are presentation only — edits persist across tab switches in the one model, and Save submits the whole config. `standingAvailability.windows` is no longer editable here but **passes through unchanged** in the payload (the schema requires ≥1 window; 07-schedule owns edits — see §8 Q2). |
| Connect / Reconnect Google Calendar | redirect | Link to `googleConnectUrl(organizationId)` — api-side OAuth start (exists). |
| Disconnect Google Calendar | server action | `disconnectCalendarAction` (exists), then revalidate + toast. |
| Copy line number | client | Clipboard + toast. No mutations on Your line — number/verification are admin-managed in `/admin`. |
| Manage subscription | api call (future) | Mint a Stripe customer-portal session, redirect. Mock: button present, toast "Billing turns on with founder pricing — nothing to manage yet." |
| Cancel plan | dialog flow (future) | SCOPE §11 retention interception, two steps. **Step 1 — the intercept:** dialog offers **"Book a call with Levi"** (primary; opens the founder's booking link) with "Continue to cancel" as the quiet secondary. **Step 2 — soft-cancel confirm:** explains Sarah pauses (stops answering the line) but every lead, conversation, and setting is kept, and the account can be reactivated anytime; confirm → Stripe cancel → webhook sets `subscriptionStatus: 'canceled'` + pauses Sarah + triggers the "sorry to see you go" email (feedback form + call offer). Never hard-deletes. Mock: both steps render; confirm returns a success toast, mutates nothing. |
| Config change via Sarah (chat/SMS) | Sarah engine | Needs a future owner-agent tool (`update_config`) that writes through the **same zod schema** — one validation path for form and conversation. Flagged as a `needs:` for the engine, not this UI build. |

## 6. Components

- From 00 §8 additions: **`tabs`** (the page's spine), **`select`** (timezone, notification
  channel), **`dialog`** (cancel flow), **sonner** toasts, **`PageHeader`** (with Ask Sarah),
  **`StatusBadge`** (verification: pending=amber, verified=green, failed=red).
- Existing kit reused: `Card`, `Input`, `Label`, `Textarea`, `Checkbox`, `Button`, and
  **`TagInput`** (`components/config/TagInput`) as the chip picker for project types,
  escalation topics, and include/exclude ZIPs.
- Page-local composites (not kit gaps): **`BaseLocationRows`** (repeatable ZIP + radius rows
  with add/remove), **`RecipientRows`** (evolved from today's `RecipientsSection`), the sticky
  **save bar** (dirty-state aware, replaces the current always-visible one), and the tab-content
  cards evolved from `components/config/sections.tsx` (which the onboarding wizard keeps
  sharing — same section components, two hosts).
- Missing from kit: nothing beyond what 00 §8 already schedules.

## 7. States

- **Module status:** Settings is core app surface — always live. The **Billing tab** runs on
  fixtures until billing ships — unlabeled, like every preview surface (00 §4).
- **Running-with-no-data:** never occurs for the form tabs — onboarding guarantees a complete
  config ("we set it up for you"). Recipients always starts with the owner row; the add-button
  copy stays invitational ("+ Add recipient — office, foreman, anyone who needs alerts").
- **Google Calendar not provisioned** (`calendarConfigured()` false): instead of today's hidden
  card, the row shows "We're setting this up for you" with no button — the integration list
  never looks broken or empty.
- **Verification pending:** amber badge + "Verification pending — texts still send; some
  carriers may filter until it clears." Failed: red badge + "We're on it — no action needed
  from you." (Informational only; never gates Sarah — SCOPE §4.)
- **Subscription gates (future):** `past_due` → amber banner on Billing ("Payment issue — update
  your card") ; `canceled` → the app shows the reactivation path; Sarah paused (SCOPE §11).
- **Errors:** zod issues render inline under the offending field (per-field, not a blob);
  failed save → destructive toast, edits retained. Route ships `loading.tsx` skeleton (tabs +
  card) per 00 §8.

## 8. Open questions

1. **Save granularity** — spec keeps today's one-global-save (full-config submit, tabs as
   presentation). Split into per-tab server actions with `organizationConfigSchema.pick()`
   slices now, or after 07-schedule forces the schema split anyway?
2. **Availability pass-through** — the shared schema requires ≥1 availability window; while
   Settings no longer edits them it must round-trip them unchanged. Acceptable seam, or split
   `standingAvailability` out of the settings payload when /schedule ships?
3. **Owner name** — add an `Organization.ownerName` column (Business tab shows "Marcus Reed"),
   or show only `ownerEmail` until Team (12) introduces real member records?
4. **Widget registry** — *resolved in 00 §5:* the registry is keyed
   `ModuleKey | 'home' | 'sarah' | 'settings'`, so Settings has its own chips entry.
5. **The retention call link** — external booking link (Cal.com/Google) for "Book a call with
   Levi," or does Sarah book it conversationally? Determines whether the cancel dialog needs a
   URL config or an engine hook.


> **Built note (2026-07-12):** the Settings page now carries the promised cross-link —
> "Availability lives in Schedule →" (`/schedule?tab=availability`). The editor itself stays in
> Schedule only; no duplicate.
