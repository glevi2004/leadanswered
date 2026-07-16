# Lu Computer — onboarding (boot up your company)

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md).

Onboarding is a **waitlist-gated, self-serve** flow: the owner meets Lu, describes their business, and their
**company boots** — a real DB Organization is provisioned with the **Engineering** department active (its agent
online), the rest of the company as the roadmap, and the owner lands on the canvas. Lu actually **works** here
(real conversation → real DB → handoff), not a cookie mock. Companions: [agent-backend.md](./agent-backend.md),
[engineering-agent.md](./engineering-agent.md).

## 1. The flow

| # | Step | What Lu does |
|---|---|---|
| 0 | **Welcome** | Meet Lu. "Let's set up your company." |
| 1 | **What do you do** | Free-text business description (trade-agnostic). |
| 2 | **Links → learn your brand** | Paste site/socials → the scan. Framed: "so your agents build in your voice." Feeds the Engineering agent's context. |
| 3 | **Your handle** | `you.lu.computer` — where Engineering ships your sites. |
| 4 | **Meet your Engineer** | The one live agent. A short beat: sets up its `contract`, tees the first real action ("what should we build first?"). |
| 5 | **Team** (optional) | The real Lu team-graph conversation ([team-graph.md](./team-graph.md)). |
| 6 | **Building** | The real provisioning screen — the company boots. |
| 7 | **Into the app** | Land on the canvas — your company, Engineering ready to build. |

## 2. UI — minimal, editorial

Personality lives in **motion**, not an avatar (no mascot). The surface is the minimal, editorial onboarding
(original cards, subtle chat wave, smooth crossfades) — not a game-UI: no pixel wipes, no console-boot theatre.

- **The one "Lu is thinking" touch** is the **pixel charging loader** (`<PixelThinking/>` / `PixelLoader`) while
  the model call is in flight — a pixelated charging orb that fills ring-by-ring, then pops into the message.
  Her text renders in the normal font. Reused with the dock later.
- Build on the editorial design tokens (`--elev-*`, `.neu-*`, `.gloss`) and the fonts (Plus Jakarta Sans + IBM
  Plex Mono). See [design-system.md](./design-system.md).

## 3. Engineering is live; the rest is the roadmap

- Provisioning creates the **Engineering `Department`** (`status: active`) + a real **`Agent`** row (with a
  `contract`). The rest of the company exists as the roadmap (data-model `status: in_development`), rendered on
  the canvas as "coming online" — reads as *ambition*, not *missing features*.
- The canvas + dock read this: Engineering is clickable/functional; the rest are not yet openable.

## 4. Make Lu work (real, not a cookie mock)

The backend exists (schema, Store, orchestrator, Engineering agent — [agent-backend.md](./agent-backend.md)):

1. **Signup = self-serve, waitlist-gated.** People join a public **waitlist**; an admin accepts some; accepted
   users self-serve the Lu onboarding (accept → shell org + invite → set-password → Lu onboarding), reusing the
   Supabase-invite infra.
2. **Provisioning server action** — at onboarding's end, create a real **org + the Engineering Department
   (active) + the Engineering `Agent`**, seeding `Department.context` from the interview + scrape. Replaces the
   cookie write.
3. **Onboarding conversation → a real endpoint** — the same pattern as the team-graph route (real Claude,
   tool-calls that extract business/brand and drive provisioning).
4. **Canvas / dock read real rows** — Department/Agent/Task from the DB (`GET /api/departments`), not static
   graph data; a real new org renders the same honest-empty home.
5. **Wire Engineering** — "build me X" from the app → a real Task → the sandbox pipeline
   ([engineering-agent.md](./engineering-agent.md)), streamed onto the canvas.

## 5. Debt to clear

Onboarding-specific slices of the branding debt (full register in [design-system.md §5](./design-system.md);
also [ROADMAP.md](../ROADMAP.md)): retire the cookie profile path for real users; replace the assistant glyph
with the real Lu mark; realign or retire the fully-stale welcome page and admin wizard copy; flip the
`assistantName` default to "Lu".

## 6. Conventions (locked)

- **Signup = self-serve, waitlist-gated** (not the admin wizard).
- **Provisioning = a real DB org + the Engineering Department + Agent**, replacing the cookie mock.
- **Only Engineering is live**; the rest of the company is the roadmap.
- **UI = minimal editorial**, motion for personality; the **pixel charging loader** is the only "thinking"
  touch. No game-UI / pixel wipes.
- **Ending = team → building screen → the app**; the building screen runs real provisioning.
