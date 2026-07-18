# Lu Computer

**A workspace where AI agents do real work.** You talk to Lu; she plans, builds in real sandboxes, ships
to your own GitHub/Vercel/Supabase, verifies empirically, and asks you only at the gates that matter
(plan · migration · publish).

> *Cursor made you a faster developer. Lu makes the computer the developer.*

## The docs — seven files, one root

1. **[paper.md](./paper.md)** — *the theory.* The target architecture and its rationale.
2. **[COMPANY.md](./COMPANY.md)** — *why, what, and money.* The product thesis, the stack, pricing.
3. **[docs/system.md](./docs/system.md)** — *the machine.* Doctrine, agents, tools, ports, gates, BYO,
   durability, memory, the add-an-agent recipe.
4. **[docs/product.md](./docs/product.md)** — *the experience.* The chat + cards, the dock, the canvas,
   onboarding, the honesty rules.
5. **[docs/design-system.md](./docs/design-system.md)** — *the look.* Tokens, materials, components.
6. **[DEVELOPMENT.md](./DEVELOPMENT.md)** — *the TODO.* One NOW task with exact outcomes; NEXT ≤ 5; LATER.

If two docs explain the same thing, one of them is wrong.

## The repo

The product lives in `platform/` (pnpm workspace):

| Path | What |
|---|---|
| `platform/apps/web` | Next.js — onboarding, canvas, dock → Vercel (app.lu.computer) |
| `platform/apps/api` | Express agent runtime + durable worker + terminal ws → Railway |
| `platform/packages/db` | Prisma schema + client → Supabase Postgres |
| `platform/packages/core` | The multi-provider model gateway |
| `platform/landing-page` | Marketing site (Astro) → Vercel (lu.computer) |

```bash
cd platform && pnpm install
# web: pnpm --filter @leadanswered/web dev
# api: pnpm --filter @leadanswered/api dev   (needs DATABASE_URL + provider keys)
```

Pushes to `main` auto-deploy both Railway (api) and Vercel (web + landing).
