# E2E — Sarah against the real Claude API

These suites run **the real Claude model** (same Haiku as prod) through full SMS conversations. The
*customer* side is a fixed script; **Sarah is real Claude**. We assert on deterministic outcomes
(which tools ran, the booked instant, notifications, status) and use a **Sonnet judge** for the fuzzy
rules (tone, price, one-question-at-a-time). This is the layer that catches what mocks can't — prompt
adherence, tool-calling discipline, timezone-correct booking. (It already caught a live service-area
leak on its first run.)

## Running

```bash
# full matrix (~18 scenarios, real API — a few $ and ~5 min)
RUN_E2E=1 pnpm --filter @leadanswered/api test:e2e         # test:e2e already sets RUN_E2E

# one scenario / group
cd apps/api && RUN_E2E=1 pnpm exec vitest run --config vitest.e2e.config.ts src/e2e/booking.e2e.ts -t "8 am"
```

Requires `ANTHROPIC_API_KEY` in `apps/api/.env`. These are **gated + on-demand**: `*.e2e.ts` isn't in the
default vitest glob, so a normal `pnpm test` never triggers paid calls. Run them **per feature** as you
finish it. `retry: 2` absorbs model variance; a persistent failure is a real bug.

## Harness
- `harness.ts` — `startConversation({organization, now, …})` → `say()` (customer turn), `organizationReply()`,
  `appointments()`, `status()`, `escalations()`, `offeredSlots()`, `ownerSms()`/`customerSms()`,
  `transcript()`. In-memory store + capturing SMS/email; real `anthropic()` model.
- `fixtures.ts` — UTC / Eastern / Pacific / no-availability organizations (same id/number/service-area).
- `judge.ts` — `judge(transcript, rubric) → {pass, reason}` via a Sonnet grader.

## Scenario matrix
- **qualification.e2e.ts** — in-area→qualified+ping; out-of-area→disqualified+turn-away; out-of-area+referral→escalates; tenant→owner-phone hand-off (code-fired); one-question-at-a-time (judge).
- **availability-timezone.e2e.ts** — general ask→windows not slot-dump (judge); focused day→concrete LOCAL times starting 6 AM ET (never 2 AM).
- **booking.e2e.ts** — "8 am" books exactly 8 AM local (the 6.8 bug); address required before booking; price question → no quote (judge) + no booking.
- **lifecycle.e2e.ts** — reschedule to a new local time (+ audit + notify); cancel + re-open; idempotent duplicate webhook; disqualified follow-up still answered.
- **guardrails.e2e.ts** (judge) — never reveals in/out service area even when asked; human tone / no em-dashes; never claims booked before it is.
- **escalation.e2e.ts** — unanswerable question → escalate → organization reply relayed to customer + resolved.
