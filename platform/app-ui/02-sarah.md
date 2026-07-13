# 02 — Sarah (the assistant's full page)

> Route: `/sarah`. Core surface — always on, never gated (no `preview`/`coming_soon` state).
> Builds on `00-foundation.md` (§3 widget, §5 seam + cast, §6 shared types, §7 routes) and
> `../AGENT_WORKFLOWS_PLAN.md` (Workflow 3 — the owner is ALWAYS an agent; the hard-gate send).

## 1. Purpose

The assistant, in-app. This page fronts the **Sarah agent core** (FEATURES.md Pillar 0): Sarah is
the interface to everything, and `/sarah` is where that stops being a marketing line and becomes a
screen. It is the full-screen big sibling of the global widget (00 §3 — the widget spec lives
there; this doc only specs the handoff): the complete owner↔Sarah conversation (the same one the
owner has by SMS), the log of everything she did across every module, and the queue of hard-gate
drafts waiting for the owner's explicit yes. It makes the sales promise literal: *you text her
like an employee, and everything she does is visible and under your control.* Every visit answers
the three questions from APP_UI_PLAN §1: what did Sarah do, what does she need from me, what can I
ask her to do next.

**Real today vs. mock:** the brain is real — the SMS owner agent exists
(`apps/api/src/agent/ownerAgent.ts` + `ownerTools.ts`) with `find_leads`, the
code-enforced hard-gate send, and the escalation relay
in Sarah's own words. Everything this page adds is new: owner turns are not persisted today
(`ownerAgent.ts` replies via `sms.send` with no store write), pending drafts live in an in-memory
map (invisible to the web app), there is no `Approval` or `SarahAction` table, and there is no
authed in-app chat endpoint. The page ships on mock fixtures (`fixtures/apex.ts`) behind the 00 §5
seam; `real.ts` lands with the backend work in §5 below.

## 2. Layout

Header + three tabs. `PageHeader` (00 §8) with title "Sarah" — **without** the "Ask Sarah" button
(this page IS Sarah); the global widget launcher is hidden on `/sarah` for the same reason.
Tab state in the URL: `/sarah?tab=chat|activity|approvals` (default `chat`); the Approvals tab
label carries the pending-`Approval` count — the same number as the sidebar badge.

### Chat tab (default)

```
┌────────────────────────────────────────────────────────────────┐
│ Sarah  ● online              [ Chat ] [ Activity ] [ Approvals ③]
├────────────────────────────────────────────────────────────────┤
│  ── Wednesday ────────────────────────────────────────────────  │
│  ┌ Needs an answer ────────────────────────────────────────┐   │
│  │ Jorge Alvarez asked: "Do you install copper gutters?"   │   │
│  │ (esc_301 · open 2h)                          [Answer…]  │   │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌ Approval — Review ask → Mike O'Brien ───────────────────┐   │
│  │ "Hi Mike, it's Marcus from Apex Roofing — hope the      │   │
│  │ roof's held up great. Mind leaving us a quick review?…" │   │
│  │ [Send it]  [Edit]  [Decline]                            │   │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│                 what's thursday look like?   ● Marcus · via SMS│
│  ✦ Sarah   3 estimates — 9:00 Newton (the Patels), 11:30       │
│            Brookline, 2:00 Waltham. Drive-time routed, with a  │
│            40-min gap at 1:00. Want me to fill it?             │
│                                                                │
│                        yes, see if linda tran…   ● Marcus · app│
├────────────────────────────────────────────────────────────────┤
│  chips: "Anything waiting on me?" · "How's the Alvarez quote?" │
│  [ Message Sarah…                                          ➤ ] │
└────────────────────────────────────────────────────────────────┘
```

- One continuous thread, day-dividers, newest at bottom, auto-scrolled. Owner bubbles right,
  Sarah left. Owner bubbles carry a small `via SMS` / `via app` marker (`SarahMessage.via`).
- Open escalations and pending approvals render as **cards pinned above the latest messages**
  (same card components as the widget, 00 §3) — approve/edit/decline and answer-escalation happen
  inline, without leaving the thread.
- Composer: textarea + send; suggestion chips above it (§3). Enter sends, Shift+Enter newlines.
- Arriving from the widget's ⤢ / "See everything →": `/sarah?m=<messageId>` scrolls to that
  message (thread position preserved, per 00 §3).

### Activity tab

```
│  [ All modules ▾ ]  [ Search… ]                                │
│  ── Today ────────────────────────────────────────────────────  │
│  ✦ 9:02a  Booked Sam & Priya Patel — Thu 9:00      Schedule  ↗ │
│  ✦ 8:47a  Staged review ask → Mike O'Brien          Reviews  ↗ │
│  ── Yesterday ────────────────────────────────────────────────  │
│  ✦ 4:15p  Marked inv_2031 paid — Dana Miller       Invoices  ↗ │
│  ✦ 2:30p  Escalated: copper gutters (Jorge Alvarez)    Core  ↗ │
```

- The `ActivityEntry` log (reverse-chronological, day-grouped), filterable by module
  (`?tab=activity&module=quotes` deep-linkable) + free-text search. Every row deep-links to the
  record via `href` (e.g. `/crm/ct_dana`, `/schedule`, `/quotes/q_1043`).
- List, not `DataTable` — no columns to sort; it reads as a feed.

### Approvals tab

```
│  Waiting on you (2)                                            │
│  ┌ Review ask → Mike O'Brien ──────── Reviews · staged 8:47a ┐ │
│  │ "Hi Mike, it's Marcus from Apex Roofing…"                 │ │
│  │ [Send it]  [Edit]  [Decline]                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌ Follow-up → Jorge Alvarez ──────── Follow-ups · staged 8:12a│
│  │ "Hi Jorge! Just checking in on the leak-repair quote…"    │ │
│  │ [Send it]  [Edit]  [Decline]                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│  Needs an answer (1)                                           │
│  │ Jorge Alvarez: "Do you install copper gutters?" [Answer…] │ │
│  Recently resolved  (approved/declined, last 7 days)           │
```

- Full queue of pending `Approval`s (kinds: `customer_message`, `quote`, `review_ask`, `post`,
  `social_post`), then open escalations as **to-answer items**, then a collapsed resolved list.
- Approving here is *the explicit yes* — code sends, the model never does (§3, §5).

### Mobile

Tabs become a segmented control under the header. Chat is full-screen with a sticky composer
(above the keyboard); cards stack full-width; Activity/Approvals are single-column lists. The
widget launcher stays hidden on this route.

## 3. Sarah

This page doesn't *feature* Sarah — it **is** Sarah.

- **Three surfaces, ONE conversation.** SMS (the owner texts the assistant number), the global
  widget (00 §3), and this page are three views of a single owner thread run by one brain — the
  owner agent (`ownerAgent.ts`, AGENT_WORKFLOWS_PLAN Workflow 3; the owner is ALWAYS an
  agent, no intake script). Marcus can text "what's thursday look like?" from his truck and see
  Sarah's answer here, then type the follow-up in the app — same history everywhere, each owner
  message tagged `via: 'sms' | 'app'`. Nothing forks; there is no "web Sarah" vs "text Sarah."
- **Page context.** Turns sent from this page carry `context: { route: '/sarah', module: 'core' }`
  (same envelope as the widget, 00 §3). Suggestion chips come from `MODULES.sarah.sarahChips`
  (the registry includes the core surfaces — 00 §5): *"Anything waiting on me?"* ·
  *"What's Thursday look like?"* · *"How's the Alvarez quote?"* — refreshed contextually (e.g. the
  quote chip appears because q_1043 is unanswered).
- **What she did** → the Activity tab: every tool success emits a `SarahAction` (00 §6); this page
  is the only surface showing the full log (the widget shows none; Home shows a digest).
- **What she needs from you** → approvals + escalations. The **hard gate** is the product's core
  safety property (AGENT_WORKFLOWS_PLAN, Workflow 3): for any customer-visible send Sarah only
  *stages a draft*; **code** delivers it, and only after the owner's explicit yes — a "yes" text
  on SMS, or the [Send it] button here. Same gate, two doors. Declining tells Sarah to drop it;
  editing lets Marcus tweak the exact words before the send.
- **Escalations** appear as to-answer items (Jorge's copper-gutters question, `esc_301`).
  Answering here does what an SMS reply does today: Sarah relays the answer to the customer **in
  her own words** (agent-composed, existing behavior) — the owner writes to Sarah, never raw to
  the customer. Escalation answers are not hard-gated today (the SMS reply relays without an
  extra confirm); the in-app [Answer…] matches that (see §8 Q4).
- **Handoff with the widget:** the widget owns quick asks anywhere; this page owns long threads,
  the log, and the full queue. The widget's ⤢ and footer link land here with position preserved;
  this page never re-implements the launcher.

## 4. Data contract

Owned here per 00 §6: **`SarahThread`**, **`ActivityEntry`**. `Approval` and `SarahAction` are
referenced from 00 §6, never redefined.

```ts
interface SarahThread {                 // THE owner conversation — exactly one per organization
  id: string                            // maps from: none (new — owner turns aren't persisted today)
  organizationId: string
  messages: SarahMessage[]              // ascending by `at`
  pendingApprovalIds: string[]          // maps from: ownerAgent.ts in-memory `pending` map → the
                                        //   persisted Approval table this build introduces (§5)
  openEscalationIds: string[]           // maps from: Escalation (status = 'open')
}

interface SarahMessage {
  id: string
  at: string                            // ISO; rendered in the organization's timezone
  role: 'owner' | 'sarah'
  body: string
  via: 'sms' | 'app'                    // owner messages: which surface; Sarah's replies inherit
                                        //   the turn's surface. maps from: none (new column)
  context?: { route: string; module: ModuleKey | 'core'; entityId?: string }
                                        // app-turn envelope (00 §3); absent on SMS turns
  approvalId?: string                   // set when this turn staged a hard-gate draft
  escalationId?: string                 // set when this turn answered/raised an escalation
}                                       // maps from: none (new — Message belongs to lead
                                        //   Conversations only; owner thread needs its own store)

/** One row of the Activity tab. EXTENDS SarahAction (00 §6) — same id-space, same rows, same
 *  emitter (api emits on tool success); adds only what the full-page log needs. The widget and
 *  Home consume plain SarahAction; this page's provider returns the enriched shape. */
interface ActivityEntry extends SarahAction {
  detail?: string                       // second line: draft excerpt, slot moved from→to, amount
  approvalId?: string                   // present when the action staged a hard-gate draft
  outcome?: 'done' | 'pending_approval' | 'approved' | 'declined'
                                        // derived: join SarahAction ↔ Approval.status
}

// ---- API contract for in-app chat (new backend surface — see §5) ----
interface SarahTurnRequest {
  cid: string                           // signed HMAC token (signState({ organizationId }))
  text: string
  context?: { route: string; module: ModuleKey | 'core'; entityId?: string }
}
interface SarahTurnResponse {
  messages: SarahMessage[]              // the owner turn + Sarah's reply (or replies)
  approval?: Approval                   // present when the turn staged a hard-gate draft
}

interface SarahProvider {               // 00 §5 seam: lib/data/sarah/{types,provider,mock,real}.ts
  getThread(): Promise<SarahThread>
  getActivity(filter?: { module?: ModuleKey | 'core'; q?: string }): Promise<ActivityEntry[]>
  getApprovals(): Promise<Approval[]>   // pending first, then recently resolved
  sendTurn(req: Omit<SarahTurnRequest, 'cid'>): Promise<SarahTurnResponse>
  resolveApproval(id: string, decision: 'approve' | 'decline', editedPreview?: string): Promise<Approval>
  answerEscalation(id: string, answer: string): Promise<void>
}
```

Fixtures (`fixtures/apex.ts`, ids minted here): approvals `ap_501` (`review_ask` → `ct_obrien`,
the O'Brien card from 00 §3's widget wireframe) and `ap_502` (`customer_message` → `ct_alvarez`,
the q_1043 follow-up chase); thread includes the Thursday-schedule exchange (`via: 'sms'`) and an
`app` follow-up; activity includes the Patel booking, `inv_2031` paid, and the `esc_301` raise.

## 5. Actions

| Action | Mechanism | Sarah's engine? |
|---|---|---|
| Send a chat turn | api call: `POST /sarah/turn` (**new** route) | **Yes** — runs one owner-agent turn |
| Approve a draft | api call: `POST /sarah/approvals/:id` `{ decision: 'approve' }` (**new**) | No model call — **code sends** (the hard gate) |
| Edit-then-approve | dialog edits `preview` → same endpoint with `editedPreview` | No — code sends the edited text verbatim |
| Decline a draft | same endpoint, `decision: 'decline'` | No — marks declined; Sarah is told next turn |
| Answer an escalation | api call: `POST /sarah/escalations/:id/answer` (**new** entry point) | **Yes** — existing relay composes it in Sarah's words |
| Filter/search activity | client-side over provider data; URL-synced | No |

**The in-app chat endpoint (new backend surface — what exists vs. what's new):**

- **Exists:** the brain (`apps/api/src/agent/ownerAgent.ts` — `handleOwnerTurn`, tools
  `find_leads` + `prepare_message_to_lead` in `ownerTools.ts`); the code-gated confirm (YES/NO
  regex on the owner's next reply, pending drafts TTL'd 15 min, `stageLeadNotice` for other flows
  to stage drafts); the escalation-answer relay in Sarah's own words; the HMAC-`cid` pattern
  (`calendar/google/state.ts` `signState`/`verifyState`, used by `routes/appointments.ts` —
  a web server action mints a short-TTL signed token carrying `{ organizationId }`; the Express
  api verifies it and checks ownership).
- **New — `POST /sarah/turn`** (`apps/api/src/routes/sarahTurn.ts`): auth by extending that same
  HMAC-`cid` pattern (v1 choice — zero new auth machinery; see §8 Q3). Body `SarahTurnRequest`;
  runs one owner-agent turn and returns `SarahTurnResponse`. Requires refactoring
  `handleOwnerTurn` to be **channel-aware**: accept `via: 'app'` + the `context` envelope
  (injected into the system prompt so "quote this job" resolves `entityId`), and *return* the
  reply instead of only `sms.send`-ing it. SMS keeps its path; both call the same turn function.
- **New — persistence, the prerequisite for one-thread-three-surfaces:** (a) persist owner turns
  (today they vanish — no store write in `ownerAgent.ts`) so both surfaces render one history;
  (b) generalize the in-memory `pending` map into a persisted **`Approval`** table (00 §6 shape)
  so a draft staged by SMS shows in the app and vice versa, and a yes on either surface resolves
  it **exactly once** (conditional `UPDATE … WHERE status='pending'`, per SCOPE's integrity
  invariants); (c) emit **`SarahAction`** rows on tool success (00 §6 `maps from` note).
- **New — `POST /sarah/approvals/:id`**: verifies `cid` + ownership, conditionally flips status,
  and on approve fires the same code-send the SMS "yes" fires today. **New —
  `POST /sarah/escalations/:id/answer`**: same relay path the SMS webhook runs when the owner
  texts back.
- **Mock mode** (00 §5): mutations mutate nothing — optimistic thread append, success toast, and
  a fake `SarahAction` enqueued so the demo feels alive.

## 6. Components

- From 00 §8 / the kit: `PageHeader` (no Ask-Sarah button here), `tabs`, `avatar` (✦ Sarah mark),
  `dialog` (edit-draft), `textarea` + `button` (composer), `badge`/`StatusBadge` (approval
  status, via-markers), `skeleton` (loading), sonner toasts, `select` (module filter),
  `EmptyState`.
- Shared with the widget (build once in `src/components/app/`, both surfaces import):
  **`SarahMessageBubble`** (role, via-marker, day dividers), **`ApprovalCard`**
  (approve/edit/decline; 00 §3 renders the same card), **`EscalationCard`** ([Answer…] flow).
- **Missing from the kit (flag):** `ChatThread` (scroll container: auto-scroll, day grouping,
  scroll-to-`?m=`, pinned cards) and `ChatComposer` (textarea + chips + send) — new composites,
  not shadcn primitives; they live in `components/app/` and are reused by the widget panel.

## 7. States

- **Gating: none.** Core surface — `/sarah` is always live, even for a brand-new organization
  (Sarah works by SMS from day one, so the page always has a real thing to show).
- **Running-with-no-data-yet:** first visit, no history — the thread opens with one Sarah message
  in the set-it-up-for-you voice: *"Hi Marcus — I'm Sarah. I'm already answering your line; text
  me or type here. Ask me anything about your leads, schedule, or jobs."* + starter chips. Never
  a blank pane. Approvals empty: *"Nothing waiting on you — Sarah will ask before anything goes
  out."* Activity empty: *"Everything Sarah does will show up here."* (`EmptyState`, no
  build-it-yourself framing.)
- **Turn in flight:** owner bubble appends optimistically + a typing indicator; composer stays
  enabled (queued turns run serially — the api serializes per-conversation).
- **Turn failed** (api/model error): typing indicator becomes an inline *"That didn't go through
  — try again"* row with a retry; the typed text is preserved. Fail safe, never a thrown page.
- **Approval already resolved elsewhere** (e.g. Marcus texted "yes" moments earlier): the
  conditional update loses → the card flips to its resolved state with a toast *"Already sent by
  text"* — never a double-send.
- **Loading / error:** `loading.tsx` skeletons per tab; route errors via the `(app)` group
  `error.tsx` (00 §8). All mutations toast success + failure.

## 8. Open questions

1. **Owner-thread storage:** new `OwnerThread`/`OwnerMessage` tables, or reuse
   `Conversation`/`Message` with an owner-flagged conversation per organization? (Schema decision;
   blocks the persistence work in §5.)
2. **Live sync:** when Marcus texts by SMS with `/sarah` open, how does the page update — polling
   (10–15s, cheap, v1-able) vs. SSE/WebSocket from the api? Spec assumes polling; confirm.
3. **Auth pattern:** extend HMAC-`cid` per request (spec's v1 choice) vs. verifying the Supabase
   JWT in Express as a proper authed JSON route — pick before more web→api surfaces accrete.
4. **Escalation answers:** keep them un-gated in-app (matches SMS today — the answer *is* the
   intent), or show Sarah's composed relay for a confirm first? Un-gated assumed; gating adds a
   round-trip to `esc_301`-type flows.
5. **Approval TTL:** the in-memory map expires drafts after 15 min; persisted Approvals need a
   policy — expire `customer_message` fast but let `review_ask`/`post` drafts live for days?
   (Drives the `expired` status + the resolved list.)


## 9. Reconciliation note (2026-07-12 audit)

**As built (doc statements superseded):**
- The Approvals tab and Home share **`ApprovalRows`** (Linear-style rows, hover-expand, inline
  edit) — not the card stack; the widget keeps compact `ApprovalCard`s. No group headers /
  resolved-list yet (deferred below).
- **Counts match everywhere now:** sidebar badge = launcher badge = Approvals tab = Home
  "Needs you" = pending approvals + open escalations, all from `SarahProvider`
  (`initialEscalations` seeded by the layout; real accounts fetch `listOpenEscalations`).
- **Edit-then-approve sends the edit**: `approve(id, editedPreview?)` →
  `resolveApproval(id, decision, editedPreview)`; both row and card editors pass their draft;
  the activity entry says "Sent (with your edits)".
- **Escalation answering**: "Answer via Sarah" (row, widget card, or /sarah tab → Chat) calls
  `beginEscalationAnswer(e)` — prefills the composer ("Answer for Jorge: …"); the next send
  resolves the escalation, logs a SarahAction, and Sarah confirms she'll relay it in her words.
  The api-side `POST /sarah/escalations/:id/answer` stays future; this is the UI contract.
- The **widget now renders escalation cards** above approvals (it must — its badge counts them).
- `openWidget({ entity })` carries record context: "Ask Sarah about Dana" shows
  "On: CRM · Dana Miller" in the composer's context chip (clears on route change).
- Approval kinds in play: `customer_message, quote, invoice, review_ask, post, social_post,
  site_edit` (registry `KIND_META`). Fixture ids are `apr_1..apr_5` (O'Brien review ask, the
  site edit, the Nina Miller referral hello, the Miller blog + Facebook posts) + `esc_301`.
  Sarah chips: "Anything waiting on me?" · "What's Thursday look like?" · "Who's gone quiet?".

**Deferred:** pinned cards above the /sarah Chat thread · Activity search, day grouping, URL
sync, and per-row href derivation from `contactId` · `?m=` scroll-to-message · via-app markers
+ day dividers in the thread · "Recently resolved" section · the `lib/data/sarah/` provider
seam (`SarahThread`/`ActivityEntry` types, `sendTurn` context envelope) · contextual chip
refresh.