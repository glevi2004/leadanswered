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
