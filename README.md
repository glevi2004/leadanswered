# Lu Computer

**A workspace where AI agents do real work.** Not a dashboard, not an editor — a *computer* for agents:
a canvas, a cloud terminal, files, and real channels (a phone, an inbox, Slack). You command; the agents
build and run. The **Engineering** agent already writes real code in a real sandbox and ships a real site
to a real URL.

It has three things: **a body** (real channels — it can act on the world), **a cloud that never sleeps**
(durable runs that work overnight), and **a composable mind** (multi-model agents that orchestrate each
other). Boot it from a **preset** — run a business, a dev studio, your own thing.

> *Cursor made you a faster developer. Lu makes the computer the developer.*

## Start here

- **[MANIFESTO.md](./MANIFESTO.md)** — what Lu Computer is, and why.
- **[FOUNDATION.md](./FOUNDATION.md)** — how it's built: the shape, the stack, orchestration, runtime,
  data, hosting.
- **[BUSINESS.md](./BUSINESS.md)** — how it makes money: positioning, pricing, unit economics.
- **[ROADMAP.md](./ROADMAP.md)** — what's shipped and what's next.
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — the current build plan, grounded in the code.
- **[docs/](./docs/)** — the technical specs.

## The repo

Monorepo. The product lives in `platform/` (pnpm workspace):

| Path | What |
|---|---|
| `platform/apps/web` | Next.js app — onboarding, the canvas, the dock, department surfaces → **Vercel** |
| `platform/apps/api` | Express agent runtime + durable worker + the cloud-terminal websocket → **Railway** |
| `platform/packages/db` | Prisma schema + client → **Supabase Postgres** |
| `platform/packages/core` | The multi-provider model gateway |
| `platform/landing-page` | The public marketing site (Astro) → Vercel |

```bash
cd platform && pnpm install
# apps/web: pnpm --filter @leadanswered/web dev
# apps/api: pnpm --filter <api> dev   (needs DATABASE_URL + provider keys)
```
