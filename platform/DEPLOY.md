# Deployment

Production runs on **Railway** (api + worker + Redis) and **Vercel** (web). Postgres is **Supabase**.

| Service | Where | URL |
|---|---|---|
| api (Express webhooks + Sarah engine) | Railway · service `leadanswered` | https://leadanswered-production.up.railway.app |
| worker (BullMQ nudge queue) | Railway · service `worker` | (no public URL) |
| Redis | Railway · `Redis` | internal `${{Redis.REDIS_URL}}` |
| web (Next.js) | Vercel · project `leadanswered-web` | https://app.leadanswered.com |
| landing page | Vercel (separate) | https://leadanswered.com |
| Postgres | Supabase `yesikogbtdmkzsdvwsht` | session pooler `:5432` |

## How it builds

- **Railway** reads `railway.json` (repo root) → builds `platform/Dockerfile` with the **repo root** as context.
  One image serves both api and worker; `$SERVICE_ROLE` picks which (`worker` → the BullMQ worker, else api + `prisma migrate deploy` on boot).
- **Vercel** builds `platform/apps/web` (Root Directory), `installCommand: npm install` (see gotchas), framework Next.js.

## Redeploy

- **api / worker:** push to `main` → Railway auto-deploys. Or `railway redeploy`.
- **web:** `cd platform/apps/web && vercel deploy --prod` (or connect the repo in Vercel for push-deploys).

## Env vars (set on the platforms, not in git)

- **Railway api:** `DATABASE_URL` (resolved session-pooler, password inline), `ANTHROPIC_API_KEY`, `TWILIO_*`, `REDIS_URL=${{Redis.REDIS_URL}}`, `POSTMARK_*`, `LEAD_EMAIL_DOMAIN`, `LANGFUSE_*`. (`AI_MODEL` optional — defaults to `claude-haiku-4-5`. `ALLOW_INBOUND_LEADS=true` to let cold texts start a conversation.)
- **Railway worker:** `SERVICE_ROLE=worker`, `DATABASE_URL`, `TWILIO_*`, `REDIS_URL`, `LANGFUSE_*`, `ANTHROPIC_API_KEY` (the proactive layer — quiet-lead nudge + escalation follow-ups — now runs agent turns in the worker, SCOPE §5.3; without the key those turns silently skip), plus `POSTMARK_SERVER_TOKEN` + `LEAD_EMAIL_DOMAIN` if it should email quiet-lead alerts.
- **Vercel web:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `NEXT_PUBLIC_SITE_URL=https://app.leadanswered.com`.

## Webhooks (point at the Railway api)

- Twilio number SMS webhook → `/webhooks/twilio/sms`
- Twilio number **Voice** webhook ("A call comes in", HTTP POST) → `/webhooks/twilio/voice` — missed-call text-back (SCOPE §9.7). Each organization also enables **conditional call forwarding** (no-answer + busy) on their real phone → their Twilio number, so unanswered calls forward here.
- Postmark inbound (server `InboundHookUrl`) → `/webhooks/email/postmark/<POSTMARK_INBOUND_SECRET>`
- Supabase Auth → Site URL + Redirect URLs = `https://app.leadanswered.com`

## DNS (Hostinger)

- `leadanswered.com` → landing page (A `216.198.79.1`)
- `app.leadanswered.com` → web app (A `app` → `216.198.79.1`; **not** Vercel CLI's stale `76.76.21.21`)

## Cutover runbook: booking-integrity migration (one-time)

The `appointment_integrity` migration adds constraints that **cannot** be applied while
duplicate/overlapping active appointments exist, so wipe lead data first:

1. **Back up:** `pg_dump "$DATABASE_URL" > backup.sql`.
2. **Wipe lead-scoped data** (preserves organizations + config + recipients):
   `cd platform/apps/api && pnpm exec tsx scripts/wipe-lead-data.ts` (dry run) → re-run with `--yes`.
3. **Migrate:** `pnpm --filter @leadanswered/db migrate:deploy` (adds `btree_gist` + the EXCLUDE/partial-unique constraints to the now-clean table).
4. **Deploy the app** (api + worker) — the constraint-handling code and the constraints must ship together.
5. **Prove it:** run the Tier-B suite against staging (see `TESTING.md` §5b), then live-smoke: book once, rapid double-text → exactly one appointment.

Caveats:
- **`btree_gist`** must be creatable (Supabase grants this). If ever blocked, the partial-unique index is the fallback (exact-start only; loses overlap protection).
- **Advisory/transaction safety needs the session pooler (5432)** — do not move booking/lock code to the 6543 transaction pooler without re-validation.

## Gotchas hit (so we don't repeat them)

- **Don't** set `NODE_ENV=production` before `pnpm install` in the Dockerfile — it drops `tsx` (a devDep) and nothing starts.
- `prisma generate` (a `postinstall`) loads `prisma.config.ts` which needs `DATABASE_URL` — the Dockerfile passes a **placeholder** for the install step only (generate doesn't connect; Railway injects the real one at runtime).
- **Vercel uses `npm`, not pnpm** — pnpm hit `ERR_INVALID_THIS` (undici bug) in Vercel's build image. `engines.node = 22.x`.
- Vercel CLI suggests A `76.76.21.21`, which no longer routes — use `216.198.79.1` (or CNAME `cname.vercel-dns.com`).
