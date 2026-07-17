# Lu Computer — technical specs

The deep specs behind the canon. Start at the root: [FOUNDATION.md](../FOUNDATION.md) (the architecture, with
diagrams) + [DEVELOPMENT.md](../DEVELOPMENT.md) (the live ✅/🟡/⬜ build status). These go one level deeper.

## The product surface
- **[canvas.md](./canvas.md)** — the unified model: Lu + departments-as-apps + resources joined by
  **edges-as-grants**, the database console, the publish flow, the dock. The one source of truth for the surface.

## Building & running agents
- **[building-agents.md](./building-agents.md)** — **the handbook**: the doctrine, the agent loop, tools &
  ports, the Engineer as the reference implementation, orchestration, durability & approvals, and the
  repeatable **recipe for adding a new agent**. Start here to understand how anything gets built.
- **[agent-backend.md](./agent-backend.md)** — the backend **reference**: the data model, context/memory + the
  CONTRACT, the model gateway, hosting/BYO economics, onboarding wiring, the other departments.
- **[byo-connect.md](./byo-connect.md)** — each org connects its own GitHub / Vercel / Supabase (token-paste
  today; OAuth is Phase 2); org-scoped ports; the dispatch gate.
- **[planning.md](./planning.md)** *(design — not built)* — the **plan gate**: goal → plan → owner
  approves → dispatch, task verification ("done" = acceptance met), and the **actionable roadmap** (every dock
  "next" is a Lu action). Defines the seams into the broader agent-workflow.

## Onboarding
- **[onboarding.md](./onboarding.md)** — waitlist-gated self-serve onboarding: boot up your company, real DB
  provisioning, and the team step.

## Design
- **[design-system.md](./design-system.md)** — the material-zoning + pixel-accent design system: the locked
  decisions, the component catalog, the depth/material recipes, the component rollout, and the **canonical
  branding-debt register**.
