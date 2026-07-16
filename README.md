# Lu Computer

**An AI operating system for your business.** Not another dashboard — a *computer* where AI agents do the
work and you watch, steer, and approve. Lu orchestrates department agents on a canvas that is your
company's home: the **Engineering** agent builds and ships your software and sites in a real sandbox to a
real URL; Support answers customers; Finance chases the money. You ask; the company does.

## Start here

- **[MANIFESTO.md](./MANIFESTO.md)** — what Lu Computer is, and why.
- **[FOUNDATION.md](./FOUNDATION.md)** — how it's built: architecture, the agents, the data model, hosting.
- **[ROADMAP.md](./ROADMAP.md)** — what's shipped and what's next.
- **[docs/](./docs/)** — the technical specs (agent backend, the Engineer, the canvas, onboarding, design).

## The repo

Monorepo. The product lives in `platform/` (pnpm workspace):

| Path | What |
|---|---|
| `platform/apps/web` | Next.js app — onboarding, the canvas, the dock, department surfaces → **Vercel** |
| `platform/apps/api` | Express agent runtime + the cloud-terminal websocket → **Railway** |
| `platform/packages/db` | Prisma schema + client → **Supabase Postgres** |
| `platform/packages/core` | The multi-provider model gateway |
| `platform/landing-page` | The public marketing site (Astro) → Vercel |

```bash
cd platform && pnpm install   # workspace deps
# apps/web: pnpm --filter @leadanswered/web dev
# apps/api: pnpm --filter <api> dev   (needs DATABASE_URL + provider keys)
```
