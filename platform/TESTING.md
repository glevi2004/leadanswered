# Lead Answered — Full Manual Test Plan

A live-user QA pass over **every** current capability (frontend + backend). Work top-to-bottom; check each box as you confirm it. If something fails, note the test ID + what you saw.

> Goal: confirm the whole product works end-to-end before we build new features.

---

## 0. Setup

**URLs**
- App (product): `https://app.leadanswered.com`
- Marketing: `https://leadanswered.com`
- API health: `https://leadanswered-production.up.railway.app/health`

**Accounts**
- Admin (you): `levi@leadanswered.com` / `LeadAnswered-e266051e`
- Contractor (Apex Roofing owner): `levigabrielcramos@gmail.com` / `LeadAnswered-d50f2b4d`

**You'll need**
- A phone that can send/receive SMS (to play the "homeowner").
- The contractor's **Twilio number** (shown on the dashboard / set in `/admin`).
- An email account to forward a "lead" email from.

**Known constraints (not bugs)**
- **Cold inbound is OFF in prod** (`ALLOW_INBOUND_LEADS` unset) → a text to the number from an *unknown* phone with *no existing conversation* is ignored. Start a Sarah conversation via the **email-intake** flow (§7) or reply within an existing thread. (Ask me to flip the flag if you want cold texts to auto-start.)

**Quick smoke**
- [X] `GET /health` returns `{"status":"ok"}`.
- [X] `app.leadanswered.com/sign-in` loads, **styled** (green accents, Inter font).
- [X] `leadanswered.com` still shows the marketing page.

---

## 1. Authentication

- [X] **1.1 Sign in (happy path).** Sign in as the contractor → lands on `/dashboard`.
- [X] **1.2 Wrong password.** Bad password → inline error, no crash.
- [X] **1.3 Admin routing.** Sign in as admin → lands on `/admin` (not the dashboard).
- [X] **1.4 Gating.** While signed out, open `/dashboard`, `/admin`, `/onboarding` directly → each redirects to `/sign-in`.
- [X] **1.5 Sign out.** From the dashboard sidebar → "Sign out" → back to `/sign-in`; revisiting `/dashboard` redirects to sign-in.
- [X] **1.6 Forgot password.** `/sign-in` → "Forgot your password?" → enter the contractor email → "reset link on its way" confirmation, and the reset email arrives (via Postmark).
- [X] **1.7 Reset link (only if you got the email).** Click it → set a new password → signed in. (Then reset it back via the script if needed.)
- [X] **1.8 Reset email is branded** (`platform/EMAIL.md` applied to Supabase). Trigger a reset (1.6); the email shows the **"A" logo + "Lead Answered"** header, the **green CTA button**, body copy per §2.1, the raw-link fallback, and the **"Every lead, answered in 60 seconds" + "© 2026 Lead Answered"** footer.
- [X] **1.9 Email renders everywhere.** That same email looks correct in **Gmail desktop + Gmail mobile** (logo loads, button is tappable, layout doesn't break, no clipped/forwarded look).
- [X] **1.10 Invite email is branded.** When you run 2.3, the invite email uses the same template (invite subject/copy per §2.1) — not Supabase's plain default.
- [ ] **1.11 Personal signature.** An email you send from your Hostinger mailbox carries the §3 signature (the "A" logo, green divider, name/title, `leadanswered.com`, tagline).

---

## 2. Admin console (`/admin`)

- [X] **2.1 List + status chips.** Each contractor is a card: company, owner email, slug, number, and **two chips** — **Account** (New / Onboarded / Invited / Live) + **Line** (pending / verified / failed). A freshly-created contractor reads **New**. Hovering a chip shows its meaning.
- [X] **2.2 Create contractor (no invite).** Fill "New contractor" → **"Create contractor"** → success ("Onboard them next"); the new row appears as **New**, and **NO email is sent** (Postmark outbound stays flat). Creating no longer invites.
- [X] **2.3 Onboard — admin runs the wizard.** Open the contractor → **Onboard** → `/admin/[id]/onboard` → fill the whole wizard → **"Finish & send invite"** → back on the contractor page the status is **Invited**, and the owner gets the **branded** invite email (per EMAIL.md — see 1.10). Exactly one invite is sent.
- [X] **2.4 Contractor accepts → welcome → dashboard.** Open the invite (same browser) → set a password → a **Welcome** screen (NOT the wizard) → "Go to my dashboard" → the **already-configured** dashboard. The Account chip flips to **Live**.
- [X] **2.5 Manage — Save ≠ invite.** On `/admin/[id]`, change company / owner / number / slug / line-verification → **Save changes** → reload shows the change, **and NO email is sent**. Editing never invites.
- [X] **2.6 Manual send/resend invite.** The Invite card sends exactly one email; it's **disabled until onboarded**, reads "Send invite" before the owner has an account and "Resend invite" after. Re-running **Onboard / Edit setup** on an already-invited contractor does **not** re-send the invite.
- [X] **2.7 Admin can't see the dashboard.** As admin, opening `/dashboard` redirects to `/admin`.

---

## 3. Onboarding wizard (admin-run — `/admin/[id]/onboard`)

Onboarding is **admin-led**: in `/admin`, open a contractor and click **Onboard** to run the wizard on their behalf (usually on a call). It's pre-filled with current config. The old contractor-facing `/onboarding` route is retired (it redirects home).

- [X] **3.1 Step rail.** Left rail shows 6 steps (Business → Service area → Availability → Loop me in → Notifications → Review) with the current step active and prior steps green/checked.
- [X] **3.2 Mobile progress.** Narrow the window → the rail hides and a top progress bar ("Step X of 6") appears.
- [X] **3.3 Step 1 — Business.** Company name, assistant name, persona notes editable + pre-filled. **Project types are a chip picker** (NOT a comma text box, NO underscores): defaults show as removable chips ("Roof repair", "Roof replacement"); clickable suggestions add a chip; typing a custom one + Enter adds it verbatim; the × removes one. Saved/reloaded values round-trip exactly as typed.
- [X] **3.4 Gating.** Clear "Company name" → "Continue" is disabled until refilled. (Step 2: clearing "Base ZIP" disables Continue.)
- [X] **3.5 Back/Continue.** Navigate forward and back — entered values persist across steps.
- [ ] **3.6 Step 3 — Availability calendar + timezone.** A **Timezone** picker (full IANA list; defaults to America/New_York) sits above a week view (days as columns, 06:00–21:00 in 30-min rows); the grid help text reads "shown in <chosen tz>". Pick a timezone. **Click-drag** paints a block green; dragging back over green clears it. Paint a Mon morning block, a **split shift** (Tue morning + evening), and a **half-hour** — all stick and merge into blocks. Leave the step and return → selections + timezone persist. Review shows the **Timezone** row + readable ranges (e.g. "Mon 8:00–12:00 · Tue …").
- [X] **3.7 Step 5 — Notifications.** Add a recipient, toggle event checkboxes.
- [X] **3.8 Step 6 — Review.** Shows an accurate read-only summary of all your entries.
- [X] **3.9 Finish & invite.** "Finish & send invite" → saves + emails the owner's invite → lands back on `/admin/[id]` with status **Invited**. Re-open via **Edit setup** → your changes persisted, and no second invite is sent.

---

## 4. Dashboard UI

- [X] **4.1 Sidebar items.** Overview, Leads, Appointments, Settings — each navigates correctly; the active item is highlighted.
- [X] **4.2 Collapse.** Click the trigger (top-left) → sidebar collapses to icons; labels appear as tooltips on hover.
- [X] **4.3 Persist.** Collapse it, reload the page → it stays collapsed.
- [X] **4.4 Mobile.** Narrow window → sidebar becomes a slide-in drawer (trigger opens it).
- [X] **4.5 Theme toggle.** Top-right sun/moon → flips light/dark across the whole app; reload keeps your choice.
- [X] **4.6 Overview.** KPI cards (Total leads / Qualifying / Booked / Upcoming visits) show real numbers; "Recent leads", "Your line" (number + its Twilio toll-free line-verification badge), and "Upcoming appointments" render.
- [X] **4.7 Leads list.** `/dashboard/leads` → table of all leads (name, phone, project, town, status badge, first seen). Columns collapse responsively on narrow screens.
- [ ] **4.8 Lead detail.** Click a lead → the **full Sarah ↔ homeowner SMS thread** as chat bubbles (homeowner left/grey, Sarah right/green, with names + times), plus that lead's appointments and any escalations.
- [ ] **4.9 Appointments.** `/dashboard/appointments` → "Upcoming" and "Past & cancelled" sections with lead, time, status badge; lead names link to detail.
- [ ] **4.10 Settings (decoupled).** `/dashboard/settings` → all config sections on one page as cards (NOT the wizard). Edit a field → "Save changes" → "Saved ✓"; reload shows the change.
- [ ] **4.11 Equivalence.** A change saved in Settings shows up if you (as admin) then open the wizard (`/admin/[id]/onboard`), and vice-versa.

---

## 5. Tenant isolation (security)

- [ ] **5.1 Other tenant's lead 404s.** As the contractor, open `/dashboard/leads/<a-random-or-other-id>` → **404**, never another company's data.
- [ ] **5.2 Scope.** The dashboard only ever shows leads/appointments belonging to the signed-in contractor.

---

## 5b. Concurrency & data integrity (the guarantees)

These are the bugs the integrity rebuild fixed (see SCOPE → "Data Integrity & Concurrency Invariants"). Manual checks:

- [ ] **5b.1 No double-booking.** Book a slot; then try to book the **same** slot for a different lead → refused (Sarah re-offers other times). Repeat the *same booking flow* several times fast → you still end up with **exactly one** appointment, never duplicates.
- [ ] **5b.2 Availability excludes booked.** After a slot is booked, ask Sarah for times → that slot is no longer offered.
- [ ] **5b.3 One booking per lead.** A lead with an active booking can't create a second — Sarah treats a re-book as "you already have a time, want to move it?" (reschedule).
- [ ] **5b.4 Reschedule/cancel hit the right one.** With a single active appointment, reschedule and cancel act on it unambiguously; a cancelled slot frees up to be booked again.
- [ ] **5b.5 Duplicate webhook = one reply.** (Hard to trigger by hand — covered by automated tests.)

**Automated proof (the real guarantee):** the in-memory test store *cannot* enforce DB constraints, so integrity is proven only against real Postgres:
- `pnpm -r test` → Tier-A logic (incl. `apps/api/src/integrity.test.ts`).
- **Tier B** (keystone — concurrent booking of the same slot yields exactly one appointment):
  ```
  createdb leadanswered_test
  DATABASE_URL=postgres://…/leadanswered_test pnpm --filter @leadanswered/db migrate:deploy
  TEST_DATABASE_URL=postgres://…/leadanswered_test pnpm --filter @leadanswered/api test:integration
  ```
  Must be green before shipping booking changes.

## 6. Sarah — conversational behavior (now automated)

**Sarah's conversational behavior is covered by the automated E2E suite** — real Claude driven through
full conversations, asserting on outcomes + a Sonnet judge. It's the source of truth for the specific
scenarios (qualification in/out of area + referral escalation, tenant → homeowner hand-off, availability
windows, timezone-correct booking incl. "8 am books 8 AM local", reschedule/cancel, idempotency,
price/tone/service-area guardrails, escalation relay). See `apps/api/src/e2e/README.md`.

```bash
RUN_E2E=1 pnpm --filter @leadanswered/api test:e2e      # run before shipping any agent change
```

Run it **per feature** as you finish it — that replaces most of the old manual §6 typing. What still
needs a **human** (things E2E can't see) is below:

- [ ] **6.1 Real SMS delivery.** From an actual phone, text the contractor's Twilio number in an existing
  thread → Sarah's reply actually arrives on the handset within seconds (proves Twilio send/receive, not
  just the agent logic the E2E suite covers).
- [ ] **6.2 Dashboard reflects a booking.** After a booked conversation, the **Appointment** shows in
  Overview "Upcoming", the Appointments page, and Lead detail — with the time in the contractor's
  timezone — and the lead status badge reads **Booked**.
- [ ] **6.3 Contractor notification arrives.** The owner's real phone/email actually receives the
  "New booking / Qualified lead / turn-away / hand-off / escalation" message (delivery, not just capture).
- [ ] **6.4 Langfuse trace.** A live conversation produces a readable trace (tool calls, timings) in
  Langfuse for debugging.

---

## 7. Email-parse lead intake

- [X] **7.1 Forward a lead.** Send/forward an email to `leads+<slug>@leads.leadanswered.com` (slug from `/admin`). Include a lead **name + phone number** in the body (use *your* phone as the lead so Sarah texts you).
- [ ] **7.2 Lead created.** A new lead appears on the dashboard (source = email).
- [X] **7.3 Opening SMS.** Sarah sends the opening text to the lead's phone within seconds.
- [X] **7.4 Continue.** Reply → full qualify/booking conversation works (re-run §6 against this lead).
- [ ] **7.5 Idempotency.** Forwarding the same email twice does not create two leads (Postmark `MessageID` dedupe).
- [ ] **7.6 One lead per contact.** A *different* email (new MessageID) from a phone that already has a lead — or an email then a missed call from the same phone — **re-engages the existing lead**, never creating a duplicate (§4).

---

## 8. Escalation (loop-in)

- [ ] **8.1 Trigger.** In a conversation, ask Sarah something in your **escalation topics** (e.g. "do you offer financing?") → instead of guessing, Sarah says she'll check with the team; an **open escalation** appears on the Lead detail.
- [ ] **8.2 Owner alert.** The escalation is texted to the contractor/owner number.
- [ ] **8.3 Relay.** Reply (as the owner) to that escalation text → your answer is relayed back to the homeowner; the escalation flips to **resolved**.
- [ ] **8.4 SLA + expiry.** If the owner does NOT answer the loop-in, the owner gets a louder **reminder** (and the customer may get one positive "still on it" during business hours — never an admission of delay). Still unanswered → the escalation goes **`expired`** with an urgent owner-only alert; the customer is never told we couldn't reach the team.

---

## 9. Quiet-lead nudge (worker + Redis)

- [ ] **9.1 Go quiet.** Start a conversation, then stop replying. After the nudge delay (~30 min) the worker sends **one** gentle follow-up SMS to the lead.
- [ ] **9.2 Alert.** If a recipient is subscribed to `lead_unresponsive`, they get a "Quiet lead" alert (SMS, and email if a Postmark-deliverable address) — and it reads as a *quiet-lead* nudge, **not** "turned away".
- [ ] **9.3 No double-nudge.** Replying before the delay cancels/replaces the nudge (no follow-up fires).
- [ ] **9.4 Context-aware + one per interaction.** The nudge is written in context (not a canned estimate line), fires **at most once per interaction**, is **skipped while an escalation is open**, and doesn't fire outside business hours. A returning contact after a gap re-arms a fresh single nudge.

---

## 10. Notifications

- [ ] **10.1 Booking.** On a booking, recipients subscribed to `booking_confirmed` get a notification with the lead + time.
- [ ] **10.2 Qualified.** On qualification, `new_qualified_lead` subscribers are notified.
- [ ] **10.3 Channels.** SMS and email both arrive for subscribed recipients (Postmark is approved — emails deliver to any address).

---

## 11. Observability

- [ ] **11.1 Langfuse traces.** In Langfuse (US cloud), each Sarah turn shows a trace with the model (`claude-haiku-4-5`) + the tool calls (`qualify_lead`, `get_availability`, `book_appointment`, etc.).
- [ ] **11.2 Railway logs.** `railway logs` (api) shows inbound webhooks + agent activity; the worker logs `processing the nudge queue` with no errors.

---

## 12. Cross-cutting polish

- [ ] **12.1 Light + dark.** Every page (auth, admin, wizard, dashboard, settings) looks right in both themes.
- [ ] **12.2 Responsive.** Phone-width: sidebar drawer, wizard progress bar, leads table all behave.
- [ ] **12.3 No console errors.** Browser devtools console is clean on each page.
- [ ] **12.4 Deploy is live source of truth.** Everything above is tested on `app.leadanswered.com` (not localhost).

---

## 13. Missed-call text-back

> Requires setup: (a) the Twilio number's **Voice** webhook → `/webhooks/twilio/voice`; (b) **conditional call forwarding** (no-answer + busy) enabled on the "contractor" phone → the Twilio number (`+18444157642`). Use two phones: **C** = contractor (forwarding on), **H** = homeowner (the other number).

- [ ] **13.1 Missed call → text.** From **H**, call **C**'s real number; don't answer. Within seconds **H** receives Sarah's opening SMS — she apologizes for missing the call and **asks how she can help**. She does NOT assume an estimate or ask for an address yet.
- [ ] **13.2 Lead created.** A new lead appears on the dashboard with **source = `missed_call`** (contact = H's number).
- [ ] **13.3 New-project intent → book.** Reply from **H** with a new job (e.g. "I need a quote for a new roof") → Sarah qualifies (ownership/address) and books, exactly as §6.
- [ ] **13.4 Non-estimate intent → loop-in.** In a *fresh* missed call, reply with a non-sales intent (e.g. "just have a question about my existing roof") → Sarah does NOT push an estimate or ask for an address; she loops in the owner via **escalation** (an open escalation appears on the lead; the owner is texted). Owner replies → the answer relays back to **H** (per §8).
- [ ] **13.5 Recency / one lead per contact.** A rapid redelivery of the *same* call does **not** create a second lead or text. A repeat call **within ~1h** of the last activity is skipped (no re-text). A call **after ~1h** re-engages the **same** lead with a fresh "welcome back" text — it never creates a duplicate lead (§4). (To exercise the >1h path without waiting, shrink `RECENT_CONVERSATION_WINDOW_MS` or rely on the unit test.)
- [ ] **13.6 Caller-ID (first-call check).** In `railway logs`, the `[voice] inbound call …` line shows the homeowner as `From` (not `ForwardedFrom`). If a carrier swaps them, note it — the code prefers `From` and bails if it looks like the contractor's own line.

---

## Appendix — intentionally NOT built yet (don't test)

- Manual messaging / human-takeover from the dashboard (read-only for now).
- Reschedule/cancel/disqualify **from the UI** (Sarah does these via SMS; the dashboard is read-only).
- Automated Twilio number provisioning (admin sets numbers manually).
- Cold inbound in prod (flag off by default).
- Pagination / search / CSV export on the leads table.
