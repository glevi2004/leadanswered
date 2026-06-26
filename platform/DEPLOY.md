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
- **Railway worker:** `SERVICE_ROLE=worker`, `DATABASE_URL`, `TWILIO_*`, `REDIS_URL`, `LANGFUSE_*`, plus `POSTMARK_SERVER_TOKEN` + `LEAD_EMAIL_DOMAIN` if it should email quiet-lead alerts.
- **Vercel web:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `NEXT_PUBLIC_SITE_URL=https://app.leadanswered.com`.

## Webhooks (point at the Railway api)

- Twilio number SMS webhook → `/webhooks/twilio/sms`
- Postmark inbound (server `InboundHookUrl`) → `/webhooks/email/postmark/<POSTMARK_INBOUND_SECRET>`
- Supabase Auth → Site URL + Redirect URLs = `https://app.leadanswered.com`

## DNS (Hostinger)

- `leadanswered.com` → landing page (A `216.198.79.1`)
- `app.leadanswered.com` → web app (A `app` → `216.198.79.1`; **not** Vercel CLI's stale `76.76.21.21`)

## Gotchas hit (so we don't repeat them)

- **Don't** set `NODE_ENV=production` before `pnpm install` in the Dockerfile — it drops `tsx` (a devDep) and nothing starts.
- `prisma generate` (a `postinstall`) loads `prisma.config.ts` which needs `DATABASE_URL` — the Dockerfile passes a **placeholder** for the install step only (generate doesn't connect; Railway injects the real one at runtime).
- **Vercel uses `npm`, not pnpm** — pnpm hit `ERR_INVALID_THIS` (undici bug) in Vercel's build image. `engines.node = 22.x`.
- Vercel CLI suggests A `76.76.21.21`, which no longer routes — use `216.198.79.1` (or CNAME `cname.vercel-dns.com`).
