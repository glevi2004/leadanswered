# api

Express service for Lead Answered — the always-on backend (SCOPE §3.1). **Phase 1: the "Sarah" MVP** (SCOPE §6).

## What it does

- `POST /lead` — manual lead trigger (`{ name, phone, project? }`). Creates the lead + conversation and fires Sarah's opening SMS within seconds.
- `POST /webhooks/twilio/sms` — inbound homeowner SMS. Runs the Sarah conversation engine: greet → qualify → propose slots → confirm → book, notifying the contractor on booking.

The decision logic (qualification, service-area, slot proposal, prompt assembly, notification routing) lives in `@leadanswered/core` and is pure/unit-tested. This service wires it to Claude, Twilio, and the database.

## Run it — demo mode (no database, no Twilio)

Just an Anthropic key. Sarah's messages and contractor notifications print to the console; data lives in memory.

1. `cp .env.example .env` and set `ANTHROPIC_API_KEY`.
2. From `platform/`: `pnpm install`
3. `pnpm dev` (boots with the seeded test contractor "Apex Roofing").
4. Drive a conversation locally with curl:

```bash
# create a lead → Sarah texts the homeowner (logged to the console)
curl -s -X POST http://localhost:3000/lead -H 'content-type: application/json' \
  -d '{"name":"Jane Homeowner","phone":"+15551234567","project":"roof leak"}'

# simulate the homeowner texting back (To = contractor's number, From = the lead)
curl -s -X POST http://localhost:3000/webhooks/twilio/sms \
  --data-urlencode "To=+18335550100" --data-urlencode "From=+15551234567" \
  --data-urlencode "Body=I'm at 75093 in Plano and it's my house"
```

## Run it — with Postgres + Twilio (production-shaped)

1. Set `DATABASE_URL` (Postgres) and `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` in `.env`.
2. `pnpm --filter @leadanswered/db migrate` — create the tables.
3. `pnpm --filter @leadanswered/api seed` — insert the test contractor + recipients.
4. `pnpm dev`, expose with `ngrok http 3000`, and point the Twilio number's "A message comes in" webhook at `/webhooks/twilio/sms`.

## Test

```
pnpm --filter @leadanswered/api test    # includes the end-to-end booking guardrail
```

## Notes

- Model defaults to `claude-haiku-4-5`; override with `CLAUDE_MODEL`.
- **AI extracts, CODE decides** (SCOPE §5.1): Claude only extracts fields and phrases replies; every qualify/disqualify/book decision is deterministic code.
- Sarah never quotes pricing — she redirects to the free on-site estimate (enforced in the system prompt).
