# Lu Computer — technical specs

The deep specs behind the canon. Start with the root [FOUNDATION.md](../FOUNDATION.md) (architecture, agents,
data model, hosting); these docs go one level deeper.

## The canvas (start here)
- **[canvas.md](./canvas.md)** — **the unified model**: Lu + departments (each an agent's app —
  Home/console/workplace) + resources (terminal · note · file · folder · site) joined by edges-as-grants;
  the backend, the publish flow, the dock, the plane. The one source of truth for the product surface.

## Backend & agents
- **[agent-backend.md](./agent-backend.md)** — Lu orchestrating department agents: the runtime, the data model, context/memory, the CONTRACT, the model gateway, hosting.
- **[engineering-agent.md](./engineering-agent.md)** — the flagship Engineering agent: sandbox + Git + Vercel ports, the build tool-loop, the terminal.
- **[engineer-activation.md](./engineer-activation.md)** — wiring the Engineer into the product: async dispatch, read routes, the publish gate, invoke/watch/approve.
- **[durable-worker.md](./durable-worker.md)** — the durable BullMQ agent-run worker: crash-safe re-delivery, supervise-in-sandbox, fail-clean.
- **[byo-connect.md](./byo-connect.md)** — BYO connect: each org's own GitHub / Vercel / Supabase, org-scoped ports, the dispatch gate.

## Onboarding & team
- **[onboarding.md](./onboarding.md)** — waitlist-gated self-serve onboarding: boot up your company, real DB provisioning.
- **[team-graph.md](./team-graph.md)** — Lu builds your org chart from a real conversation.

## Design
- **[design-system.md](./design-system.md)** — the material-zoning + pixel-accent design system, the component catalog, and the branding-debt register.
- **[design-depth.md](./design-depth.md)** — the depth/tactility CSS recipes (elevation, neumorphism, gloss) + the focused-site components.
- **[design-components.md](./design-components.md)** — the per-component rollout map, by tranche.
