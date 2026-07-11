# Plan: three separate agent workflows (detailed spec)

```
Website/email lead ─▶ [sequential intake] ─▶ [agent]
Missed-call lead   ─▶ [sequential intake] ─▶ [agent]
Organization         ─▶ [agent] (always)
```

**Mechanism (intake phase) — a fixed script, NOT an open agent.** Each intake step SENDS A SPECIFIC,
PRE-WRITTEN MESSAGE (the locked copy in each workflow below). Code just fills the variables — `{name}`,
`{project}`, `{address}`, `{day}`, `{time}`, `{window}` … — from what's been captured. **On the happy
path the model does NOT write these messages** — it reads each reply, pulls the value it carries (the
address, their name, the customer yes/no, the day/time), code records it and sends the next locked
message. Because code owns the order, it never re-asks something already answered. **When a reply is
*unexpected*, the model adapts and writes** (see "Every intake turn" below). When the script ends (booked / handed off / declined) →
the conversation's `state` flips to `agent`, and only from then on does the model write freely. The
phase is a **real column** (`Conversation.state`, a redesigned enum — see Code changes), not JSON.

> Things like the address hint `(street, city, and ZIP)`, one question per message, and the exact
> booking date/time are **not** separate rules the model has to follow — they're already written into
> the locked messages below. There is nothing for the model to "get right" in intake wording.

### Every intake turn: read the reply, THEN branch (this is the adaptive part — NOT a blind script)

Code owns the *order* of the asks; the model's understanding of each reply decides what actually
happens. It **never blindly fires the next message.** Each turn:

1. **They answered the current step** → record it → send the next locked message.
2. **They answered AND volunteered more** (gave the address *and* "yeah it's my house") → record both →
   **skip** the step we already know → jump to the next *unanswered* one. It never re-asks what it has.
3. **Off-script** — a question ("how much?", "can you come today?"), a comment, or info out of order →
   the agent **handles it in its own words** (answers, or `escalate_to_organization` for price / anything
   only the owner can answer), then returns to the pending step. *(Here the model writes — it's not a
   locked message.)*
4. **They pull back** ("I filled it but went with someone else", "nvm, I sorted it") → the model detects
   the withdrawal → warm graceful close → **intake ends.** It does NOT keep asking for the address.

The locked messages are just the wording for the *expected* asks. The script is the happy path;
anything unexpected is adaptive. So — to answer the obvious worry — no, it doesn't robotically send the
next question; it reads first, every time.

---

## The lead record (fixing "no name")

- The lead is created **on the event** with whatever we have; `contactName` starts empty/pending.
- **`qualify_lead` gains a `name` field** → writes `lead.contactName` (via `LeadFieldPatch.contactName`,
  which we add). The moment the customer gives their name, the **dashboard lead shows the real name**,
  not "Caller"/"New lead". Project, address, ZIP already flow to the lead the same way.
- So the lead row fills in live as intake progresses: name → project → address → status.

---

## WORKFLOW 1 — Website / email lead  (BUILD FIRST)

**Event:** forwarded lead email / form → email webhook. Parse it: we get the **project** and, if the
form had it, the **name**. Create the lead, run the sequence. Mechanism: code picks the next goal, the
model writes it in Sarah's voice — but the copy below is **LOCKED, word for word**.

### Happy path

**0 — Opening** — asks the address. Two blocks, blank line between:
```
Hi {name}! It's {assistant} with {company}. Thanks for reaching out, about your {project}. I'm here to help get it taken care of.

What's the property address so I can get someone out to take a look? (street, city, and ZIP)
```
Fallbacks: no name on the form → open with **"Hi there!"** and ask their name as its own step first.
No project → drop "about your {project}" → *"Thanks for reaching out. I'm here to help get it taken care of."*

**1 — Customer** — after they send the address. Records `qualify_lead{isDecisionMaker}`:
```
Got it, thanks {name}! And are you the decision-maker (the person who'd approve the work)?
```

**2 — Offer windows** — after customer = yes AND `qualify()` passes. `check_availability` (general):
```
Perfect! Here's when we could get someone out:
• {window 1}
• {window 2}
Any of those work for you?
```

**3 — Offer concrete times** — after they pick a day/part. `check_availability` (focused):
```
Perfect, {name}! On {day} I've got:
• {time 1}
• {time 2}
• {time 3}
Which works best?
```

**4 — Booking confirmation** — after they pick a time. `book_appointment`, then `phase = agent`:
```
You're all set for {weekday, month day} at {time}, {name}! We'll see you then. Anything else I can help with?
```

### Branch A — not the decision-maker (they answer #1 with "no / I rent")

**A1 — ask for the owner's contact:**
```
No problem! Could you share the decision-maker's name and best phone number? I'll reach out to them directly to get it set up.
```

**A2 — handoff close to the original contact** (once they give it; ends this thread):
```
Perfect, thank you! I'll reach out to {owner name} directly to get things going. Appreciate you passing it along!
```

**A3 — Sarah reaches out to the customer** — a NEW lead for the owner. Two blocks, blank line:
```
Hi {owner}! It's {assistant} with {company}. {referrer} reached out about {project} at {address} and passed along your number so I could get in touch. I'm here to help get it taken care of.

Would you like me to get someone out to take a look?
```
The owner's lead already has {project} + {address}, so on "yes" it skips straight to windows → times →
booking. If the owner isn't the right person either → escalate to the organization.

### Branch B — out of service area (`qualify()` = out of area; confirm BEFORE declining, to catch typos)

**B1 — confirm the address first:**
```
I just checked your address, and it looks like you're outside our service area. Just to confirm again, your address is {address} right?
```

**B2 — they confirm → decline** (ends intake):
```
Thanks {name}, I checked again and it really is outside our service area, but I've passed it along to the team just in case. Sorry about that, and I hope you get it taken care of soon!
```
If instead they give a **corrected address** → re-run the area check → now in area? continue the flow;
still out? send B2.

> ⚠️ Branch B mentions the service area — this **reverses** the current hard rule ("never mention
> coverage/area"). That rule gets updated when building this.

**End of sequence:** booked, handed off, or declined → `phase = agent` (the open agent handles the
non-linear rest — reschedule, questions, re-book, etc.).

---

## The lead AGENT phase (after intake, shared by 1 & 2)

Once intake completes, hand to the open agent (today's engine) for the **non-linear** rest only:
reschedule, cancel, answer/relay questions, re-book, "can you also look at…". Tools:
`check_availability`, `book_appointment`, `reschedule_appointment`, `cancel_appointment`,
`escalate_to_organization`. Its prompt drops all the qualification driving — intake did that.

---

## WORKFLOW 2 — Missed-call lead

**Event:** an unanswered call forwarded to Twilio. We know **nothing** but the phone number. Same
mechanism (scripted messages, model only reads replies), same LOCKED copy. Only the FRONT differs;
from the customer step on it's identical to Workflow 1.

### Front of the flow (missed-call specific)

**0 — Opening** — fires on the missed call, no variables:
```
Hi there! It's {assistant} with {company}. Sorry we missed your call! How can we help?
```

**1 — Their reply picks the branch:**

New job → ask name + address in one message. Records `qualify_lead{name, fullAddress, town, zip}`:
```
Happy to help get that taken care of! What's your name and property address? (street, city, and ZIP)
```

NOT a new job (existing customer, a question, wrong number) → `escalate_to_organization`, END intake:
```
Got it! I'll let the team know and get right back to you!
```

### From here on — IDENTICAL to Workflow 1

After the name+address reply: **Customer** (msg 1) → `qualify()` → **Windows** (2) → **Times** (3) →
**Booking** (4), plus the same **Branch A** (not the decision-maker) and **Branch B** (out of area, confirm
then decline). Then → `phase = agent`.

---

## Escalation handoff (shared — the missed-call "not a job" branch, and any agent-phase escalate)

Whenever Sarah escalates (`escalate_to_organization`), the handoff runs and is **never a dead end**:

1. **Escalate** — the organization is texted the lead's context/question ("…reply to answer them"), and
   the lead is told Sarah will get back to them (e.g. *"Got it! I'll let the team know and get right
   back to you!"*). The lead conversation flips to `phase = agent`.
2. **Owner answers** — replies to that text (handled in Workflow 3).
3. **Agent relays it** — Sarah messages the lead back **in her own words** (agent-composed, using the
   lead's name + context), NOT the old rigid *"Quick update from {company}: …"* template.
4. **Agent continues** — whatever the lead says next is handled by the open lead agent.

Chain: **escalate → organization answers → agent relays naturally → agent continues.** (The relay is a
rigid template only in today's code because there was no agent phase; now there is.)

---

## WORKFLOW 3 — Owner  (always agent)

**Event:** a owner texts the assistant. **No intake — agent from message one.** The "employee."

**Tools:**
- `find_leads({ name })` → the organization's matching leads `[{ leadId, name, project, area, status }]`.
- `send_message_to_lead({ leadId, message })` → delivers `message` to that lead + drops it into their
  thread (the note is agent-composed, in Sarah's own words).
- (later: `get_lead_status({ leadId })`, book/reschedule on behalf.)

**Behavior:** owner-facing. She can pass a note to a lead, look one up, or answer an escalation. Unsure
who they mean → `find_leads` + **asks**. Drafts the note in her own words (knows the name/project) →
**reads it back** → sends only on the owner's yes.

**Confirm-before-send — HARD GATE (code-enforced, not prompt-trusted).** `send_message_to_lead` is
two-phase: the first call **drafts** (records a pending send for that lead + returns the draft to read
back) and sends **nothing**; delivery only happens on a second call, and **code** verifies a pending
draft exists AND the owner's latest reply reads as a yes before it fires. The model literally cannot
message a customer without a real confirmation — it is not left to the prompt.

**Organization-facing messages** (functional, so fairly fixed):

- Multiple matches:
```
I found a couple named {name} — which one?
1. {name} · {project} · {area}
2. {name} · {project} · {area}
```
- Confirm before send:
```
Here's what I'll send {name}:

"{draft}"

Want me to send it?
```
- Sent:
```
Done! Sent to {name} ✅
```
- No match:
```
Hmm, I couldn't find a lead named {name}. Want to double-check the spelling?
```

**Escalation-reply relay lives here:** when the owner replies to an escalation text, this agent
recognizes it's answering the flagged question, composes the update to the lead **in her own words**,
and sends it (step 3 of the Escalation handoff above).

**Not** the source of lead notifications — booking/quiet/new-lead pings fire from Workflows 1 & 2 + the
proactive layer (unchanged).

---

## Routing (replaces one-size `handleInbound`)
```
inbound →
  sender is a organization?         → Owner agent
  else (a lead):
    conversation.state == intake  → Intake engine (step-list chosen by `source`)
    conversation.state == agent   → Lead agent
```

## Code changes (file by file — where, what, why)

### Phase = a real column: redesign the `ConversationState` enum
The vestigial `ConversationState` (`greeting|qualifying|proposing_slots|confirming|booked|done`) gets
**redesigned to the new model: `intake | agent | done`** — a proper, queryable column
(`Conversation.state`), NOT a JSON field. It's a migration, but the **DB is empty right now** (0 leads,
0 messages), so it's a clean, zero-data-risk change — do it right. The intake *step* is still not
stored — it's **derived** each turn (first unanswered step for the lead's `source`), so there's no
cursor to keep in sync.

### New files
- **`intake/engine.ts`** — one intake turn. On lead creation: send **step 0's** locked message. On each
  inbound: `extract` → the **4-branch** read-then-branch logic → send the next locked message (or an
  adaptive one for off-script). When the last step completes → set `conversation.state = "agent"`.
- **`intake/steps.website.ts`** / **`intake/steps.missedCall.ts`** — the ordered steps; each is
  `{ id, needs, message(vars), extracts, branches }`. The **LOCKED copy lives here, verbatim.**
  Missed-call reuses the website steps from `customer` onward.
- **`intake/extract.ts`** — the focused reply reader: one `generateObject` call that, given the reply
  (+ any image) and the current step, returns captured fields + a flag
  (`answered | volunteered_more | off_script(+question) | withdrew`). This drives the branch.
- **`agent/organizationTools.ts`** — `find_leads`, `send_message_to_lead`.
- **`agent/organizationAgent.ts`** — the owner-facing tool loop; also composes the **escalation-reply
  relay** to the lead.

### Changed files
- **`conversationService.ts`** — `handleInbound` becomes the **ROUTER**: owner sender → organization
  agent; lead + `phase != "agent"` → intake engine; lead + `phase == "agent"` → lead agent
  (`generateAgentReply`). Keep the conversation lock, idempotency, interaction-gap re-arm, nudge enqueue.
  **Delete the templated relay** in `maybeRelayOrganizationReply` — relay moves into the owner agent.
- **`leadService.ts`** — `createLeadAndGreet` / `reengageLead`: create/re-engage the lead, set
  `phase=intake`, call the **intake engine** to fire step 0. **Delete `runOpeningTurn` + `openingTrigger`**
  (opening = step 0's locked copy). A returning **booked** lead re-engages straight into `phase=agent`.
- **`agent/tools.ts`** — `qualify_lead` gains **`name`** → writes `lead.contactName`. **Fixes the
  dashboard "Caller"/"New lead" bug.** Tools assembled per context: intake = `{qualify_lead,
  check_availability, book_appointment, escalate}`; lead-agent = `{check_availability, book, reschedule,
  cancel, escalate}`.
- **`agent/ownerHandoff.ts`** — `handOffOwnerIfReady` **changes behavior**: instead of only pinging the
  organization, it **creates a new lead for the customer** + sends the outreach (Branch A3), which then
  runs a short intake (project+address already known). Organization still gets a heads-up.
- **`agent/runner.ts`** — `generateAgentReply` = the **lead AGENT phase** (post-intake); its prompt is
  trimmed of qualification-driving.
- **`packages/core/src/prompt.ts`** — split the one mega-prompt into: **(a)** extractor prompt (read the
  reply), **(b)** lead-agent prompt (non-linear), **(c)** organization-agent prompt. `openingTrigger`
  guidance is gone (now locked step 0).
- **`packages/db/prisma/schema.prisma`** — redesign the `ConversationState` enum to
  `intake | agent | done` (one clean migration; empty DB). No `phase` field on `GatheredInfo` — the
  `Conversation.state` column IS the phase.
- **`store/{types,prismaStore,memoryStore}.ts`** — add `contactName` to `LeadFieldPatch`.
  (`findLeadsByName` already exists; `contactName` column already exists — **no schema change**.)
- **`media.ts`** — the intake extractor also accepts inbound images (a photo of the damage mid-intake).

### Deleted
- **`organizationCommands.ts`** + **`organizationCommands.test.ts`** — replaced by the owner agent
  (keep `findLeadsByName`).

### Migration: **one clean migration** — redesign the `ConversationState` enum to `intake | agent | done`.
Zero data risk (empty DB). `contactName` column already exists (no change there).

### Tests — see the full "Testing overhaul" section below.

---

## Testing overhaul (VERIFIED — every test body audited, 4 parallel passes)

I read all ~30 test files line-by-line. Result: **fewer full rewrites than I first guessed, and one file
I had mis-categorized.** Verified buckets:

### DELETE (1)
- `organizationCommands.test.ts` — state machine gone (its coverage becomes the organization-agent test).

### KEEP — verified independent of the refactor (14 files: 5 api + 9 core)
- api: `integrity.test.ts`, `store/integrity.integration.test.ts`, `jobs/nudge.test.ts`,
  `jobs/escalationSla.test.ts` — all build fixtures via low-level `createLeadWithConversation` (stays),
  never assert old `state` values; test booking / idempotency / concurrency / proactive — all unchanged.
- api: **`agent/ownerHandoff.test.ts`** — *(correction: I'd wrongly listed this as a rewrite.)* It only
  tests `extractPhone`, a pure util → **KEEP.** (The ownerHandoff *behavior* change is covered in `tools.test.ts`.)
- core (9): `availability`, `qualification`, `notifications`, `conversation` (mergeGathered), `timezone`,
  `geo`, `leadEmail`, `onboarding`, `text` — pure functions the new engine still calls.

### KEEP-BUT-TWEAK — behavior survives, ~2 expectations each (3 files)
- `emailIntake.test.ts` (4) — email route + parsing + Postmark idempotency survive; only change: the
  outbound the lead gets is intake **step 0's locked message**, and `conversation.state` starts `intake`.
- `voiceIntake.test.ts` (9) — missed-call route + CallSid idempotency + 1h recency + stale re-engage all
  survive; the lead is still created `contactName:"Caller"` (name is captured *later* in intake), so that
  assertion stays; only the opening SMS text + start `state` change.
- `agent/tools.test.ts` (7) — every tool gate survives (qualify / availability / book / reschedule /
  cancel). **ADD**: `qualify_lead` writes `name`→`contactName`. **CHANGE**: the not-customer test —
  `handOffOwnerIfReady` now **creates a customer lead + texts them** (not just a organization ping).

### SPLIT / REWRITE (the genuine flow tests)
- **`conversationService.test.ts`** (10) → split, assertions redistributed so none are lost:
  - **`router.test.ts`** ← idempotent duplicate skipped; AI-error fails safe (no SMS); cold-inbound
    (default skip / `allowColdInbound` starts a lead); organization-sender routing.
  - **intake-engine / lead-agent tests** ← end-to-end qualify→offer→book + owner notify; disqualify
    out-of-area; price question → no quote + no book; post-booking reschedule keeps `booked`.
  - **organization-agent test** ← the escalation loop + relay (now agent-composed, not the template).
- **`leadService.test.ts`** (2) → creates the lead + **starts intake** (fires step 0), `state=intake`;
  the (organization,phone) dedup + re-engage assertions stay.
- **`prompt.test.ts`** (6 / 23 assertions) → 3 suites: **lead-agent prompt** gets the tool + guardrail
  assertions (never-quote, geo-privacy, escalation topics, hasBooking→reschedule/cancel, disqualified
  handling); the **website-vs-missed-call OPENING** assertions move to **intake-step tests** (they verify
  locked copy now, not a prompt); + new **extractor** + **organization** prompt tests.

### NEW unit tests
- **`intake/engine.test.ts`** — the 4 branches (scripted extractor): answered → next locked message;
  volunteered-more → skips ahead; off-script → adapt/escalate then re-ask; withdrawal → warm close. Plus
  **name capture writes `contactName`**.
- **`intake/steps.website.test.ts`** — happy path fires the exact **LOCKED copy** in order; Branch A
  (not-customer → customer lead created + outreach); Branch B (out-of-area confirm → decline; corrected
  address → re-qualify → continue).
- **`intake/steps.missedCall.test.ts`** — opening → name+address **vs** escalate branch → merges to the
  website steps from `customer` on.
- **`agent/organizationAgent.test.ts`** — find_leads + disambiguation; **hard-gate send** (no delivery
  without a pending draft + affirmative reply); escalation-reply relay is agent-composed.
- **`agent/leadAgent.test.ts`** — post-intake: reschedule / cancel / answer-via-escalate / re-book.

### E2E — keep the machinery, restructure the scenarios (audited)
- **`judge.ts` + `fixtures.ts`** (Sonnet judge + 4 timezone organizations) → **reuse as-is.**
- **`harness.ts`** → change ONLY the init — replace `createLeadAndGreet` with a channel-specific start
  into the new router/intake engine. Keep the whole surface (`say`, `sayRaw`, `organizationReply`,
  `status`, `appointments`, `escalations`, `offeredSlots`, `ownerSms`, `customerSms`).
- **Key insight:** the old e2e used the LLM judge for guardrails (one-question, warm tone, no em-dashes,
  geo-privacy) against the OPEN agent. In intake those are **guaranteed by the locked copy** → intake
  e2e asserts the scripted flow **deterministically** (exact messages + booking + branches), and the
  **judge-based guardrails move to the AGENT-PHASE e2e** (price / escalation / tone in open conversation).
- New per-workflow e2e (covering all 18 old scenarios' intent): `website`, `missedcall`, `handoff`,
  `outofarea`, `organization`, `agentphase`. **10 guardrails to preserve** (from the audit): timezone-
  correct booking, address-before-book, no price quote, escalation discipline, geo-privacy, one-question /
  warm / no-em-dash, no fake confirmation, notification dispatch, idempotency, reschedule/cancel/reopen.

### Code notes the audit surfaced (must-do; already in Code changes)
- `createLeadWithConversation` must default `state` to a valid new value (`intake`), not `"greeting"`.
- `qualify_lead` name→`contactName`; `handOffOwnerIfReady` creates+texts the customer; escalation relay
  becomes agent-composed. The tests above verify each.

---

## Docs to update (so nothing goes stale)

- **`SCOPE.md`**
  - **§Architecture v2** (top) — "Sarah is a tool-using agent" → **three workflows** (two scripted-intake
    → agent, one owner agent). Fix the tools list (`check_availability`, + organization tools).
  - **§5 "The Sarah conversation engine" + "Her job, in order"** — rewrite to intake-script → agent.
  - **§5 "Entry point matters… channel-aware prompting, *not* a separate agent"** — now WRONG: they ARE
    separate workflows. Rewrite.
  - **§5.1 Decision-maker → customer hand-off** — now Sarah **texts the customer directly** (new lead),
    not just pings the organization. Update.
  - **§5.1 missed-call note + §9.7** ("intent-agnostic opening / channel-aware prompting") — replace with
    the missed-call workflow (its own steps + intent branch).
  - **§5.3 Proactive layer** — verify wording (nudge/escalation now fire during the agent phase, still
    lead-triggered).
- **`TESTING.md`**
  - **§6 "Sarah — conversational behavior"** — rewrite scenarios for the scripted intake + agent phases.
  - **§8 Escalation** — the relay is now **agent-composed** (not the `Quick update from…` template); §8.3.
  - **§13 Missed-call** — update to the workflow.
  - **ADD**: intake tests (website steps, missed-call steps, off-script adaptation, **name shows on the
    dashboard**, owner-handoff outreach to the customer).
- **`README.md`** — update the high-level "how Sarah works" description.
- **`DEPLOY.md` / `EMAIL.md`** — no change expected (deploy + email design unaffected); double-check
  DEPLOY's worker section still reads accurately.

## Sequencing
1. **Website workflow** end-to-end (name fix → intake engine + 4-branch logic → website steps → agent
   handoff → doc updates for §5/§6).
2. **Missed-call workflow** (opening → name+address / escalate branch → reuse from customer).
3. **Owner agent** (find_leads + send_message_to_lead + escalation relay) → delete
   `organizationCommands.ts`.

## Decisions (chosen for the stronger foundation)
1. **Phase = a real `Conversation.state` column** (redesign the enum to `intake | agent | done`). One
   clean migration, free right now because the DB is empty. *(Not JSON — that was a shortcut.)*
2. Off-script mid-intake → the extractor flags it; the turn adapts (answer / escalate / close), then
   code re-asks the pending step. (the 4-branch logic above)
3. **Confirm-before-send = HARD GATE** — `send_message_to_lead` won't deliver unless code sees a pending
   draft + the owner's affirmative reply. *(Not prompt-driven — the send is safety-critical.)*
