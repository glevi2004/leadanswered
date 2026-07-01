# Lead Answered — System Specification (v1)

## Document purpose

This is the build spec for **Lead Answered**, an AI SMS lead-response service for home-service contractors (initial vertical: roofers). It is written to be handed to Claude Code as the source of truth for development. Build in the phases described; do not build ahead of the current phase.

> **Status (current).** All three services are **deployed**: `apps/api` + `apps/worker` + Redis on **Railway**, `apps/web` on **Vercel** (`app.leadanswered.com`), Postgres on **Supabase** — see [`DEPLOY.md`](./DEPLOY.md). Auth is **email + password, invite-only** (Supabase Auth — *not* magic-link). Phases 1–3 (Sarah agent → email-parse intake → onboarding + admin) are live; the contractor **dashboard (Phase 4) is next.** Where sections below describe magic-link auth, a "Railway *or* Render" choice, or "run locally via ngrok" as the only path, this banner + `DEPLOY.md` are current.

---

## ⚙️ Architecture update (v2) — "Sarah" is now a tool-using agent

The conversation engine was rebuilt from the original procedural state machine (extract → hardcoded directive ladder → reply) into a **provider-agnostic, tool-using agent**. This note overrides the older procedural descriptions where they conflict; the principles below still hold.

- **Agent, not a procedure.** Each turn, the model reasons and **chooses tools**; it does not follow a fixed code-driven sequence. Built on the **Vercel AI SDK** (`generateText` + `tool()` + `stopWhen`), so the provider is swappable in one line (`apps/api/src/agent/provider.ts` — defaults to Claude/Haiku; OpenAI is swap-ready, not yet installed). The old two-pass extraction + `buildDirective` ladder + `decideTurn` are retired.
- **"AI extracts, CODE decides" → "AI orchestrates, TOOLS decide."** Every business decision still lives in deterministic code — now inside the **tools** (`apps/api/src/agent/tools.ts`): `qualify_lead`, `get_availability`, `book_appointment`, `reschedule_appointment`, `cancel_appointment`, `escalate_to_contractor`. Each wraps the same pure `packages/core` functions; the **tool result is authoritative**, and the model may never assert a fact (coverage, an available time, "you're booked") a tool didn't return.
- **New capabilities:** open-ended availability ("do you have next week?"), **reschedule / cancel**, post-booking conversations, **escalation to the contractor** (loop in the owner; the owner texts back and the answer is relayed to the homeowner), and a **quiet-lead nudge**.
- **Worker pulled forward.** The `apps/worker` deployable (BullMQ/Redis) now exists for delayed/async work (the nudge today). The escalation relay is webhook-driven (no worker needed). Notification senders + the Store are reused across api and worker.
- **Observability:** Langfuse tracing (OpenTelemetry) on every agent turn + tool call (no-op unless `LANGFUSE_*` set).

---

## 🔒 Data Integrity & Concurrency Invariants (DB-enforced, not convention)

Booking is a reservation system, so correctness is guaranteed by the **database**, not by app
code that a race or a retry could slip past. These invariants hold under concurrent webhooks:

1. **No double-booking.** At most one *active* (`proposed`/`confirmed`) appointment per contractor
   may occupy any time interval — enforced by a Postgres `btree_gist` **EXCLUDE** constraint on
   `(contractorId, tsrange(startAt,endAt))` (+ a partial-unique on exact start). Two racing inserts:
   one commits, the other fails cleanly as `slot_taken`.
2. **One active appointment per lead** — partial unique index; reschedule/cancel are therefore
   unambiguous.
3. **Exactly-once webhook processing.** An inbound SMS is inserted *first* and its unique
   `Message.providerSid` is the idempotency lock — a duplicate webhook is skipped before the agent
   runs. Email intake dedupes on `Lead.sourceMessageId` (synthesized when Postmark's MessageID is
   absent). Both rely on the unique constraint (catch the violation), not a check-then-write.
4. **Exactly-once side effects.** Every status transition is a conditional `UPDATE … WHERE
   status = <old>`; the notification fires only if a row actually moved. Escalation relays resolve
   the escalation conditionally and relay only if they won.
5. **Per-conversation serialization.** Turns for one conversation run one-at-a-time (in-process
   lock); cross-instance correctness for bookings/webhooks is the DB constraints' job (so we never
   hold a DB transaction across an LLM call).

These are tested by a **real-Postgres Tier-B suite** (the in-memory store cannot prove them) — see
`TESTING.md`. Rule: never weaken these to a JS-only check.

### Scheduling-provider architecture (calendar-ready)

Our `Appointment` table is **always** the booking source of truth. The agent tools book through a
`Scheduler` (`apps/api/src/scheduler/`) whose DB constraints make double-booking impossible;
availability = the standing weekly **windows** (recurring `{dayOfWeek, start, end}` ranges) expanded
into 60-min appointment starts at a 30-min cadence (`proposeSlots`), **minus** `getBusyTimes` (our
active appointments). Appointments stay 60 minutes. A
calendar provider (Google, etc.) is a **future, optional, ONE-WAY sync target** — push booked
events out + merge free/busy in — **never** the source of truth and never in the booking
transaction. The seam exists today (`CalendarConnection` model + `Appointment.external*`/`syncState`
columns + `scheduler/README.md`); no provider code is built yet.

---

## 1. Product summary

**One line:** When a homeowner submits a contractor's website contact form, Lead Answered texts them back within 60 seconds (as the contractor's assistant "Sarah"), qualifies the lead over SMS, proposes appointment slots from the contractor's standing availability, and notifies the contractor — with no action required from the contractor.

**Who the customer is:** small/midsize home-service contractors (roofers first). They are NOT the SMS recipient — the _homeowner_ is. The contractor is who pays and who gets the final booking notification.

**Core value:** speed-to-lead. Homeowners contact multiple companies; the first to respond usually wins. Contractors lose leads nights/weekends/busy-season because they can't respond fast. Lead Answered responds in <60s, every time.

---

## 2. The end-to-end flow (full v1 vision)

1. Homeowner fills out a contractor's website contact form.
2. The form (already) emails a lead notification to the contractor's inbox.
3. **Lead Answered receives that lead** (Phase 2: by parsing a forwarded notification email; Phase 1: by a simple manual/API trigger).
4. Within 60 seconds, the system sends the homeowner an SMS from a dedicated Twilio number, identifying as "Sarah," the contractor's assistant.
5. "Sarah" (powered by Claude) holds a short SMS conversation to:
   - Confirm interest and basic project info
   - Qualify the lead against the contractor's rules (in service area, project type offered, homeowner is decision-maker)
   - Propose 2–3 appointment slots from the contractor's standing availability
   - Confirm a chosen slot
6. The system sends the contractor ONE notification (SMS and/or email): "New booked appointment: [name], [phone], [address], [project], [slot]." (Address is essential — it's how the contractor judges the job's location/area and plans the drive.)
7. The homeowner gets a confirmation message (and optionally a calendar .ics).

**Explicitly OUT of scope for v1:** inbound phone calls / voice; missed-call-text-back; giving quotes or pricing (Sarah books the on-site estimate, never quotes); post-booking communication beyond confirmation; CRM/calendar OAuth integrations; multi-channel (Facebook/Google LSA) lead sources; a self-serve customer dashboard.

**Compliance & consent (must hold for every message):** SMS is sent **only** to homeowners who **affirmatively opted in** on the contractor's intake form — the `/optin` sample shows the model (an explicit, unchecked, optional consent checkbox). The lead/intake payload must carry that consent flag, and the system must **not** initiate SMS for a lead without it. Sending numbers are registered A2P traffic (toll-free verification now, 10DLC later — §9.6) with automatic STOP/HELP handling. The **contractor is contractually responsible** for obtaining consent and not submitting cold/purchased lists (Terms of Service §3). Full posture: `ops/legal.md`.

---

## 3. Architecture

**Stack (TypeScript end-to-end):**

- **Language:** TypeScript everywhere (one language across frontend + backend + workers).
- **Frontend:** Next.js (onboarding UI + contractor dashboard), deployed on **Vercel**.
- **Backend API + realtime/webhook service:** **Express** (Node), deployed on **Railway or Render** (billed for uptime, not per-request).
- **Background/queue/cron worker:** a separate Node worker process using **BullMQ + Redis**, also on Railway/Render.
- **ORM:** **Prisma**.
- **DB:** Postgres (one Postgres instance for all environments via Prisma; no SQLite — go straight to Postgres to avoid a later migration).
- **SMS:** Twilio (Node SDK).
- **AI:** Anthropic Claude API (Node SDK) — the "Sarah" conversation engine.
- **Config:** environment variables for all secrets (Twilio SID/auth token, Anthropic API key, DATABASE_URL, Redis URL).
- **Testing:** Vitest (unit/integration), React Testing Library (components), Playwright (E2E) — see §7.5.

### 3.1 Deployment boundaries — WHAT RUNS WHERE (read this before building anything)

This is the most important architectural decision in the doc. Claude Code must NOT collapse these into one app or assume Next.js API routes handle long-running work. The split is deliberate and exists to avoid serverless cost-explosion on long/queued/scheduled tasks.

**THREE separate deployables:**

**(A) `web` — Next.js on Vercel.** Frontend only + thin API routes for simple, fast, synchronous reads/mutations (dashboard data fetches, settings updates). NOTHING long-running, NOTHING that calls Twilio provisioning, NOTHING that processes queues or runs on a schedule. If a request could take more than ~1-2 seconds or needs retries, it does NOT belong here — it belongs in (B) or (C).

**(B) `api` — Express service on Railway/Render (always-on).** Handles:

- Twilio inbound **webhooks** (incoming SMS → Sarah conversation engine → outbound SMS). Must be a stable always-on HTTP endpoint (serverless cold-starts + webhook timing don't mix well).
- The **Sarah conversation engine** (each turn: load history + contractor config → Claude call → Twilio send → persist). Each turn is short, but lives here (not Vercel) so it shares the conversation/Twilio code with the webhook and isn't subject to serverless limits.
- Synchronous internal endpoints the web app or worker call.

**(C) `worker` — Node + BullMQ/Redis on Railway/Render (always-on).** Handles everything long-running, delayed, retried, or scheduled:

- **Number provisioning** on onboarding (the multi-step Twilio API chain — search→buy→messaging service→submit verification; takes 10-30s, must not block a web request). Enqueued by `web` at signup; processed here.
- **Verification status polling** (cron: check Twilio for pending→verified transitions).
- **The future outbound growth engine** (email 100/day, call sequencing, voicemail→email, callback cadence) — this is heavily queue/cron-based and is the single biggest reason the worker exists. Do NOT build the outbound engine inside Vercel or as inline web requests.
- Any retried/delayed job (e.g., a gentle follow-up SMS to a quiet lead after a delay).

**Shared:** a `packages/db` (Prisma client + schema) and `packages/core` (shared types, the contractor-config + geo + qualification logic) imported by (A), (B), and (C). Monorepo (e.g. turborepo or pnpm workspaces) so the three deployables share code without duplication.

### 3.2 What gets built WHEN (so boundaries aren't violated as phases progress)

- **Phase 0–1 (Echo Bot, Sarah MVP):** ONLY the `api` Express service + `packages/db`. No Next.js, no worker, no queue yet. The `/lead` trigger and webhook live in `api`. Keep it a single clean service but already in the monorepo structure so (A) and (C) slot in later without restructuring.
- **Phase 2 (email-parse):** still mostly `api` (inbound email webhook → enqueue or direct), introduce the `worker` if any parsing/retry needs it.
- **Phase 3 (onboarding UI):** introduces `web` (Next.js) AND the `worker` (for number provisioning). This is where the three-app split becomes real. Provisioning is enqueued to `worker`, never run inline in `web`.
- **Phase 4 (dashboard):** mostly `web` reads + thin API routes hitting `api`/db.
- **Phase 5+ (outbound engine):** built in `worker` with BullMQ queues + cron. Never in `web`.

**Rule for Claude Code:** respect the (A)/(B)/(C) boundary at all times. When adding a feature, first decide which deployable it belongs to using §3.1, and put it there. Do not add long-running/queued/scheduled logic to the Next.js app.

### 3.3 Core components (mapped to deployables)

1. **Webhook receiver** (`api`) — Express endpoints for inbound Twilio SMS (and Phase 2: inbound email).
2. **Conversation engine** (`api`, logic in `packages/core`) — manages each lead's conversation state and calls Claude.
3. **SMS service** (`packages/core`, used by `api` + `worker`) — Twilio send/receive wrapper.
4. **Lead intake** (`api`) — Phase 1: `/lead` POST; Phase 2: inbound email parser.
5. **Contractor config store** (`packages/db`) — per-contractor settings.
6. **Geo/qualification service** (`packages/core`) — deterministic service-area + project-type + decision-maker checks (see §5.1).
7. **Notification service** (`packages/core`, triggered from `api`; delivery jobs may run in `worker`) — multi-recipient, per-event notifications (see §5.2).
8. **Provisioning service** (`worker`) — the Twilio number API chain (see §9.6).
9. **Outbound engine** (`worker`, future) — email/call/voicemail cadence.
10. **Persistence** (`packages/db`) — Prisma + Postgres.

---

## 4. Data model (initial)

- **contractor**: id, name, company_name, project_types (list), qualification_rules (JSON), standing_availability (JSON: `{timezone, windows: [{dayOfWeek, start, end}]}` — recurring weekly availability ranges), sarah_persona_notes, twilio_number, messaging_service_sid, number_type (toll_free | local), verification_status (pending | verified | failed), number_status (active | pending_swap | retired)
  - NOTE: each contractor owns a DEDICATED number (never shared). The telephony fields support per-contractor provisioning, the toll-free verification lifecycle, and the future local-number upgrade/swap (see §9.5) without a schema migration.
  - **Statuses (two independent dimensions — both INFORMATIONAL; neither gates the agent):**
    - **Account lifecycle is DERIVED, never a stored column**: `New → Invited → Live`, computed from Supabase auth (has the owner accepted = email confirmed / signed in) + `onboarding_complete`. Onboarding is **admin-led and precedes the invite** (§3): `New` = created, awaiting the admin-run wizard; the admin **finishing the wizard sends the invite** → `Invited` (a rare `Onboarded` state covers "onboarded but the invite hasn't gone out"); `Live` = accepted + signed in. Surfaced as the "Account" chip in `/admin`. There is **no separate onboarding-call status** — the admin runs the wizard on the call, so the call ≈ the onboarding. A sales/CRM "I onboarded them" note would be a future CRM field, not a status.
    - `verification_status` (pending|verified|failed) = the **Twilio toll-free carrier verification**, set **manually** by the admin to mirror Twilio (no auto-sync yet — see §9.6, the "Status (current)" note, and the deferred cron in §11). Surfaced as the "Line" chip in `/admin` + the contractor's "Your line" badge. It does **not** gate Sarah's texting; carrier deliverability is enforced by Twilio, not our code.
    - `number_status` (active|pending_swap|retired) = reserved for the future local-number swap (§9.5); **not read by any code yet**.
    - **Coming later — a third dimension, subscription status** (active|past_due|canceled), Stripe-driven. Unlike these two, it **will gate the product** (pause Sarah on churn) and is where offboarding/churn lives. Soft-cancel keeps the account; hard-delete is reserved for test resets / GDPR. See §11 "Billing, subscriptions & offboarding".
  - **`project_types` are human labels, entered + shown verbatim** (e.g. "Roof repair") — not slugs. Onboarding/settings present them as a chip picker (curated suggestions + free-text add); the lead-matching normalization (§5.1) is internal and never rewrites them.
  - **Service area is structured, NOT free-text** (see §5.1): `base_locations` (JSON: list of `{address_or_zip, radius_miles}`), `include_overrides` (list of towns/zips always in-area), `exclude_overrides` (list of towns/zips never served). Qualification is computed deterministically against these; the AI never judges geography.
  - Single `notify_phone`/`notify_email` are REMOVED — notifications are handled by the `notification_recipient` table below.
- **notification_recipient**: id, contractor_id, name, phone, email
- **notification_subscription**: id, recipient_id, event_type (booking_confirmed | new_qualified_lead | new_inquiry | lead_unresponsive | disqualified_lead), channels (sms | email | both) — see §5.2
- **lead**: id, contractor_id, contact_name, contact_phone, project_hint, service_town, service_zip, full_address, source, status (new/contacted/qualifying/booked/disqualified/no_response), created_at
  - NOTE: the lead's contact is named generically (`contact_name`, `contact_phone`) rather than "homeowner\_*". v1 targets homeowners, but the product may later serve verticals where the lead is a property manager, commercial client, etc. Neutral field names now = no schema migration later. This naming principle applies everywhere: the DB and code use vertical-neutral terms; only the *conversation copy\* (what Sarah actually says) is homeowner-flavored, and that lives in the system prompt, not the schema.
  - ADDRESS: `service_town`/`service_zip` are captured early for the service-area qualification check (§5.1). `full_address` (street-level) is confirmed before booking, since the contractor needs the exact address to attend the on-site estimate and it goes in the `booking_confirmed` notification.
- **conversation**: id, lead_id, state (greeting/qualifying/proposing_slots/confirming/done), created_at, updated_at
- **message**: id, conversation_id, direction (inbound/outbound), body, timestamp
- **appointment**: id, lead_id, contractor_id, slot_datetime, status (proposed/confirmed/shown/no_show), created_at

---

## 5. The "Sarah" conversation engine (the heart of the product)

**Persona:** Sarah is the contractor's friendly, efficient assistant. She is NOT to be deceptive, but she represents the contractor. Warm, concise, human, texts like a real person (short messages, no corporate stiffness).

**Her job, in order:**

1. **Open fast & warm:** reference that the homeowner just reached out via the website, thank them, confirm she's from [Company].
2. **Confirm/gather minimal project info:** what they need (roof repair/replacement/etc.), property address or town (for service-area + scam check).
3. **Qualify** against contractor rules:
   - In service area?
   - Project type the contractor offers?
   - Is the contact the decision-maker? (in v1 this is the homeowner; phrased neutrally because in future verticals the decision-maker may be a property manager, commercial client, etc. — keep the qualification _logic_ vertical-neutral, with "homeowner" as just the current example)
4. **NEVER quote a price.** If asked, redirect: acknowledge the question, explain accurate pricing requires an on-site look, pivot to booking the free estimate. (This is a hard rule — pricing is impossible over text and quoting would be a disaster.)
5. **Propose 2–3 specific slots** from the contractor's standing availability.
6. **Before confirming the booking, confirm the FULL street address** (the qualify step only needed town/zip; the on-site estimate needs the exact address). Store as `full_address`.
7. **Confirm the chosen slot**, tell them the contractor will see them then.
8. **Hand off:** trigger the contractor notification (includes the full address).

**Conversation rules:**

- One question at a time. Short messages. Sound human.
- If the lead is clearly out of scope (wrong area, wrong project), politely disqualify and don't book.
- If the homeowner goes quiet, a single gentle follow-up after a delay; don't spam.
- All persona + rules delivered via a **system prompt** that is assembled per-contractor (injecting their company name, service area, project types, availability, and any custom notes).

**Implementation:** each inbound SMS → load conversation history + contractor config → build system prompt → call Claude with full message history → send Claude's reply via Twilio → persist both messages → update conversation state. Use the conversation `state` field + the message history to keep Claude on-track. Claude returns **structured output (JSON)** alongside its message so the code knows the state and any extracted data (see §5.1) — e.g. `{ reply: "...", extracted: { town, zip, project_type, is_decision_maker }, proposed_action: "none|qualify|propose_slots|book|disqualify" }`. **The code, not Claude, makes the qualify/disqualify/book decision** based on the extracted data (see §5.1).

---

## 5.1 Qualification & service-area logic (AI extracts, CODE decides)

**Hard principle:** the AI handles natural-language understanding; deterministic CODE makes every qualification decision. Claude never "judges" whether a town is in-area or whether a project is offered — it only _extracts_ what the homeowner said, and code checks it against structured contractor config. This is both more reliable (no geography hallucination) and auditable (you can see exactly why a lead qualified or not).

**The division of labor, per inbound message:**

- **Claude (extraction):** from the conversation, extract structured fields when present — `town`, `zip` (or full address), `project_type`, and signals about whether the contact is the decision-maker. Returns them in its JSON output.
- **Code (decision):** evaluates the extracted fields against the contractor's structured config and sets the qualification result. Claude is then told the result (via the next system-prompt assembly) and phrases the response, but does not decide.

**Service-area check (the robust, composed approach — all layers together):**

1. **Contractor config (set at onboarding, editable in settings)** stores service area as structured data:
   - `base_locations`: one or more origin points (address/zip) with a `radius_miles` each. (The broad net.)
   - `include_overrides`: explicit towns/zips always considered in-area (the "I'll go there even though it's far" exceptions).
   - `exclude_overrides`: explicit towns/zips never served (the "I don't go there even though it's close" exceptions).
2. **At conversation time:** Claude extracts the lead's town/zip → **code geocodes** it to lat/long (and/or normalizes to a zip) using a geocoding library/API → **code decides** in-area if: zip ∈ include_overrides, OR (within `radius_miles` of any base_location AND zip ∉ exclude_overrides). Exclude always wins; include always wins over radius.
3. **Geocoding:** use a geocoding provider (e.g., Google Geocoding API, or a US Census/zip-centroid dataset for a free offline option). Cache results. This lives in `packages/core` as a `geo` module; it is called by the qualification service, NOT by Claude.
4. **If extraction is ambiguous** (lead hasn't given a town yet): Claude's job is to _ask_ for it naturally; code doesn't decide area until a location is extracted.

**Project-type check:** the contractor's `project_types` are stored + shown **verbatim** — human labels like "Roof repair", never slugs. Matching is invisible: code reduces **both** the lead's extracted `project_type` **and** each of the contractor's labels through a small synonym map (e.g. "new roof"/"leak" → `roof_repair`) to a shared key, in-memory for this one check, then compares (`normalizeProjectType` in `packages/core/qualification.ts`). It never alters what's stored or displayed. Not an AI judgment. A *custom* label that doesn't hit a synonym won't deterministically match loose wording → it falls through to the AI/escalation path (see §11 for per-contractor synonyms).

**Decision-maker check:** Claude extracts signals ("it's my house" / "I'd need to ask my landlord"); code applies the contractor's rule (e.g., require decision-maker = true to book). Phrased neutrally so it carries to non-homeowner verticals.

**Outcome:** the qualification service returns `{ in_area, project_offered, is_decision_maker, qualified }`. Code uses `qualified` to drive the conversation (proceed to slots vs. politely disqualify) and to fire the right notification event (§5.2).

---

## 5.2 Notification system (multi-recipient, per-event)

**Replaces the single `notify_phone`/`notify_email`.** A contractor can have MULTIPLE notification recipients (owner + office manager + sales rep), each subscribing to chosen event types on chosen channels.

**Base event taxonomy (extensible later, but these are the v1 base):**

1. **`booking_confirmed`** — Sarah booked an appointment slot. (Default: ON.) High-value; includes name, phone, project, slot, address.
2. **`new_qualified_lead`** — a lead passed qualification (in area, right project, decision-maker) but hasn't booked yet. (Default: ON.)
3. **`new_inquiry`** — any lead that started a conversation, regardless of qualification. (Default: OFF — can be noisy.)
4. **`lead_unresponsive`** — a lead Sarah contacted who then went quiet. (Default: OFF.) For chasing hot-but-stalled leads.
5. **`disqualified_lead`** — a lead Sarah turned away (out of area / wrong project). (Default: OFF.) Useful for auditing what Sarah rejects and catching false rejections early.

**Structure:** recipients × events × channels.

- A `notification_recipient` belongs to a contractor: `{ name, phone, email }`.
- Each recipient has subscriptions: for each event type, which channels (SMS, email, or both) they receive. Stored as a `notification_subscription` (recipient_id, event_type, channels) or a JSON prefs blob on the recipient.
- Defaults applied on onboarding: the primary owner recipient is subscribed to `booking_confirmed` + `new_qualified_lead` on both channels; others opt-in.

**Delivery:** the notification service (in `packages/core`) is invoked when an event fires (e.g., booking confirmed in the `api` conversation engine). Actual send (SMS via Twilio, email) can be done inline for low volume or enqueued to the `worker` for reliability/retries — prefer enqueue so a failed send retries and never blocks the conversation.

---

## 6. Build phases

### Phase 0 — Echo Bot (smoke test) — TODAY'S TARGET

- Express (`api`) app with a Twilio inbound-SMS webhook (in the monorepo structure from §3.1, but only the `api` service + `packages/db` exist yet).
- Receive an inbound text, log it, echo it back.
- Then: pass the inbound text to Claude and reply with Claude's response.
- **Done when:** texting the Twilio number gets an AI-generated reply. Proves the Twilio↔Claude spine. **Set up Vitest in this phase** (even with one trivial test) so the harness exists from day one; add a test asserting the webhook handler calls Claude (mocked) and replies.

### Phase 1 — Sarah MVP (demoable)

- `/lead` POST endpoint (manual trigger: name, phone, contractor_id).
- On new lead → fire the opening SMS as Sarah.
- Full Sarah conversation: greet → qualify → propose slots → confirm.
- Per-contractor config (start with ONE hardcoded test contractor).
- Contractor notification (SMS/email) on booking.
- Postgres persistence via Prisma of contractors/leads/conversations/messages/appointments.
- **Done when:** you POST a fake lead and can have a full SMS conversation with Sarah that ends in a booked slot + you (as the contractor) get notified. THIS IS THE DEMO.

### Phase 2 — Email-parse intake

- Inbound email endpoint (e.g., via a service like Postmark/SendGrid inbound, or IMAP polling of leads@leadanswered.com).
- Parser extracts homeowner name + phone + project hint from a forwarded lead-notification email.
- Handle the common formats first; per-contractor parsing config for odd ones.
- **Done when:** forwarding a real lead-notification email triggers the Sarah SMS automatically.

### Phase 3 — Onboarding UI (contractor self-serve setup)

A web app where a contractor sets themselves up without you touching the database. This is intentionally built EARLY (right after the Sarah core works) because it gives a premium experience and removes manual onboarding work. Collects everything the `contractor` record needs:

> **Current admin flow (what's built — supersedes the self-serve framing above + the auto-provisioning vision below).** Setup is **admin-led (concierge / white-glove)**, not self-serve: handing a non-technical contractor the config wizard — especially the free-text persona notes, effectively a system prompt — is fragile, and they're usually phone-only on the onboarding call. So provisioning is **not** automated (you buy + configure the number in Twilio yourself), and the flow is **onboard → invite**: in `/admin` you **create the contractor (no invite yet → status `New`)**, then open them and click **Onboard** to run the **same wizard** on their behalf (on the call). **Finishing the wizard saves their config AND sends the first invite** (→ `Invited`). The owner clicks it, sets a password, sees a **welcome**, and lands on their already-configured **dashboard**; they never touch the wizard — they self-edit later in **Settings**. On **`/admin/[id]`**: **Save** edits fields only (no email); **Onboard / Edit setup** runs the wizard; **Send / Resend invite** is a separate manual action (recovery). **Account status (New → Invited → Live)** is derived (§4); toll-free line verification is tracked manually (§4, §9.6). The auto-provisioning + self-serve chain in the "On submit →" bullet below remains the future vision.

- Company name, contact info
- Notification phone + email (where booking alerts go)
- Service area (zips/towns)
- Project types offered
- Qualification rules
- **Availability via a drag-to-paint week calendar** — a Google-Calendar-style week view (days as columns, 06:00–21:00 in 30-min rows) where you click-drag to paint available blocks; supports half-hours, split shifts, and any hours in range. Stored as `standing_availability` **windows** (`{dayOfWeek, start, end}` ranges); Sarah offers 60-min starts that fit within them (§5). This is NOT Google Calendar *integration* — it's a self-contained editor. (Calendar sync is a later enhancement; this gets the same outcome with zero integration.)
- Sarah's name + persona tweaks
- On submit → creates the contractor record + provisions their setup via the Twilio API: assigns a dedicated toll-free number, attaches a Messaging Service, configures the inbound webhook, submits toll-free verification, assigns the unique lead-forwarding address, then shows the number and fires the "your line is live" first SMS from Sarah to the contractor's own phone. **Full API chain, UX sequence, async verification handling, and the verification-failure fallback are specified in §9.6 — build per that section.**
- **Done when:** a brand-new contractor can sign up, get their own dedicated number provisioned + sending (grace period), see it + receive Sarah's first text, and fully configure themselves through the UI, with their Sarah live.

### Phase 4 — Contractor Dashboard (the ongoing product surface)

The logged-in home base where contractors manage everything after onboarding. Pages/functionality mapped in §10. Built after onboarding since onboarding is the entry point that creates the account.

### Phase 5 — Hardening & enhancements (post first customers)

- Show-confirmation flow (day-of "reply Y to confirm"), no-show tracking.
- .ics generation / calendar file for booked appointments.
- Postgres, proper deploy, logging/monitoring, robust error handling for Twilio/Claude failures.
- **Future enhancements** (see §11): Google Calendar OAuth sync, additional lead channels, billing/Stripe, analytics.

---

## 7. Critical constraints & rules (do not violate)

- **Sarah never gives pricing/quotes.** Always redirects to booking an on-site estimate.
- **Sub-60-second response** to a new lead is the core promise — the opening SMS must fire immediately on lead intake.
- **Each contractor has a DEDICATED number; numbers are NEVER shared across contractors** (see §9.5).
- **AI extracts, code decides.** Qualification (area/project/decision-maker) is deterministic code, never an AI judgment (see §5.1).
- **Respect deployment boundaries** (§3.1): no long-running/queued/scheduled work in the Next.js (`web`) app.
- **Secrets only via env vars** — never hardcode keys.
- **Graceful failure:** if Claude or Twilio errors, log it and fail safe (don't spam the lead, don't crash the webhook).
- **Idempotency:** a single inbound webhook must not trigger duplicate replies.
- **Build only the current phase.** Do not build future-phase features early.

---

## 7.5 Testing strategy

Testing is specified up front deliberately: it keeps the build sustainable and stops regressions as phases stack. Claude Code must write tests alongside each feature, not after.

### Frameworks

- **Vitest** — unit + integration tests across all three deployables (`api`, `worker`, `packages/*`). Chosen over Jest for native TS/ESM support (no ts-jest config pain), speed, and Jest-compatible API.
- **React Testing Library** — component tests for the Next.js (`web`) frontend.
- **Playwright** — end-to-end browser tests for critical user flows (onboarding especially).
- **Test DB:** a separate Postgres test database; reset/seed between runs. Use Prisma migrations against it. Never run tests against dev/prod data.
- **External APIs are mocked by default** (Twilio, Claude, geocoding) in unit/integration tests — assert on what the code _sends_ and how it handles responses/errors, not on the live third party. A small number of clearly-marked integration tests may hit Twilio/Claude **sandboxes** behind an env flag (not in the default/CI run).

### Testing principles

- **AI extraction is mocked in deterministic tests.** Because qualification decisions are CODE (§5.1), the qualification logic is fully unit-testable with hardcoded "extracted" inputs — no LLM call needed. This is a key reason the AI-extracts/code-decides split exists: it makes the most important logic deterministically testable.
- Every bug fix adds a regression test reproducing it.
- Tests live next to code (`*.test.ts`) or in a `__tests__` dir per package; shared test utils/factories in a `test/` helper.
- CI runs Vitest (+ Playwright on a smaller critical-path subset) on every push; a red suite blocks merge.

### What must pass, per feature (the contract)

**Conversation engine / Sarah (`api`, `core`):**

- Given an inbound SMS + conversation history, the engine calls Claude with the correctly-assembled per-contractor system prompt (mock Claude; assert prompt contents).
- Persists both inbound and outbound messages; updates conversation `state` correctly.
- **Idempotency:** the same Twilio webhook delivered twice produces exactly one outbound reply.
- On Claude/Twilio error: logs, fails safe, does NOT crash the webhook or double-send.
- **Never quotes pricing:** given a price question, the assembled prompt enforces redirect (assert the rule is present; plus a guard test that a price-shaped model output path still routes to "book an estimate").

**Qualification & geo (`core`) — highest-value tests:**

- Service area: lead zip in `include_overrides` → in-area (even if outside radius). Lead zip in `exclude_overrides` → out (even if inside radius). Inside radius, not excluded → in. Outside radius, not included → out. Exclude beats include? (define + test precedence: exclude wins).
- Geocoding is mocked; assert the decision logic against known coordinates/zips.
- Project-type match incl. synonym map ("new roof" → replacement).
- Decision-maker rule applied correctly from extracted signals.
- Returns the correct `{ in_area, project_offered, is_decision_maker, qualified }` for a matrix of cases.

**Notifications (`core`, `worker`):**

- Correct recipients are selected for each event type per their subscriptions/channels.
- `booking_confirmed` + `new_qualified_lead` fire to default-subscribed owner; opt-in events don't fire unless subscribed.
- Channel routing (SMS vs email vs both) correct per recipient.
- Delivery failure retries via the worker queue; never blocks the conversation.

**Number provisioning (`worker`) — mock Twilio:**

- Onboarding enqueues a provisioning job (web does NOT run it inline).
- Happy path: search → buy → messaging service → webhook set → verification submitted → contractor record updated with number + `verification_status=pending`.
- **Failure fallback:** verification failure triggers resubmit/replacement path + admin alert; contractor never left with a dead line.
- First "your line is live" SMS is sent to the contractor's own phone on success.

**Lead intake:**

- Phase 1: `/lead` POST creates a lead + fires the opening SMS (mock Twilio).
- Phase 2: email-parse extracts contact name/phone/project from sample notification emails (fixture set of real-world formats); routes to the correct contractor via the forwarding address; malformed email fails gracefully (logged, not crashed).

**Onboarding & dashboard (`web`) — RTL + Playwright:**

- Playwright E2E: a new contractor completes onboarding → sees their provisioned number → (mocked) first SMS path triggered → lands in dashboard. The critical revenue path; must stay green.
- Availability calendar writes correct `standing_availability` **windows** JSON (contiguous 30-min cells merge into `{dayOfWeek, start, end}` ranges; round-trips exactly).
- Settings edits persist and re-assemble Sarah's prompt / qualification config.

**Booking flow (end-to-end, integration):**

- Full Phase-1 path: lead in → qualify (in-area, offered project, decision-maker) → propose slots → confirm → appointment persisted → `booking_confirmed` notification fired. This integration test is the guardrail on the core product and must pass before every deploy.

---

## 8. Success criteria for the first demo (Phase 1)

A working flow where: a lead is submitted → the lead receives a Sarah SMS within seconds → a natural back-and-forth qualifies them and books a slot → the contractor receives a clean booking notification. Runnable locally with ngrok for Twilio webhooks, then deployable to Railway/Render. **The booking-flow integration test (§7.5) passing is part of "done" for Phase 1.**

---

## 9. Lead intake mechanism (how a lead reaches the system)

**Decision: unique forwarding address per contractor. NOT inbox OAuth, NOT website changes.**

- Each contractor is assigned a unique inbound address, e.g. `leads+{contractor_slug}@leadanswered.com`.
- During onboarding, the contractor adds a one-time auto-forwarding rule in their existing email so their website's lead-notification emails forward to that address. (For the first customers, Levi sets this up with them on a call.)
- Lead Answered receives the forwarded email via an inbound-email service (e.g., Postmark/SendGrid/Mailgun inbound parse webhook, or IMAP polling of the leads mailbox).
- The `+{contractor_slug}` (or the destination address) identifies which contractor the lead belongs to — no guessing.
- A parser extracts contact name + phone + project hint. Start with the common notification formats; allow a per-contractor parsing hint for odd templates.
- Extracted lead → creates a `lead` record → fires the Sarah opening SMS.

**Why this approach:** works with any email provider, requires no scary inbox permissions, no Google verification, and honors the core principle of never touching the contractor's website. The only friction (setting a forward rule) is handled during white-glove onboarding.

**Phase 1 stand-in:** before email-parse is built, the `/lead` POST endpoint is the trigger (manual/testing). Email-parse (Phase 2) replaces the manual trigger for real use.

---

## 9.5 Telephony & per-contractor number provisioning

**Core decision: every contractor gets their OWN dedicated number. Numbers are NEVER shared across contractors** (a contractor must never see their competitor texting homeowners from the same number as them — this is a hard product requirement).

### Number type strategy (phased by business stage)

**v1 — Toll-free number per contractor.**

- Each contractor is assigned their own dedicated toll-free number (8xx).
- **Why toll-free for v1:** toll-free verification is done in-house by Twilio in ~3–5 business days (vs. 10DLC's ~10–15 days via external registry), verification is free, and — critically — **an unverified toll-free number can send during the verification grace period** (subject to caps ~2,000/day, far above a new contractor's lead volume). A 10DLC number is fully blocked until approved. So toll-free lets a new contractor go live essentially immediately while verification completes in the background.
- Tradeoff accepted for v1: an 8xx number reads less "local" than an area-code number. Acceptable until a customer asks for local.

**Future — Local (10DLC) number as a paid upgrade.**

- When a contractor wants a local area-code number (more trustworthy-looking for a local trades business), that's a **paid upgrade tier**, because it requires 10DLC registration (~10–15 days, or ~72h via a specialized provider like Telgorithm).
- Upgrade handling (the number-swap flow): keep the contractor's toll-free working during the ~15-day local-number registration. When the local number is approved, switch the contractor's active number to it. **Any inbound contact to the OLD (toll-free) number after the switch triggers an automated message** telling the homeowner Sarah's number has changed and that she'll text them shortly from the new number — then the new local number initiates contact. (This swap/handoff logic only exists for the upgrade path; it does NOT exist in base v1 since there's no swap.)
- **Trigger to build the tiered plans:** once ~5+ customers have requested the local-number upgrade, formalize two plans — a cheaper toll-free tier and a pricier local-number tier — bundling other by-then-requested features to make the tiers cohesive.

### Number inventory strategy (phased by scale)

**v1 (early, <~20 contractors): provision on-demand.**

- On contractor signup, the system provisions a fresh toll-free number via the Twilio API, configures it, submits verification, and relies on the grace period for immediate sending.

**Future (~20+ contractors / bigger clients): pre-warmed inventory pool.**

- Maintain a rolling pool of already-provisioned (and ideally already-verified) numbers so assignment is instant and there's zero risk of hitting grace-period caps under heavier volume. Replenish the pool in the background as numbers are assigned.

### How provisioning fits the onboarding flow (the experience)

This is a deliberate product moment, not a backend afterthought — it should feel like real, premium software:

1. During onboarding, the UI collects everything Twilio requires to provision + submit verification for a toll-free number (business name, address, EIN/BRN, use-case description, opt-in details, sample messages). Most of these are fields the onboarding form already needs for the contractor profile.
2. On submit, the backend calls the Twilio API to: provision a toll-free number → attach it to a Messaging Service → configure the inbound webhook → submit the toll-free verification request.
3. The UI shows a brief loading/provisioning state, then presents: **"Here's your dedicated Lead Answered number: (833) XXX-XXXX"** — and ideally triggers a **first SMS from Sarah to the contractor's own phone** so they immediately see it working ("Hi, this is Sarah, [Company]'s new assistant — your Lead Answered line is live!"). That first-text moment is a high-impact trust/delight beat.
4. Verification status is tracked on the contractor record and surfaced in the dashboard ("Your line" badge) + the `/admin` "Line" chip. **Today it's set manually** by the admin to mirror Twilio (which reports it via API/Console); the auto-sync poll is deferred (§11).

### Data model implication

The `contractor` record owns its own telephony fields (see §4 update): `twilio_number`, `messaging_service_sid`, `number_type` (toll_free | local), `verification_status` (pending | verified | failed), `number_status` (active | pending_swap | retired). This structure supports per-contractor numbers, the verification lifecycle, and the future local-number swap without a migration.

### Provider note

v1 uses Twilio (already set up). If local-number speed becomes a bottleneck later, a specialized 10DLC provider (e.g., Telgorithm, ~72h approvals) is an evaluated alternative — documented in §11, not built now.

---

## 9.6 Number provisioning flow — API integration & onboarding UX

The number setup is **fully integrated into onboarding via the Twilio API** — no manual console steps. This is a deliberate product moment; the experience below is part of the build, not a backend afterthought.

### The API call chain (runs on onboarding submit)

1. **Search** — `GET AvailablePhoneNumbers/US/TollFree` to find an available toll-free number (optionally filter by capabilities: SMS required).
2. **Purchase** — `POST IncomingPhoneNumbers` to buy the number onto the Lead Answered Twilio account.
3. **Messaging Service** — create or reuse a Messaging Service, add the number to it, and set the inbound webhook URL so homeowner replies route back to the app and into the correct contractor's conversation. (A2P/toll-free best practice is a Messaging Service per sender; structure so each contractor's number is cleanly attributable.)
4. **Submit verification** — submit the toll-free verification request via the Trust Hub / TFV API, passing the business info collected in the onboarding form (legal name, address, **EIN/BRN — now effectively required for new toll-free verifications**, website, use-case description, opt-in details, sample messages).
5. **Persist** — save `twilio_number`, `messaging_service_sid`, `number_type=toll_free`, `verification_status=pending`, `number_status=active` on the contractor record.

### The onboarding UX sequence (what the contractor sees)

1. Contractor fills the onboarding form (which collects both their profile config AND everything Twilio needs — they just experience it as "setting up my account").
2. On submit: a short **provisioning/loading state** ("Setting up your dedicated line…").
3. **Reveal:** "Here's your dedicated Lead Answered number: **(833) XXX-XXXX**."
4. **First-text delight beat:** immediately fire an SMS from Sarah to the **contractor's own cell** — e.g., "Hi, this is Sarah, [Company]'s new assistant — your Lead Answered line is live! 🎉". This works within seconds of signup **because toll-free can send during the verification grace period** (does not wait on full approval). This moment is what makes the product feel real and premium rather than like a generic AI agency.
5. The contractor proceeds into the dashboard; nothing is blocked on verification.

### Async verification handling

> **Today this is manual** (the auto-provisioning chain isn't built — see the Phase 3 "Current admin flow" note). The admin sets `verification_status` by hand in `/admin/[id]` to mirror Twilio; the poll/callback auto-sync below is the deferred design (§11 cron).

- Number purchase, webhook config, and the first send are **instant** (synchronous, within the onboarding request).
- Verification **approval is asynchronous** (~3–5 business days). Twilio reports status via API/Console; poll or receive status callbacks and update `verification_status` (pending → verified | failed).
- Surface the status in the dashboard as a quiet badge (e.g., "Verifying… your line is live and sending" → "Verified ✓"). The contractor never waits on it.

### Failure fallback (must be built)

- If toll-free verification **fails**, the system must: log the failure, auto-provision a replacement number and/or resubmit the verification with corrected info, and notify Levi (admin) to review. The contractor should not be left with a dead line — either the resubmission clears it or a replacement number is swapped in. Build this path; don't assume verification always succeeds (resubmissions are common).

---

## 10. Contractor Dashboard — full page map (Phase 4)

The logged-in web app. All data already exists in the schema from Phase 1, so these pages are views/editors over existing tables.

**a) Home / Overview**

- At-a-glance: new leads today, conversations in progress, upcoming booked appointments, response-time stat.
- Quick "everything's running" status indicator (is Sarah active, is forwarding healthy).

**b) Conversations / Leads**

- List of all leads with status (new / qualifying / booked / disqualified / no-response).
- Click a lead → full SMS thread (the `message` history), lead details, current state.
- Read-only initially; later, allow the contractor to manually jump into a conversation ("take over from Sarah").

**c) Appointments**

- List/calendar of booked appointments (from the `appointment` table): who, when, project, status (proposed/confirmed/shown/no-show).
- Mark shown / no-show (feeds the no-show tracking + the pricing model later).

**d) Bot Settings ("Sarah")**

- Edit Sarah's name + persona notes.
- Edit qualification rules, service area, project types.
- This edits the same per-contractor config that assembles Sarah's system prompt — no redeploy needed.

**e) Availability**

- The same weekly-grid availability editor from onboarding, editable anytime.
- (Later: toggle to "sync with Google Calendar" — see §11.)

**f) Account / Billing**

- Company info, notification phone/email, forwarding-address status/instructions.
- Billing (Stripe) when monetization is wired — see §11.

**g) (Later) Analytics**

- Leads over time, response time, qualification rate, booked rate, show rate. The numbers that prove ROI and justify the price.

---

## 11. Future enhancements (post core product — do NOT build early)

- **Google Calendar OAuth sync** — "Sign in with Google" so Sarah proposes only genuinely-free slots and writes bookings back to the contractor's calendar. Replaces/augments the manual availability grid. Deferred due to OAuth + Google verification complexity; the availability grid delivers the same outcome without it.
- **Additional lead channels** — Facebook Lead Ads, Google Local Services, Angi/etc., beyond website-form emails.
- **Billing, subscriptions & offboarding (Stripe)** — the paid-account lifecycle + how a contractor churns. **Not built yet**; outlined here so the admin/status model (§4) stays coherent with it. Build when the first paying customers onboard.
  - **Stripe is the source of truth for subscription state.** Checkout + the customer portal handle payment; **Stripe webhooks** (`checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed`) drive a stored **subscription status** on the contractor: `active | past_due | canceled`. This is a **third status dimension** alongside Account lifecycle + Line verification (§4) — and, unlike those two (which are informational), it's the one that **gates the product**: on `canceled`, **pause Sarah** (stop processing inbound on that number) while **keeping all data**.
  - **Settings → "Manage subscription"** opens the Stripe customer portal (payment method, invoices, plan changes).
  - **Soft-cancel, never hard-delete.** Cancelling marks the contractor `canceled` + pauses Sarah; the account and data are **retained** so they can be **reactivated** later (churned customers often return). Hard deletion is reserved for **GDPR erasure / test resets** — that's `apps/api/scripts/delete-contractor.ts`, which is NOT the churn path.
  - **Retention interception (custom cancel flow).** The in-app "Cancel" does **not** jump straight to Stripe's cancel — it first offers to **book a call with the founder**; only if they decline does it proceed. (Pattern borrowed from products that recover churn by talking to the user before they leave.)
  - **Cancellation email** — on cancel, send a branded "sorry to see you go" email (per `EMAIL.md`) linking a short **"why did you leave?" feedback form** + an offer to **book a call**.
  - **Admin** — surface subscription status as a third chip + a filter for churned contractors, with a manual `canceled`/`reactivate` override for edge cases (payment-failure grace, comped accounts).
- **Per-booked-appointment billing** — usage-based billing on top of the subscription, per the pricing model.
- **"Take over from Sarah"** — contractor manually steps into a live SMS conversation.
- **Local (10DLC) number upgrade tier** — paid upgrade giving a contractor a local area-code number instead of toll-free. Requires 10DLC registration (~10–15 days on Twilio, or ~72h via a specialized provider). Includes the number-swap/handoff flow (old toll-free keeps working during registration; on switch, inbound contact to the old number auto-replies that Sarah's number changed and the new local number initiates contact). Build the formal tiered plans (cheaper toll-free vs. pricier local) once ~5+ customers request it.
- **Pre-warmed number inventory pool** — maintain a rolling pool of pre-provisioned/pre-verified numbers for instant assignment and to avoid grace-period caps; build around ~20+ contractors / larger clients.
- **Alternative telephony provider eval** — if local-number provisioning speed becomes a bottleneck, evaluate a specialized 10DLC provider (e.g., Telgorithm, ~72h approvals) vs. staying on Twilio.
- **Show-confirmation + reminders** — day-before/day-of confirmation texts to reduce no-shows.
- **Project-type catalog + custom-type matching** — make the curated suggestion catalog (`DEFAULT_PROJECT_TYPES`) **admin-editable** (per-vertical, stored globally) instead of a code constant; and let a contractor attach **synonyms** to a custom type they add, so an off-catalog service (e.g. "Skylight installation") matches a homeowner's loose wording deterministically instead of falling through to the AI path (§5.1).

---

## 12. Revised build order (summary)

0. **Echo Bot** — Twilio↔Claude SMS roundtrip. _(today)_
1. **Sarah MVP** — `/lead` trigger → full qualify→book→notify conversation, one hardcoded contractor, Postgres/Prisma. _(the first demo)_
2. **Email-parse intake** — unique forwarding address replaces the manual trigger.
3. **Onboarding UI** — contractor self-serve setup incl. availability grid; creates the contractor record + forwarding address.
4. **Contractor Dashboard** — overview, conversations, appointments, bot settings, availability, account (per §10).
5. **Hardening & enhancements** — Postgres/deploy/monitoring, then the §11 enhancements (Google Calendar sync, billing, extra channels).

**Guiding rule:** build one phase at a time, in order. Each phase should be usable/demoable before starting the next. Do not pull future-phase features forward.
