# Durable agent-run worker

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md) §4 and
> [DEVELOPMENT.md](../DEVELOPMENT.md) Phase 0.

The Engineer's builds run for minutes-to-hours in a sandbox. They must survive a redeploy or crash and
resume — that's what makes "work while you sleep" real. We get that with **BullMQ + Redis**, and we take
the *durability semantics* (re-delivery, idempotent replay, wait-for-approval) from how Trigger.dev /
Inngest work, without adopting a whole engine.

## The model (what durable execution actually buys us)

Durable-execution engines persist a run's progress and, on restart, **replay while skipping already-done
steps** so side-effects aren't repeated. We get the essential subset three cheap ways:

1. **Re-delivery** — BullMQ only acks a job on success. A dead worker leaves the job on the queue; a new
   worker picks it up. (This is the whole "survives a crash" win.)
2. **Idempotent steps** — a re-run must not duplicate side-effects. Our steps derive "already done?" from
   **domain state we already persist** (a Site/Deployment/Approval row) rather than a separate step log —
   so no new tables, no migration.
3. **Wait-for-approval as a run boundary** — the build run naturally **ends** at `request_publish` (it
   stages an `Approval` and stops). Publishing is a *separate* durable action (`confirmPublish`), triggered
   when the owner resolves the approval. So "pause for hours, then resume" needs no mid-run suspend — it's
   two runs with an `Approval` between them.

## The implementation

- **`queue.ts`** — the `engineering` BullMQ queue. `enqueueEngineering({orgId, taskId, message})` adds a job
  with **`jobId = taskId`** (a task is never double-dispatched), `attempts: 3` + exponential backoff, and
  bounded retention. `REDIS_URL` is parsed into connection options (handles `rediss://` + auth) with no
  direct `ioredis` import.
- **`worker.ts`** — `startEngineeringWorker(store)` runs a `Worker` that calls `runEngineering` per job.
  `lockDuration: 300_000` (5 min): BullMQ renews the lock while the process lives, so only a **dead** worker
  lets the job stall and be re-picked. On terminal failure (retries exhausted) the task → `failed`. Runs
  **in-process** beside the API today (started in `server.ts`; zero extra infra on the one Railway service)
  and can be split to `node dist/worker.js` when we scale it out — both share the queue, both durable.
- **`routes/agents.ts`** — `POST /api/engineering` **enqueues** when Redis is set; **falls back** to an
  in-process run when it isn't (local dev). Same 202 `{taskId}` contract.
- **Idempotency** — `create_site` reuses an existing Site for the org+slug instead of creating a duplicate
  repo. This is the one step whose re-run would be destructive; the rest converge (the build branch is
  `checkout -B lu/build`; `open_preview` reuses the Vercel project; `confirmPublish` reads existing rows).

## Deliberately NOT built (yet)

- **Step memoization for `run_coding_agent`.** On a mid-build crash, re-delivery **re-runs the coding
  agent** against the existing repo (it converges, but redoes work). The upgrade: persist a per-step
  completion marker (keyed by task + tool + input hash) and skip completed expensive steps on replay —
  event-sourced replay, the Trigger.dev/Inngest core. Add it when re-run cost bites; the current idempotency
  keeps re-delivery *correct* meanwhile.
- **A general workflow DSL / distributed scheduler.** Our "workflow" is the Engineer's fixed tool pipeline;
  we don't need Temporal-style orchestration.

## Operational notes

- **Config:** set `REDIS_URL` on Railway (Railway Redis or Upstash). `ENGINEERING_CONCURRENCY` (default 3)
  caps parallel builds per worker. Without `REDIS_URL` everything still works via the in-process fallback.
- **Gotchas:** keep `lockDuration` ≥ the longest plausible un-checkpointed stretch; `attempts` retries
  transient infra errors but a deterministic bug will burn all attempts then mark `failed`; the `jobId`
  dedupe window is the completed-job retention (a day) — re-dispatching the *same* task within it is a
  no-op, which is what we want.
