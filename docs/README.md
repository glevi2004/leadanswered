# Lu Computer — technical specs

The deep specs behind the canon. Start with the root [FOUNDATION.md](../FOUNDATION.md) (architecture, agents,
data model, hosting); these docs go one level deeper.

## Backend & agents
- **[agent-backend.md](./agent-backend.md)** — Lu orchestrating department agents: the runtime, the data model, context/memory, the CONTRACT, the model gateway, hosting.
- **[engineering-agent.md](./engineering-agent.md)** — the flagship Engineering agent: sandbox + Git + Vercel ports, the build tool-loop, the terminal.
- **[engineer-activation.md](./engineer-activation.md)** — wiring the Engineer into the product: async dispatch, read routes, the publish gate, invoke/watch/approve.

## Canvas
- **[canvas-engine.md](./canvas-engine.md)** — the pan/zoom canvas on `react-zoom-pan-pinch`: screen-space grid, iframe culling, camera.
- **[canvas-tools.md](./canvas-tools.md)** — the toolbar: real, persisted, agent-connectable elements (terminal · md · folder · site · text · draw).

## Onboarding & team
- **[onboarding.md](./onboarding.md)** — waitlist-gated self-serve onboarding: boot up your company, real DB provisioning.
- **[team-graph.md](./team-graph.md)** — Lu builds your org chart from a real conversation.

## Design
- **[design-system.md](./design-system.md)** — the material-zoning + pixel-accent design system, the component catalog, and the branding-debt register.
- **[design-depth.md](./design-depth.md)** — the depth/tactility CSS recipes (elevation, neumorphism, gloss) + the focused-site components.
- **[design-components.md](./design-components.md)** — the per-component rollout map, by tranche.
