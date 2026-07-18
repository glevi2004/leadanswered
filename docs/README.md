# Lu Computer — technical specs

The deep specs behind the canon. The whole repo cascades from one root:
**[paper.md](../paper.md)** (the theory) → [MANIFESTO.md](../MANIFESTO.md) (why) →
[FOUNDATION.md](../FOUNDATION.md) (what) → **[harness-spec.md](./harness-spec.md)** (how, with checkboxes) →
these deep specs → [DEVELOPMENT.md](../DEVELOPMENT.md) (live ✅/🟡/⬜ status). Each doc here owns exactly one
thing; if two docs explain it, one of them is wrong.

## Building & running agents
- **[workflow.md](./workflow.md)** — **the flow layer** (the paper's Stateful Mediator): the event journal,
  Lu's situational block, report-back into the thread, chat states, the canvas grant contract, and the
  UI honesty rule (functional or Coming soon).
- **[harness-spec.md](./harness-spec.md)** — the **production implementation spec**: paper → substrates
  (e2b, BullMQ/Redis, pgvector, GitHub App…), checked/unchecked build tasks, the phase order (P0→P4), and
  the dated drift assessment.
- **[building-agents.md](./building-agents.md)** — **the handbook**: the doctrine, the agent loop, tools &
  ports, the Engineer as reference implementation, **the plan gate**, durability & approvals, skills, and
  the repeatable recipe for adding a new agent. Start here to understand how anything gets built.
- **[agent-backend.md](./agent-backend.md)** — the backend **reference**: the tables, the agent CONTRACT,
  the model gateway, memory (live vs target), hosting surfaces.
- **[byo-connect.md](./byo-connect.md)** — each org connects its own GitHub / Vercel / Supabase (token-paste
  today; OAuth is Phase 2); org-scoped ports; the dispatch gate.

## The product surface
- **[canvas.md](./canvas.md)** — the unified model: Lu + departments-as-apps + resources joined by
  **edges-as-grants**, the database console, the publish flow, the dock.

## Onboarding
- **[onboarding.md](./onboarding.md)** — two phases (built 2026-07-17): static sign-up, then Lu onboards you
  in-workspace (decision cards → Business Plan → activate departments) via the skill system.

## Design
- **[design-system.md](./design-system.md)** — the material-zoning + pixel-accent design system: the locked
  decisions, the component catalog, the rollout, and the **canonical branding-debt register**.
