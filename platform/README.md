# Platform

The product itself — the application we're building, its build spec, and the marketing site.

**Source of truth for the build:** [`SCOPE.md`](./SCOPE.md). Read it before writing app code; build in the phases it defines, one at a time.

## Layout

```
platform/
├── SCOPE.md            # the system specification — the build spec, source of truth
├── apps/
│   ├── web/            # Next.js — onboarding UI + contractor dashboard (Vercel)              [Phase 3+]
│   ├── api/            # Express — Twilio webhooks + the "Sarah" tool-using agent (Railway/Render)  [built ✅]
│   └── worker/         # Node + BullMQ/Redis — quiet-lead nudge + async jobs (Railway/Render)        [built ✅]
├── packages/
│   ├── db/             # Prisma schema + client + Supabase
│   └── core/           # shared types, geo + qualification logic, prompts, notifications (pure)
└── landing-page/       # leadanswered.com marketing site (static, already wired to Vercel)
```

The three-deployable split (`web` / `api` / `worker`) is deliberate — see `SCOPE.md` §3.1. Do not collapse them into one app, and keep all long-running / queued / scheduled work out of `web`.

> Status: the **tool-using "Sarah" agent** is built — `apps/api` (the agent + tools, Vercel AI SDK, provider-agnostic), `apps/worker` (BullMQ nudge), `packages/core` (pure domain logic), `packages/db` (Prisma on Supabase). See `SCOPE.md` → "Architecture update (v2)". `apps/web` arrives with its phase.

## Build order

Per `SCOPE.md` §6 / §12: **Echo Bot → Sarah MVP → email-parse intake → onboarding UI → dashboard → hardening.** Each phase should be usable/demoable before the next. Don't pull future-phase features forward.

## Landing page

`landing-page/` is the live marketing site (already wired to Vercel — see its `.vercel/`). It's independent of the app build.

- Deploy: run `vercel` from inside `landing-page/`
- Point `leadanswered.com` at the Vercel deployment
