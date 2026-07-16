# Lu Computer — Development Plan

The build sequence from where the code **actually is** to a platform that builds itself. Grounded in the
current codebase, sequenced toward the first milestone: **Lu builds Lu (dogfood)**. This is the *how/order*
— the *what/why* is the canon ([MANIFESTO](./MANIFESTO.md) / [FOUNDATION](./FOUNDATION.md)), the *themes*
are the [ROADMAP](./ROADMAP.md). This doc changes as we build.

## Where we actually are

Real and deployed: the **runtime** (Lu orchestrator + Engineer, both real `generateText` tool-loops), the
**Engineer pipeline** (`create_site → run_coding_agent` in an e2b sandbox `→ open_preview → request_publish
→ confirmPublish`), the **cloud terminal** (ws ↔ e2b pty), the **canvas** (pan/zoom, live site-preview +
terminal + task-watch nodes), **onboarding** (waitlist-gated → provisions Engineering), and the **Store**
(Prisma + in-memory, canvas tables included).

The honest gaps that block the milestone:
- **Runs are in-process fire-and-forget** (a `Map` in `routes/agents.ts`) — a restart loses a build. No
  worker, though `bullmq` + `REDIS_URL` + a `"./worker"` export are declared and `worker.ts` is missing.
- **Lu can't call the Engineer.** The orchestrator only writes `Task` rows; the hand-off is hard-coded in
  the Next proxy `/api/lu/chat`. There is no agent→agent in the runtime.
- **Deploy is unproven** — `deploy/vercel.ts` is written but self-flagged "verify against a live run"
  (promote-to-prod + domain attach are the money path).
- **Canvas doesn't persist** — `CanvasNode`/`Edge` tables + Store methods exist but have **no routes/client**;
  notes are local React state, positions are localStorage.
- **Absent:** durable worker, agentic multi-agent orchestration, presets beyond Business, xAI/Grok,
  channels (SMS/email/Slack), BYO/OAuth. **Debt:** ~360 `Sarah` refs + `@leadanswered/*` package names.

## The milestone: Lu builds Lu

Hand Lu a task → a small fleet of coding agents build it **durably** (survives restarts, runs overnight) →
it **ships to real infra** → we use Lu to build the rest of Lu. This hardens the Engineer (which every
other feature needs), compounds (each later feature ships faster), and produces the "works while you sleep"
demo for free.

## Phase 0 — The durable, reliable build spine

*Make one agent build reliably, durably, and actually deploy.*
- **Build the durable worker.** Create `apps/api/src/worker.ts` on the declared `bullmq`/`REDIS_URL`
  scaffolding (or adopt Trigger.dev/Inngest). `POST /api/engineering` **enqueues**; the worker runs the
  build, streams progress to the Store, **parks on Approvals** and **resumes** — off the in-process `Map`.
  Runs survive a redeploy. *(FOUNDATION §4.)*
- **Prove + harden the deploy path.** Run `deploy/vercel.ts` against a live build; verify create-project →
  PR-preview → promote-to-prod → attach-domain. Fix the self-flagged endpoints. This is the money path.
- **Engineer reliability.** A real starter template for `create_site`; a prebuilt **e2b template** with the
  coding CLIs cached (speed); retries/timeouts in `run_coding_agent`; fix the model-id drift
  (`provision.ts` `claude-sonnet-4-5` → `claude-sonnet-5`).

## Phase 1 — Real (agentic) orchestration

*Lu commands a fleet — in the runtime, not the web glue.*
- **Lu → Engineer as a real tool.** Add an orchestrator tool (`run_agent` / `dispatch_to_engineering`) so
  Lu invokes the Engineer inside `apps/api`, deleting the hard-coded hand-off in `/api/lu/chat`.
- **Spawn + supervise sub-agents.** Use `Task.parentTaskId` for the tree + a `spawn_agent` tool; the worker
  supervises children. Enough for a small fleet of coding agents under Lu.
- **Agent-driven terminal.** Let an agent attach + drive an e2b pty (reuse the `/api/terminal` bridge with
  an agent on the write-end) — the "drive a Claude terminal" primitive.
- **Multi-model.** Add **xAI/Grok** to `packages/core/models.ts`; honor per-agent `Agent.models` so the
  fleet can mix models. Wire canvas **`Edge`s** (owns/reads/produces) to reflect who-orchestrates-whom.

## Phase 2 — The Studio/Dev preset + a persisted cockpit

*The workspace we actually dogfood in.*
- **Preset system.** A workspace-preset concept + selector in onboarding; provision a **Studio/Dev** preset
  (a coding-agent fleet), generalizing `onboarding/provision.ts` beyond Engineering-only. *(The legacy
  `lib/workspace/agent-presets.ts` is the old Lead-Answered set — replace it.)*
- **Persist the canvas.** Wire HTTP routes for `CanvasNode`/`Edge`/`Collection` (tables + Store methods
  already exist) + a web client; move Text/Draw/Markdown off local state and positions off localStorage.
  The dev cockpit survives a reload and a device change.

## Phase 3 — Dogfood

Use Lu (Studio/Dev preset) to build the next things — the other departments, the channels, the Business
onboarding. **The platform now builds itself**; the milestone is met and the flywheel starts.

## Cross-cutting (run in parallel)

- **Branding cleanup** (mechanical, do before the surface goes public): `components/sarah/*` →
  `components/lu/*`; `Organization.sarahName`/`sarahPersonaNotes` → `assistantName`/`personaNotes` (a
  migration); drop the dead telephony/vertical `Organization` fields + enums; rename `@leadanswered/*` →
  `@lu/*`; fix `LEAD_EMAIL_DOMAIN`. ~360 refs — a good agent-driven sweep.
- **Quick fixes now:** delete the stale `server.ts` route logs (`/lead`, `/webhooks/*` that don't exist);
  decide `GithubConnection` (wire for BYO later, or drop).

## Deferred — the Business / sellable milestone

Comes *after* dogfood, much of it built *by* Lu:
- **BYO** — OAuth the customer's GitHub/Vercel/Supabase + a **GitHub App** (replace the single PAT) + build
  the **Data/Supabase port**.
- **Channels** — phone (Twilio), email (Postmark), Slack.
- **The other departments** — Support (incl. the SMS door), Finance, Sales, Marketing, Design, Ops, Legal.
- **Managed-hosting tier**, **Supabase Realtime** (drop polling), **landing-content** rewrite.
