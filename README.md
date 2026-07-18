# Lu Computer

**A workspace where AI agents do real work.** Not a dashboard, not an editor — a *computer* for agents:
a canvas, a cloud terminal, files, and real channels (a phone, an inbox, Slack). You command; the agents
build and run. The **Engineering** agent already writes real code in a real sandbox and ships a real site
to a real URL.

It has three things: **a body** (real channels — it can act on the world), **a cloud that never sleeps**
(durable runs that work overnight), and **a composable mind** (multi-model agents that orchestrate each
other). Boot it from a **preset** — run a business, a dev studio, your own thing.

> *Cursor made you a faster developer. Lu makes the computer the developer.*

## Start here — the docs cascade from one root

Everything derives from the paper; each doc goes one level more concrete than its parent:

1. **[paper.md](./paper.md)** — *the theory.* The research paper: the target architecture (control plane,
   ephemeral runtime, memory + secrets, multi-model registry), its rationale, and its limits.
2. **[MANIFESTO.md](./MANIFESTO.md)** — *the why*, in one page. The paper's argument as a product thesis.
3. **[FOUNDATION.md](./FOUNDATION.md)** — *the what.* The system spec of record: shape, stack,
   orchestration, runtime, data, hosting.
4. **[docs/harness-spec.md](./docs/harness-spec.md)** — *the how.* Paper → substrates (e2b, BullMQ/Redis,
   pgvector, GitHub App…), with checked/unchecked build tasks, phases, and the drift assessment.
5. **[docs/](./docs/)** — *the deep specs.* Start with **[building-agents.md](./docs/building-agents.md)**
   (how we build agents) + **[canvas.md](./docs/canvas.md)** (the product surface).
6. **[DEVELOPMENT.md](./DEVELOPMENT.md)** — *the where-are-we.* The live build map & status (✅/🟡/⬜),
   grounded in the code.

Alongside: **[BUSINESS.md](./BUSINESS.md)** (positioning, pricing, unit economics) ·
**[ROADMAP.md](./ROADMAP.md)** (what's shipped, what's next, in order).

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
