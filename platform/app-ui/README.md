# App UI specs — review guide

14 docs specifying the entire app UI (see `../APP_UI_PLAN.md` for the page map + process). Every
doc follows the same 8 sections: Purpose · Layout · Sarah · Data contract · Actions · Components ·
States · Open questions. All fixtures are one demo business (**Apex Roofing**, defined once in
`00-foundation.md` §5) so the mock app demos as a living company.

**Already locked** (baked into every doc): full-depth specs; root module routes (`/crm`,
`/schedule`, …; `/dashboard/*` redirects); data contracts = ideal read models with `maps from:`
notes to the real schema; tenant = **Organization** (the Prisma rename has landed in code).

## Reading order

| Doc | One-liner |
|---|---|
| `00-foundation.md` | Shell + nav (unlabeled clusters — no group names in the UI), the global Sarah widget, module gating (live/preview/coming_soon), the mock↔real data seam, shared types, routes, ui-kit additions. **Read first — everything references it.** |
| `01-home.md` | The OS home: needs-your-attention, what Sarah did, today's route, headline numbers. |
| `02-sarah.md` | Sarah full-screen: chat (one thread across SMS/widget/app), activity log, approvals queue; specs the new `POST /sarah/turn` api contract. |
| `05-crm.md` | Leads + customers as one CRM: pipeline, contact detail = unified timeline, the import wizard ("Your history"). |
| `07-schedule.md` | One calendar for estimates + jobs, day-route with drive times, reschedule/cancel (real today), availability editor moves here. |
| `06-quotes.md` | Quote list/detail/compose, Sarah-drafted quotes via hard-gate, public `/q/[token]` accept page. |
| `08-invoices.md` | Invoice list/detail, quote→invoice, overdue chasing, public `/i/[token]` pay page. |
| `09-reviews.md` | **The day-one ROI module**: campaign wizard, results wall, per-target progress, compliance surfaced. |
| `10-followups.md` | The chase board: everything Sarah is keeping warm + the rules; built on the real proactive engine. |
| `03-website.md` | Lovable-style builder: live preview of their site + Sarah chat (describe → draft → Publish), version history; Visibility tab (SEO, GBP, AI answers). |
| `04-content.md` | Blog + social: Sarah drafts from job photos → approve → publish/cross-post. |
| `11-analytics.md` | The ROI numbers: funnel, trends, response time, per-source breakdown. |
| `12-team.md` | Members + roles; crew texts Sarah with scoped permissions (SMS-first invites). |
| `13-settings.md` | Tabbed settings: business, area, services, Sarah persona, notifications, line, integrations, billing (incl. the cancel-retention flow). |
| `14-icons.md` | KiwiIcons: our own animated icon system (Resend-style choreography, own-drawn paths, motion architecture, per-icon storyboard, build order). |

## Open questions — the decisions you owe (rolled up from every doc's §8)

### Cross-cutting (decide once, applies everywhere)

1. **What needs your explicit yes vs. what Sarah does autonomously.** One policy spanning:
   the reviews wave (per-message × 187 vs. approve-template-then-auto, 09.1), quote/invoice
   chases (hard-gated or autonomous like lead nudges, 10.1), overdue invoice reminders (own
   approval kind or `customer_message`, 08.1), reschedule/cancel customer notices (inline
   confirm dialog vs. widget approval card, 07.5), and approval expiry rules per kind (02.5).
2. **Three schema decisions that block `real.ts` work later** (design-level now, no code yet):
   the customer entity (new `Contact` table folding in `Lead` vs. read-model overlay, 05.1),
   the `Job` entity (new table vs. `kind` column on `Appointment`, 07.1), and owner-thread
   storage (new tables vs. owner-flagged `Conversation`, 02.1).
3. **Payments rail** — Stripe vs. QuickBooks vs. v1 = mark-paid-only with check/Zelle
   instructions (08.2 recommends mark-paid-only; affects 06 deposits + 09 ongoing triggers).
4. **Consent posture for texting imported customers** (09.2) — SCOPE §2 requires affirmative
   opt-in; the review campaign texts past customers. Needs an import-time attestation +
   `ops/legal.md` carve-out before the first REAL campaign (doesn't block preview UI).

### Foundation (00)
- Widget shortcut `⌘/` vs. `⌘j` · demo mode: `?demo=1` cookie vs. a seeded demo account.
  (Nav group labels: resolved — clusters render unlabeled, spacing only.)

### Per module (the ones that change the build)
- **01 Home:** `soon` stat tiles vs. reflow · stalled items derived on Home vs. read from
  Follow-ups · schedule strip "today" vs. "next day with items" · answer escalations inline
  vs. deep-link to CRM.
- **02 Sarah:** live sync polling vs. SSE · api auth = extend HMAC-`cid` (spec'd) vs. Supabase
  JWT verification in Express · escalation answers stay un-gated?
- **03 Website:** draft-preview infrastructure (per-org draft deployment vs. rendered
  snapshots — shapes the whole builder feel) · edit scope v1 (content/sections vs. full
  redesigns by chat) · turnaround posture (seconds vs. minutes → async UX) · page creation
  from chat in v1 · rankings/AI data source · GBP connection owned by Reviews (proposed) ·
  version retention.
- **04 Content:** one vs. two approvals per blog+Facebook pair ("Approve both" spec'd) ·
  scheduled publishing in v1? · markdown textarea vs. rich text · show IG/GBP as dimmed chips?
- **05 CRM:** fixture customers visible to real partners outside demo mode? · import merge:
  phone-match auto-merge vs. flag-for-review · manual "Add contact" allowed? · customer stages
  driven by Schedule/Invoices events or set manually?
- **06 Quotes:** accept = status flip vs. lightweight e-sign · public Decline button? ·
  structured tax? · deposit field feeding invoices? · `Q-1042` numbering in v1? · "Sent via
  Lead Answered" footer vs. white-label.
- **07 Schedule:** arrival-window framing now or after routing ships · availability editor
  moves fully (Settings keeps a signpost — spec'd) or lives in both · Google-embed day-route
  map from day one · month view in v1?
- **08 Invoices:** overdue derived at read-time vs. worker-stamped (auto-triggers the chase —
  decide with 10) · partial payments/`payments[]` now or when a rail exists · tax line.
- **09 Reviews:** "reviewed" detection (GBP polling vs. manual vs. reply-claimed — decides if
  the before→after wall is real) · ongoing-mode trigger (job-completed vs. invoice-paid) ·
  reminder fixed at +3 days vs. configurable.
- **10 Follow-ups:** rule editability (full cadence control vs. enable+tone only) · "Nudge now"
  outside business hours: override or defer-and-explain · persist `ChaseLogEntry` (new table) ·
  show the empty no-show group as a promise or hide it.
- **11 Analytics:** visits source (PostHog on client sites vs. first-party events) · rolling
  windows vs. calendar months · response-time denominator (which lead types count) · show-rate
  tile now (mocked) or after 07 ships no-show marking · dim unbuilt-module stats vs. gate the
  whole module.
- **12 Team:** `approveHardGates` owner-only forever or delegable · custom roles in v1 ·
  remove vs. deactivate members · can Office manage Crew · backfill role for existing
  notification recipients (Owner-equivalent vs. Office — live-behavior risk: today ANY
  recipient phone gets full owner powers) · crew app = filtered nav vs. "my day" view.
- **13 Settings:** one global save vs. per-tab actions · availability round-trip seam until the
  schema splits · add `Organization.ownerName` column · retention call = booking link vs. Sarah
  books it conversationally.

## After review

React to any doc by section number ("06 §3: change X"). When the set is approved, implementation
starts with 00-foundation on branch `app-ui`, then modules in the reading order above — per
`../APP_UI_PLAN.md` §5, code only on your explicit go.

---

**Reconciliation 2026-07-12:** a 7-agent audit compared every built module (00/01/02/05/07/09)
against these docs and the cross-page fixture story. Each affected doc now ends with a
"Reconciliation note (2026-07-12 audit)" — corrected statements + an explicit Deferred list.
Resolved open questions: widget shortcut = `⌘/`; Schedule month view = built; day-route map =
Leaflet/OSM. The needs-you badge rule is locked: approvals + open escalations, one number on
every surface.
