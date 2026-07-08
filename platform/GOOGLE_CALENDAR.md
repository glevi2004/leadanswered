# Google Calendar Integration — Implementation Plan (two-way)

> Status: **BUILT — code complete + unit-tested; needs the two web-console setups below to go live.**
> Implemented: `apps/api` (OAuth connect/callback/disconnect, `GoogleCalendarClient`, provider free/busy
> merge, outbound push, inbound push-webhook + incremental sync + reconcile, `applyContractorChange`,
> the dashboard `/appointments/change` route), `apps/worker` (calendar-sync push / inbound / poll +
> watch renewal), and `apps/web` ("Continue with Google" login, Calendar settings card, appointment
> cancel). Everything is gated behind `useGoogleCalendar()` / `CALENDAR_STATE_SECRET`, so it's inert
> until the env is provisioned. This doc stays the design spec.
>
> **Going live — the two console steps only you can do (token keys are already generated in `apps/api/.env`):**
> 1. **Google Cloud:** create an OAuth 2.0 web client; redirect URI = `${API_PUBLIC_URL}/google/callback`;
>    add the `calendar.events` + `calendar.freebusy` scopes; add test users (or verify the app). Paste
>    `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` into `apps/api/.env`, set `API_PUBLIC_URL` / `APP_BASE_URL`
>    / `GOOGLE_OAUTH_REDIRECT_URI`, and mirror `API_PUBLIC_URL` + `CALENDAR_STATE_SECRET` into `apps/web`.
> 2. **Supabase:** turn on **Google** as an Auth provider (for the "Continue with Google" login — §5A).
>
> Live verification: connect a test-user Google account → book via Sarah (event appears in Google) →
> move/cancel it in Google (Sarah asks you, then texts the customer on your "yes") → disconnect revokes.

---

## 1. Goal — a calendar that syncs BOTH directions

A contractor connects Google Calendar; from then on:
1. **Availability respects their real calendar** — Sarah never offers a slot they're busy on.
2. **Every booking Sarah makes lands on that calendar** (reschedules/cancels mirror through).
3. **Changes the contractor makes flow back to us** — if they move or cancel an estimate in Google, our
   DB updates and (with the contractor's OK) the lead is told.

Two ways a contractor arrives, both one code path:
- **Case A — "Log in with Google."** New auth option (today auth is Supabase email+password, invite-only).
- **Case B — logged in with email/password**, later clicks **"Connect Google Calendar."**

**Key insight — auth and calendar access are separate grants.** Signing in with Google proves identity;
it does NOT give durable Calendar API access (Supabase requests profile/email only and doesn't persist
provider tokens). So **calendar connection is always its own OAuth grant we own**, regardless of login.
Both cases funnel into the same "Connect Google Calendar" flow.

---

## 2. The unifying idea — "an appointment change is ONE action, from any surface"

The most important design decision, and what makes two-way clean:

**A contractor moving or cancelling an appointment is the same logical event whether they do it on our
dashboard, in their Google Calendar, or by texting Sarah. All three are triggers into ONE shared
handler with ONE behavior.**

```
applyContractorChange(appointmentId, { type: "cancel" | "reschedule", newStartIso? }, { source, pushToGoogle })
  1. Update OUR DB (Scheduler.cancel / .reschedule — the EXCLUDE constraint still governs).
  2. If the change did NOT originate in Google AND the calendar is connected → push it to Google
     (patch/delete the event). If it originated IN Google, skip — it's already there (loop prevention, §9).
  3. Stage a "let the lead know" draft (the message about the move/cancel), in Sarah's own words.
  4. Ask the CONTRACTOR to confirm before the lead is texted — the HARD GATE we already built
     (agent/contractorAgent.ts). The lead is messaged ONLY on an explicit yes.
  5. On yes → Sarah texts the lead (agent-composed) + records it on the lead's thread.
```

The **only** thing that differs by surface is *where the confirm happens*:
- **Dashboard:** they cancel/move → inline "Text {lead} to let them know? [Review & send] / [No]".
- **Google:** detected via sync (§9) → Sarah SMS-es the contractor: "You moved {lead}'s estimate to
  Thu 10am — want me to let them know? (yes/no)" → the existing contractor-agent yes/no path sends it.
- **SMS (contractor agent):** a natural third trigger later — "cancel Levi's Tuesday visit" → `find_leads`
  → same handler.

Why this matters: the dashboard has **no** cancel/reschedule action today (it's read-only — verified in
`apps/web`), and the old plan didn't cover contractor-initiated changes at all. Building two-way as a
*Google* feature would duplicate logic the dashboard needs anyway. Building the **action** once, with
Google as one trigger, avoids that.

> Reuse: step 3+4 are exactly the contractor agent's staged-draft + hard-gate confirm
> (`prepare_message_to_lead` → owner yes → send). The Google/SMS confirm rides that path; the dashboard
> confirm is the same staged draft shown inline. No new "notify" primitive.

---

## 3. Core architectural principle (refined for two-way)

**Our Postgres DB stays the booking authority for SARAH'S bookings. Google Calendar is (1) a free/busy
SOURCE, (2) a SYNC TARGET, and (3) an INBOUND TRIGGER for contractor-made changes — but Google is never
consulted inside the booking transaction.**

Why: the no-double-booking guarantee is a Postgres `btree_gist` EXCLUDE constraint — a hard,
transactional lock. Google offers no equivalent race guarantee and adds latency + eventual consistency.

The two-way carve-out (does NOT violate the above):
- A contractor's **manual edit to one of OUR events in Google** is accepted and **mirrored into the DB**
  — their direct action wins for that one appointment (we reschedule/cancel our row to match).
- Sarah's **bookings** still go only through the Scheduler + EXCLUDE constraint; Google is read for
  free/busy but is never the arbiter of a booking race.
- Consequences unchanged: **availability** = standing windows − (our appointments + Google busy);
  **booking** commits to our DB first, then a best-effort job pushes to Google — a Google failure never
  fails or blocks a booking.

---

## 4. Where the code lives

**`apps/api` owns everything Google** (OAuth, API calls, token refresh, encryption, sync). `apps/web`
shows a Connect button + status and the dashboard appointment actions (which call api routes). Keeps all
token handling in one deployable.

- OAuth initiate/callback + the **inbound webhook** → Express routes in `apps/api`.
- Free/busy read, event push, incremental sync → `apps/api/src/calendar/google/` (`GoogleCalendarClient`).
- Sync jobs (push + inbound reconcile + channel renewal) → `apps/worker` (`calendar-sync` queue).
- The shared **appointment-change handler** (§2) → `apps/api` (`appointmentChange.ts`), called by the
  dashboard route, the inbound reconcile, and later the contractor agent.

---

## 5. Two separate Google grants — LOGIN (Supabase) and CALENDAR (ours). Both in v1.

They're independent (see §1's key insight): the login grant proves identity; the calendar grant is the
durable API token. A Google login gives us NO calendar access — the calendar is always its own connect step.

### 5A — Log in / sign up with Google (Case A auth) — in scope

- **Mechanism:** enable **Google as a Supabase Auth provider** (Supabase's built-in social login). The web
  app gets a "Continue with Google" button on the login + signup screens; Supabase runs the OAuth and
  returns a session. We get identity (email/profile) only — no calendar scopes, no durable provider token.
- **Invite-only preserved:** access stays gated. A Google sign-in is allowed only for a contractor whose
  email is already invited/allowlisted — Google is an alternative **credential**, not open public signup.
  *(Opening Google signup to anyone is a deliberate change to the invite model — flag it, don't assume.)*
- **Account linking by email:** a contractor who signed up with email/password and later clicks "Continue
  with Google" on the same email links to the **same** contractor account (Supabase identity linking) — no
  duplicate.
- **Chains into calendar connect:** right after a Google sign-in, offer a one-click "Connect your calendar
  too" that runs 5B. Still a separate grant — logging in with Google never auto-connects the calendar.

### 5B — Connect Google Calendar (the calendar grant)

Authorization-code flow, **offline** (for a refresh token):
- **Scopes (least privilege):** `calendar.events` (create/update/delete our events + read our events'
  state back), `calendar.freebusy` (busy blocks). *(Two-way reads OUR events' changes via events.list on
  our own event ids, which `calendar.events` covers — no full-calendar read scope needed.)*
- **Auth URL:** `access_type=offline` + `prompt=consent` + a signed **`state`** (contractorId + nonce, CSRF).
- **Endpoints (apps/api):** `GET /google/connect` (verify session, 302 to Google), `GET /google/callback`
  (validate state, exchange code, fetch primary calendar id, **encrypt** + store tokens, register the
  **watch channel** §9, `status=connected`, 302 back to the dashboard), `POST /google/disconnect` (stop
  the watch channel, revoke at Google, clear tokens).
- **Token refresh:** on demand in `GoogleCalendarClient`; on `invalid_grant` → `status=needs_reconnect`
  and fall back to DB-only availability (never errors the agent).

---

## 6. Data model

**`CalendarConnection` exists** (`contractorId`, `provider`, `externalCalendarId`, `accessToken`,
`refreshToken`, `tokenExpiresAt`, `status`, `@@unique([contractorId, provider])`). **Add for two-way**
(additive migration):
- `syncToken String?` — incremental-sync cursor (Google `events.list` nextSyncToken).
- `channelId String?`, `resourceId String?`, `channelExpiresAt DateTime?` — the push-notification watch
  channel (§9); renewed before expiry.
- optional `scope String?`, `email String?` (connected account, for display).
- `status` values: `disconnected | connected | needs_reconnect`.
- Encrypt `refreshToken`/`accessToken` at rest (§13).

**`Appointment` mapping exists:** `externalProvider`, `externalCalendarId`, `externalEventId`,
`syncState` (`local_only | pending_push | synced | push_failed`), `syncedAt`. **Add for loop
prevention:** `externalEtag String?` (or reuse `syncedAt` as the "last version we wrote" marker — §9).

---

## 7. Outbound: behind the existing port (unchanged surface)

The agent, tools, intake engine, and availability math talk **only** to `CalendarProvider`.
1. **`getBusy(range)`** — if `connected`, **merge** our busy times with Google `freebusy.query` for the
   same window (one call), returned as `TimeRange[]`. `computeOpenWindows` already subtracts it — zero
   change to availability math. Google error/timeout → DB-only busy (fail-open). Cache per turn.
2. **`book()` / `reschedule()` / `cancel()`** — after the DB commit, set `syncState=pending_push` and
   enqueue a `calendar-sync` push job. The result to the agent never waits on Google.

Booking now originates in BOTH the scripted intake (`book_appointment` tool) and the agent phase
(reschedule/cancel) — both go through these same tools → the port, so the seam is unchanged.

---

## 8. Availability semantics

`open windows = standing weekly windows (contractor-set, local tz) − (our active appointments + Google
busy blocks)`. The contractor still DEFINES when they take estimates (the drag-paint calendar); Google
only prevents offering a slot they're already busy on. We do NOT derive business hours from Google.

---

## 9. Inbound: reading the contractor's Google changes back (the two-way half)

**Detection — push webhooks AND polling, together (not redundant — each closes a gap the other can't).**
- **Webhook = speed.** On connect, call `events.watch` on the primary calendar → Google POSTs to
  `POST /google/notifications` on any change. On a notification (it carries no diff), run an
  **incremental sync**: `events.list(syncToken)` → only changed events + a fresh `nextSyncToken` (first
  sync seeds the token; `410 Gone` → reseed). This is the fast path — the contractor moves an event and
  Sarah reacts in seconds.
- **Channel renewal:** channels expire in days — a `calendar-sync` cron re-watches before `channelExpiresAt`.
- **Polling = guaranteed completeness.** A periodic worker ALSO runs the same incremental sync per
  connection, on a relaxed cadence (~15-30 min). It's the safety net for the three ways webhooks silently
  fail: (1) Google push is **best-effort** by their own docs — a notification can just be dropped;
  (2) a **channel lapses** if a renewal ever slips → no webhooks until re-registered; (3) a webhook
  **missed during a deploy**, on a calendar that then goes quiet, is lost forever (nothing triggers the
  catch-up sync). Polling reconciles against Google's actual state via the `syncToken`, so it picks up
  anything the webhook dropped — it can't permanently miss a change. It also lets inbound sync work in
  dev without a public webhook.

> **Why both, not one:** the webhook carries the common case fast; the poll is insurance. BECAUSE the
> webhook does the fast path, the poll can run infrequently (it's not the primary) — so you get
> near-real-time AND eventual-consistency guarantees at the cost of one cheap incremental sync every so
> often. Webhook-only can silently lose changes; poll-only is correct but sluggish. Together they're
> complementary. *(If v1 wants to skip the webhook infra entirely, poll-only is a valid — just slower —
> starting point; add the webhook later for latency.)*

**Reconciliation — for each changed event:**
- **Maps to one of OUR appointments** (`externalEventId` match):
  - time changed → `applyContractorChange(reschedule, newStart, { source: "google", pushToGoogle: false })`.
  - deleted/cancelled → `applyContractorChange(cancel, { source: "google", pushToGoogle: false })`.
  - → mirrors to DB + asks the contractor before texting the lead (§2).
- **A foreign event** (contractor's personal/other) → not an appointment; it's just a busy block that
  §7.1 already honors at read-time. Nothing to store, no lead, no appointment.

**Loop prevention (critical — the old doc never mentioned it).** When WE push a change (dashboard/SMS
origin), Google's watch fires our own webhook. We must NOT reprocess our own write as a contractor edit
(that would re-ask "tell the lead?" / double-notify). Guard: on every push, store the returned event
`externalEtag` (+ `syncedAt`); when the inbound event's etag/updated-stamp matches what we last wrote,
**skip**. Belt-and-suspenders: ignore inbound for an appointment while `syncState=pending_push`.

**Conflict/authority:** a contractor Google edit is authoritative for THAT appointment — mirror it. If it
lands on a slot our DB considers taken (rare race), accept the contractor's calendar as truth for their
own time, mirror it, and flag it in the dashboard sync status rather than silently dropping either side.

---

## 10. Worker jobs (`apps/worker`, `calendar-sync` queue)

Mirrors the existing pattern (`queue.ts` → `enqueueNudge`/`enqueueEscalationSla`).
- **push** `(appointmentId, op ∈ {create,update,delete})** — create/patch/delete the Google event
  (summary "Estimate — {lead}", description + **lead phone**, location = address, tz-correct). Store
  `externalEventId` + `externalEtag` + `syncState=synced`. Idempotent on `appointmentId`+`externalEventId`
  (a retry that finds an event patches, never duplicates). BullMQ backoff; after N tries → `push_failed`
  + a soft dashboard warning. The booking stays valid regardless.
- **inbound-sync** `(connectionId)` — incremental `events.list(syncToken)` → reconcile (§9). Runs from
  the webhook AND on the polling schedule.
- **renew-watch** `(connectionId)` — re-`events.watch` before `channelExpiresAt`.

---

## 11. Dashboard / onboarding UX

- **Settings → "Calendar" card:** Not connected → **[Connect Google Calendar]**, or Connected as
  {email} · [Disconnect] (+ a "last synced / sync issue" line). Reads `CalendarConnection.status`.
- **NEW — appointment actions (needed regardless of Google):** the appointments view gets **Cancel** and
  **Reschedule** actions → a contractor-auth api route → `applyContractorChange(..., { source:
  "dashboard", pushToGoogle: true })` → inline **"Text {lead} to let them know? [Review & send] / [No]"**
  (the staged draft, editable) → on send, Sarah texts the lead. This is the dashboard trigger of §2.
- **Onboarding wizard:** optional, skippable "Connect calendar" step.
- **Case A (log in with Google):** after sign-in, offer one-click "Connect your calendar too" (same grant);
  independent of login.

---

## 12. Google Cloud setup + OAuth verification (THE LONG POLE — start first)

- Google Cloud project + OAuth 2.0 web client, redirect URI
  `https://leadanswered-production.up.railway.app/google/callback`; the push webhook domain must be a
  **verified domain** in the Cloud project (a `events.watch` requirement).
- Calendar scopes are "sensitive/restricted" → publishing to all contractors needs Google **OAuth app
  verification** (consent screen, public privacy policy + homepage, demo video, possibly a **CASA
  security assessment**). Weeks — begin immediately, in parallel. Until verified: up to **100 test users**
  on the consent screen (fine for pilots).

---

## 13. Security

- **Encrypt tokens at rest** — AES-256-GCM, key from `CALENDAR_TOKEN_KEY`; encrypt on write, decrypt on
  use; never log tokens.
- **Signed `state`** (HMAC) on OAuth → CSRF + binds callback to the initiating contractor + short TTL.
- **Webhook authenticity** — validate the `X-Goog-Channel-ID`/`X-Goog-Resource-ID` against the stored
  channel, and a channel `token` we set on `watch`; ignore anything that doesn't match (don't act on
  spoofed POSTs). The webhook only triggers a sync — it never trusts a body.
- **Least-privilege scopes**; **disconnect revokes** at Google + stops the watch channel + clears tokens.
- Session check on `/google/connect` so a contractor connects only their own calendar.

---

## 14. Edge cases

- **Revoked/expired refresh token** → `needs_reconnect`, DB-only availability, nudge to reconnect; never
  errors the agent.
- **Google down / rate-limited** → `getBusy` fails open to DB busy; push + inbound-sync retry on the queue.
- **Loop (our own push echoing back)** → §9 etag/`pending_push` guard.
- **Contractor edits in Google + lead reschedules via Sarah at the same time** → last write to the DB wins
  under the EXCLUDE constraint; the inbound reconcile flags a mismatch to the dashboard rather than dropping.
- **Multiple/secondary calendars** → v1 reads busy + writes to the primary (or a chosen
  `externalCalendarId`); multi-calendar later.
- **All-day / tentative events** → busy by default (configurable later).
- **Deleting the CalendarConnection** cascades; appointments keep `externalEventId` for audit.
- **Timezone/DST** → handled centrally; Google gets RFC3339 + IANA zone.

---

## 15. Rollout phases

1. **Google login + Connect + read (freebusy)** — enable **Google auth** (§5A: Supabase provider,
   invite-gated, email-linked) and the calendar **connect** grant (§5B): OAuth, token storage/refresh,
   `getBusy` merge so Sarah stops offering busy slots. After a Google sign-in, one-click connect. Highest
   value, lowest risk, no writes to Google yet.
2. **Outbound push** — booked/rescheduled/cancelled sync to Google (`Appointment.external*` + `syncState`),
   idempotent + retried.
3. **The appointment-change action + inbound two-way** — build `applyContractorChange` + the dashboard
   Cancel/Reschedule actions + the "ask before texting the lead" confirm (dashboard inline first), THEN
   the Google `events.watch` webhook + incremental sync + reconcile + loop prevention, so a Google-side
   move/cancel routes into the same handler (SMS confirm). Ship the dashboard trigger before the Google
   trigger — same handler, lower infra risk.
4. **Hardening + verification** — sync-status/reconnect UI; polling safety net; OAuth verification → public.
5. **Later:** contractor-agent SMS trigger ("cancel Levi's visit"); multi-calendar; Outlook via the same port.

---

## 16. Files to add / change

- **New `apps/api/src/calendar/google/`**: `client.ts` (OAuth exchange, refresh, freebusy.query,
  events insert/patch/delete, events.list incremental, events.watch), `crypto.ts` (token encrypt/decrypt),
  `oauthRoutes.ts` (connect/callback/disconnect), `notifyRoute.ts` (`POST /google/notifications`).
- **New `apps/api/src/appointmentChange.ts`** — the shared `applyContractorChange` handler (§2): DB
  change → conditional Google push → staged lead-notice draft → route the confirm. Reuses the
  contractor-agent hard-gate.
- **`apps/api/src/calendar/provider.ts`** — `getBusy` merges Google busy; book/reschedule/cancel set
  `syncState=pending_push` + enqueue push.
- **New `apps/api/src/routes/appointments.ts`** — contractor-auth Cancel/Reschedule → `applyContractorChange`.
- **`apps/api/src/queue.ts`** — `calendar-sync` queue: `enqueueCalendarPush`, `enqueueInboundSync`,
  `enqueueWatchRenewal`.
- **`apps/worker/src/`** — handlers for push / inbound-sync / renew-watch + register in `index.ts`;
  a polling scheduler for inbound-sync.
- **`apps/api/src/store/`** — `getCalendarConnection` / `upsertCalendarConnection` (+ syncToken/channel
  fields); `Appointment.external*`/`etag`/`syncState` writers; reschedule/cancel already exist.
- **`packages/db/prisma/schema.prisma`** — additive: `CalendarConnection.{syncToken,channelId,resourceId,
  channelExpiresAt,scope,email}`, `Appointment.externalEtag` → one small migration.
- **`apps/api/src/app.ts`** — mount Google OAuth + notifications + appointments routes.
- **`apps/web` + Supabase Auth (Case A — in scope)** — enable **Google as a Supabase auth provider**:
  "Continue with Google" on login + signup, **gated by the invite allowlist**, **linked by email** to any
  existing email/password account (§5A); after a Google sign-in, a one-click "Connect your calendar too."
- **`apps/web`** — Calendar settings card + **appointment Cancel/Reschedule actions + the notify-lead
  confirm** + optional onboarding step.
- **`apps/api/src/env.ts`** — `GOOGLE_CLIENT_ID/SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `CALENDAR_TOKEN_KEY`,
  webhook base URL.
- **Docs**: SCOPE (calendar "shipping" + the appointment-change action), TESTING (connect + change flows).

---

## 17. Testing

- **Unit (mocked Google client):** free/busy merge subtracts correctly in `computeOpenWindows`;
  token-refresh + `needs_reconnect` fallback; `state` + webhook HMAC verify; encrypt/decrypt round-trip;
  push idempotency (no duplicate events); **inbound reconcile** (a Google move → our appointment
  rescheduled + a staged lead-notice draft, NOT auto-sent); **loop prevention** (our own push echoed back
  is skipped).
- **`applyContractorChange`:** dashboard-source cancels → DB cancelled + Google delete enqueued + draft
  staged, lead texted only after confirm; google-source cancels → DB cancelled, NO Google push, contractor
  SMS-asked, lead texted only on yes.
- **Integration:** OAuth callback stores an encrypted connection + registers a watch; a booking creates a
  real event (right tz) in a Google **test** account; a manual move in that account flows back.
- **E2E (`apps/api/src/e2e`):** connected contractor with a busy block → Sarah won't offer it; booking
  "8 am" → DB appt + Google event at 8 am local.
- **Fail-open:** Google unreachable → availability + booking still work; sync `push_failed`, no agent error.
- **Manual:** connect a test-user account; book → appears in Google; move/cancel in Google → Sarah asks
  the contractor → lead texted on yes; cancel on the dashboard → same; disconnect revokes + stops the watch.

---

## 18. Out of scope (v1)

Multi-calendar selection, shared/team calendars, Microsoft Outlook, deriving business hours from Google —
all fit the same port later. *(Two-way sync is now IN scope — see §2, §9, §15.3.)*
