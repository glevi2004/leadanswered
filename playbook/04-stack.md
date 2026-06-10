# Stack

We build the product **custom, in TypeScript end-to-end** — no GoHighLevel, no no-code middleware. The detailed system spec lives in [`platform/SCOPE.md`](../platform/SCOPE.md); this is the business-altitude summary.

## Why custom (not a no-code platform)

The core of the product — a sub-60-second AI SMS responder ("Sarah") that qualifies leads with deterministic, auditable logic and provisions a dedicated number per contractor — is exactly the part a generic agency platform does worst. Owning the stack gives us:

- Full control of the conversation engine and the **AI-extracts / code-decides** qualification logic (no black-box automation builder to fight).
- A real product surface (onboarding + contractor dashboard) we own end-to-end, not a white-labeled shell.
- Per-contractor dedicated numbers and the toll-free verification lifecycle handled directly via the Twilio API.
- No per-seat platform tax that scales badly as we add clients.

## Core stack

| Layer | Tool | Role |
|---|---|---|
| Language | **TypeScript** | One language across `web`, `api`, `worker` |
| Frontend | **Next.js** on **Vercel** | Onboarding UI + contractor dashboard |
| Backend API / webhooks | **Express** (Node) on Railway/Render | Twilio webhooks + the Sarah conversation engine (always-on) |
| Background / queue / cron | **Node + BullMQ + Redis** on Railway/Render | Number provisioning, verification polling, the outbound engine |
| ORM / DB | **Prisma** + **Postgres** | One Postgres for all data |
| SMS | **Twilio** (Node SDK) | Delivery + per-contractor dedicated numbers |
| AI | **Anthropic Claude API** (Node SDK) | The "Sarah" conversation engine |
| Testing | **Vitest**, React Testing Library, **Playwright** | Unit / integration / E2E |

See `platform/SCOPE.md` §3 for the deployment boundaries — three separate deployables (`web` / `api` / `worker`) — and why they must not be collapsed into one app.

## Build philosophy

Build one phase at a time, in order (SCOPE.md §6 / §12): Echo Bot (Twilio↔Claude roundtrip) → Sarah MVP → email-parse intake → onboarding UI → contractor dashboard → hardening. Each phase should be usable/demoable before starting the next. Don't pull future-phase features forward.
