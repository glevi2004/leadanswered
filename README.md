# Lu Computer

**Lu Computer is a real computer for AI agents** — screen, shell, phone, and inbox — that you command and
they operate. Not another dashboard, not another editor: an operating system where a fleet of agents does
real work on real infrastructure. Boot it from a **preset** — run a business, a dev studio, your own thing
— then watch, steer, and approve. The **Engineering** agent already builds and ships real software in a
real sandbox to a real URL. *Cursor put one agent in your editor; Lu puts a company of them on your computer.*

## Start here

- **[MANIFESTO.md](./MANIFESTO.md)** — what Lu Computer is, and why.
- **[FOUNDATION.md](./FOUNDATION.md)** — how it's built: architecture, the agents, the data model, hosting.
- **[BUSINESS.md](./BUSINESS.md)** — how it makes money: positioning, pricing, segments.
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
