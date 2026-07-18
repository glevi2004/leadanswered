# The workflow — Lu's nervous system (the flow layer)

> The spec for how information CIRCULATES: how Lu knows the state of the world, how work reports back into
> the conversation, how the chat shows process, and how canvas grants reach agents. This is the paper's
> **Stateful Mediator** (§3.1 — "captures the output, updates the global context state, triggers the next
> agent with the precise context slice; the authoritative state lives in the journal") made concrete — the
> layer the 2026-07-17 flow review found entirely missing. Cascade: [paper.md](../paper.md) →
> [FOUNDATION](../FOUNDATION.md) → this spec → [harness-spec](./harness-spec.md) (phases) →
> [DEVELOPMENT](../DEVELOPMENT.md) (status). Handbook: [building-agents](./building-agents.md).

## §0 — The doctrine

1. **The journal is the spine.** Every notable transition in the system writes an `AgentEvent` row. Nothing
   notable happens silently.
2. **The conversation is the log.** Terminal events (preview ready, verify failed, published, build failed,
   plan approved) append real messages to Lu's thread. The chat is the company's memory made visible — it
   must be true after a reload.
3. **Lu is never blind.** Every orchestrator turn is injected with the situational block: open tasks,
   pending approvals, connections, the active plan, recent events. Lu never has to *guess* what to do next.
4. **The UI never lies.** Every interactive element either works end-to-end or says **Coming soon**
   (disabled + labeled). No silent no-ops, no mock data rendered as real, no badges computed from local
   state when server truth exists.
5. **One source of truth.** Every surface (chat, dock tabs, canvas, department pages) renders the same
   rows + events — different projections, never different data.

## §1 — The event journal (`AgentEvent`)

**Schema** (additive):

```prisma
model AgentEvent {
  id        String   @id @default(cuid())
  orgId     String
  taskId    String?
  kind      String   // see the kinds table
  message   String   // one-line human-readable summary (rendered in feeds)
  payload   Json?    // structured detail (urls, unmet[], error)
  createdAt DateTime @default(now())
  @@index([orgId, createdAt])
  @@index([taskId])
}
```

**Kinds and writers:**

| kind | written by | when |
|---|---|---|
| `plan_proposed` | `propose_plan` | plan artifact + approval staged |
| `plan_approved` / `plan_rejected` | `routes/approvals.ts` | owner resolves `approve_plan` |
| `build_dispatched` | `dispatch.ts` | task handed to the worker |
| `coding_finished` | `run_coding_agent` | sandbox run done (payload: exitCode, sha) |
| `preview_ready` | `open_preview` | PR + preview deploy exist (payload: url, prNumber) |
| `verify_passed` / `verify_failed` | `verify_acceptance` | judge verdict (payload: unmet[]) |
| `publish_requested` | `request_publish` | approval staged |
| `published` | `confirmPublish` | merged + promoted (payload: url) |
| `build_failed` | `worker.ts` / `dispatch.ts` | retries exhausted / in-process throw |
| `question_asked` | `ask_user` | question + options persisted (payload) |
| `departments_activated` | `routes/approvals.ts` | onboarding accept |

**Row hygiene that rides along** (bugs found in the flow review): `confirmPublish` marks the **Task
`done`** (today no code path ever writes `done` — a published task stays `needs_approval` forever); the
engineering run sets **`Agent.status` `working` → `idle`** around it (today it is always `idle`).

## §2 — The situational block (Lu's live context)

Assembled every orchestrator turn (`agent/situational.ts`, injected after org memory in
`orchestrator.ts`), bounded and best-effort like `resolveOrgMemory`:

```
Current state (live):
- Connections: github ✓ · vercel ✓ · supabase ✗
- Open tasks: [t_123] "Build marketing site" — needs_approval (preview: <url>) · …
- Awaiting your owner: publish approval on t_123 · plan approval on t_456
- Recent events (last 8): preview_ready t_123 · verify_failed t_123 (2 unmet) · …
```

Caps: 10 tasks · 8 events · 2k chars. Sources already exist (`listTasks`, `listApprovals` via reads,
`connectionStatus`, `listEvents`). **`list_status` is upgraded** to return real rows (id · title · status ·
department · preview url), not counts — so Lu can also drill in on demand.

## §3 — Report-back (the conversation stays true)

A helper `postToThread(store, orgId, content, meta?)` appends an **assistant** message (with `meta` JSON
identifying the event) to the org's main thread. Called on the terminal events only — the thread is a log,
not a firehose:

- `preview_ready` → "The preview for **{title}** is up: {url} — review and Publish when ready."
- `verify_failed` (final, after rework) → "Verification found unmet items on **{title}**: {unmet}. I'm on it / need your input."
- `published` → "**{title}** is live: {url}."
- `build_failed` → "The build for **{title}** failed after retries: {reason}. Want me to retry or re-plan?"
- `plan_approved` → "Plan approved — dispatching the Engineer on **{objective}**."

These messages are in the thread → they survive reload, they're in Lu's next-turn history, and the memory
consolidator folds them into core memory for free. This closes the loop the review found missing: **work
reports up.**

## §4 — Chat states (derived, not invented)

The chat surface derives a phase from data it already polls — no new state store:

`idle` → `thinking` (request in flight) → `awaiting_input` (unanswered `question_asked` event) →
`awaiting_plan_approval` (pending `approve_plan`) → `building` (task `in_progress`) → `verifying`
(`verify_*` events streaming) → `needs_you` (pending publish approval) → `done` / `failed`.

Rendering: the typing indicator gains a phase label ("planning…", "building…", "verifying…"); the build
tracker's rows come from tasks + events; the **dock badge counts server truth** (pending approvals from the
poll — today it counts a local array that starts empty and lies).

## §5 — `ask_user` becomes a real question

The tool writes a `question_asked` event (question + options). The UI renders options as **buttons**;
clicking one **sends that option as the owner's message** (the round-trip today: options are decorative
`<span>`s and the answer is whatever gets typed). An event answered = a user message after it — no new
state machine needed.

## §6 — The canvas grant contract (make edges real)

The injection pipeline exists (`resolveConnectedContext` → the Engineer's prompt) but is inert because the
＋ menu creates nodes with no `refId` and node **content lives only in localStorage**. The contract:

- **Creating a note/file/site node creates a backing `Artifact`** (kind `note`/`file`/`site_ref`, payload =
  content/url) and sets `CanvasNode.refId`. Content edits update the artifact. localStorage becomes a
  cache, not the store.
- With that, `reads` edges inject for real — zero new pipeline code.
- **Agent outputs appear on the canvas**: `open_preview` upserts a `site` CanvasNode (refId → the
  site_preview artifact) connected `produces` to the Engineering agent.
- **Deferred behind Coming soon**: `uses` edges / `drive_terminal`, folder (`Collection`) membership.

## §7 — The UI honesty rule (functional or Coming soon)

Every interactive element is wired or explicitly labeled. The full inventory lives in the UI audit
(2026-07-17); the standing rule for all new UI: **no silent no-ops, no mock data presented as live, no
locally-computed badges when server truth exists.** Known items to label or wire on sight: Revert All /
Request changes (stubs), Supabase console write buttons (label exists — keep), team page (mock data),
`/home` staleness, non-interactive ask_user chips (§5 wires them).

## §8b — THE DEV-LOOP UI (added 2026-07-18; the surface for the dogfood ladder)

**The organizing rule — one object, three sizes.** The UI's mess came from every surface inventing
its own fragment of a build. From now on there is ONE renderable object — **the Build** (a task +
its plan, events, artifacts, approvals, all server rows) — rendered at exactly three sizes, always
fed by the same data:

1. **Card** (inline in the chat) — the live, interactive telling of one build.
2. **Row** (Home · Tasks tab · canvas badges) — status dot · title · phase · one-line latest event.
3. **Page** (the Task Detail — NEW, the missing hub) — everything, at `/task/[id]` and as a dock
   panel: the plan (objective · steps · acceptance as a CHECKLIST with per-criterion verify
   verdicts + screenshot thumbnails), the events timeline (the journal, human-readable), the PR
   diff, the live preview iframe, pending approvals with buttons, and the actions (Retry ·
   Request changes → prefills the composer · Open PR · Open preview).

**Every row and card clicks through to the Page.** No more "the detail exists but is buried."

**The chat (the spine) — what a build looks like in the thread:**
- Lu's turns: plain text (already shipped). Structured turns attach CARDS (the `SarahMessage.card`
  pattern — connect was the first): `plan` (approve/revise/reject), `import` (pick a repo — step 2),
  `migration` (the SQL diff + preview-branch/approve gate — step 5), `verify` (the acceptance
  checklist verdict), `publish` (the gate).
- While a build runs, its ONE chat card progresses in place: `planning → awaiting your approval →
  building (live activity line from the journal) → PR + preview → verifying (criteria check off) →
  needs you (Publish) → live (URL)`. Phase label replaces the bare typing dots (§4). The card is
  server-derived, so reload-safe.
- Report-backs (§3) keep landing as thread messages between cards — the conversation stays the log.

**Per ladder step, what appears:**
1. *Downscoping* — invisible, except the Task Detail's event timeline shows "sandbox token: repo-scoped, 1h".
2. *Import existing* — Company tab gains **Projects**: imported repos + Lu-built sites as one list
   (each → its project page: repo · Vercel link · REPO PROFILE editor (setup/test commands, env) ·
   builds history). In chat, "work on my X repo" → Lu answers with the **import card** (repo picker
   from the App install → auto-detected profile → confirm). Canvas: a project node per imported repo.
3. *Verification* — the acceptance checklist becomes REAL UI: per criterion ✓/✗ + evidence
   (screenshot thumbnail, test output tail) in the verify card + Task Detail. No more prose verdicts.
4. *Slack* — mirror, not a fork: the same Build renders as Slack messages (plan → Approve/Request
   changes buttons · report-backs · Publish button), threaded per build; the dock thread shows a
   small "also in #channel" marker. One conversation, two clients.
5. *Migration gate* — the **migration card**: the SQL/schema diff, target shown as `preview branch`,
   Approve = merge-to-prod-DB. Never buried in a transcript.
6. *Railway* — a fourth provider row in the connect panel + deploy target shown on the project page.

**The canvas + the Engineering department app (the workspace leg):**
- **Agents visibly RUN.** `Agent.status` (working/idle) is real now — the Engineer's canvas node
  pulses/spins while a build runs, captioned with the latest journal event ("coding finished on
  grovebox-site…"). Lu's node shows her phase during a turn. The agent-updates pill keeps its
  Review click-through. No more roster that always says idle.
- **Department Home** = the Projects list (Lu-built sites + imported repos, one list — same source
  as Company→Projects); each row → the project page (repo · Vercel · repo profile · build history).
- **Department Workplace** = EXECUTES, not just views: task selector rows open the Task Detail;
  the preview iframe stays; **Request changes becomes REAL** (prefills the composer with the build
  context and jumps to Lu — kills the Soon label); Publish stays gated; Retry appears for failed
  builds. Revert-all stays Soon until a rollback endpoint exists.
- **Database console** = wire the four write actions whose backend endpoints already exist
  (generate/rotate secret key · new bucket · add redirect URL · add user) behind confirm dialogs —
  they've been disabled-with-Soon since the audit; the api routes are live.
- **"Watch the build" (later, deluxe):** attach the canvas terminal to the BUILD's sandbox pty so
  you can literally watch the coding agent type — today build sandboxes and terminal sandboxes are
  separate; needs an attach path on the Sandbox port. Tracked, not step-0.

**Kill-list (the current mess this replaces):** the chat build tracker's ad-hoc fragments grow into
the Card; Home stays to-do-only (done); the Tasks tab becomes Rows that open the Page; the
department Workplace's task selector links to the Page instead of duplicating it; the always-idle
agent roster and the decorative canvas states go live or go away.

## §8 — Build order (slots into harness-spec P1)

1. [x] `AgentEvent` migration + store methods + event writes + row hygiene (`done`, agent status) — §1
   *(shipped 2026-07-17: `journal.ts`, events at plan/dispatch/coding/preview/verify/publish/fail,
   `confirmPublish` marks tasks `done`, Engineer shows working/idle; + the publish code-gate)*
2. [x] Situational block + upgraded `list_status` — §2 *(`agent/situational.ts`, injected every turn;
   `list_status` returns real rows + approvals + events)*
3. [x] `postToThread` report-back on terminal events — §3 *(preview ready · published · build failed ·
   plan approved land in the thread as system-authored messages with `meta`)*
4. [x] Web: thread rehydration + live report-back merge (`/api/lu/history`), honest badge (server-truth
   approvals), live activity line in the build tracker (`/api/dock/events`), ask_user options are real
   buttons — §4/§5
5. [ ] Canvas: artifact-backed nodes + auto site node — §6 *(next: the ＋ menu must create backing
   Artifacts with `refId` and persist content to the DB so `reads`-edges actually inject)*
6. [x] Coming-soon sweep from the UI audit — §7 *(first pass 2026-07-17: dead New-agent buttons,
   Attach, Domain/Email/Payment rows, canvas action bar → labeled; Review pill wired; fake Context
   JSON → honest text; team add-teammate labeled session-only; `/agents` legacy page → redirect;
   `/welcome` copy rewritten. Remaining partials: canvas text/draw/file persistence — ride §6.)*
