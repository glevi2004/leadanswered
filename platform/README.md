# Platform

The product itself — the application we're building, its build spec, and the marketing site.

**Source of truth for the build:** [`SCOPE.md`](./SCOPE.md). Read it before writing app code; build in the phases it defines, one at a time.

## Layout

```
platform/
├── SCOPE.md            # the system specification — the build spec, source of truth
├── apps/
│   ├── web/            # Next.js — onboarding UI + contractor dashboard (Vercel)              [Phase 3+]
│   ├── api/            # Express — Twilio webhooks + the "Sarah" engine (Railway/Render)       [Phase 0–1 ✅]
│   └── worker/         # Node + BullMQ/Redis — provisioning, cron, outbound engine             [Phase 3+]
├── packages/
│   ├── db/             # Prisma schema + client
│   └── core/           # shared types, geo + qualification logic, system-prompt assembly
└── landing-page/       # leadanswered.com marketing site (static, already wired to Vercel)
```

The three-deployable split (`web` / `api` / `worker`) is deliberate — see `SCOPE.md` §3.1. Do not collapse them into one app, and keep all long-running / queued / scheduled work out of `web`.

> Status: Phases 0–1 are built — `apps/api` (the "Sarah" engine), `packages/core` (pure domain logic), and `packages/db` (Prisma schema). `apps/web` and `apps/worker` arrive with their phases.

## Build order

Per `SCOPE.md` §6 / §12: **Echo Bot → Sarah MVP → email-parse intake → onboarding UI → dashboard → hardening.** Each phase should be usable/demoable before the next. Don't pull future-phase features forward.

## Landing page

`landing-page/` is the live marketing site (already wired to Vercel — see its `.vercel/`). It's independent of the app build.

- Deploy: run `vercel` from inside `landing-page/`
- Point `leadanswered.com` at the Vercel deployment
