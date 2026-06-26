# worker

The always-on background worker (SCOPE §3.1C) — the third deployable alongside `api` and `web`. Processes anything that must not block a Twilio webhook: delayed, retried, or scheduled jobs.

## What it runs (today)

- **`nudge`** — a single gentle follow-up to a lead who went quiet (SCOPE §5). The `api` enqueues a delayed nudge after each turn that didn't book; the worker fires it after the delay and sends one message only if the lead still hasn't replied (and isn't booked/disqualified). Job logic: `apps/api/src/jobs/nudge.ts` (unit-tested); processor: `apps/api/src/worker.ts`.

Future: escalation retries, appointment reminders, and the outbound growth engine (email/call cadence — the biggest reason the worker exists).

## How it shares code with `api`

The worker is a thin runner: `src/index.ts` loads env and calls `runWorker()` exported by `@leadanswered/api/worker`. That reuses the **same** Store, SMS senders, and job logic as the api, so behaviour matches the in-process tests exactly — no duplication.

> Note: the **escalation relay** (contractor texts back → homeowner gets the answer) is handled synchronously in the `api` webhook, not here — it's event-driven, not timer-driven. The worker is only for genuinely delayed/scheduled work.

## Run it

Requires **Redis** (`REDIS_URL`) plus the same `DATABASE_URL` + Twilio creds as the api.

1. Provision Redis (e.g. Upstash, Railway, or local `redis-server`).
2. `cp .env.example .env` and fill it in.
3. From `platform/`: `pnpm --filter @leadanswered/worker dev`

Without `REDIS_URL`, the api's `enqueueNudge` is a no-op (nudges are simply disabled) — dev and tests need no Redis.
