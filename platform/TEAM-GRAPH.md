# TEAM-GRAPH — Lu builds your org by talking to you

> Spec (Levi + Claude, 2026-07-14). As you add teammates by **chatting with Lu**, she builds a
> live org graph — the hierarchy *plus* what she's learned about each person. This is the ONE
> feature where the conversation is a **real Claude Haiku call** (Vercel AI SDK + tool-use), not
> a scripted mock — so it actually feels like talking to her. Everything else stays mock.
> Companions: `ONBOARDING-CONNECT.md` (the New-org demo profile this lives in), `app-ui/12-team`.
>
> **BUILT + verified 2026-07-14** (branch `onboarding-connect`). Real Haiku conversation
> (`/api/team/chat`, AI SDK v6, tools `add_teammate`/`set_reports_to`/`finish`) drives a live
> two-panel `TeamSetup` (Lu chat + `TeamGraph`), used as the onboarding LAST step (skippable) and
> on the Team page (persisted). `Member` gained `reportsTo`/`learned`. Verified: multi-level
> hierarchy (You → Marcus/CFO → Priya/Accountant) built entirely from the conversation. Key: web
> `.env.local` now carries `ANTHROPIC_API_KEY` (copied from apps/api). Plus a dev "Reset
> workspace" (↻) button by the demo-profile selector. Graceful scripted fallback if no key.

## 1. What it is

Entry from the **"Add your team"** step in Home's "Needs you" (or Team → *Add someone*). Opens a
two-panel view: **Lu chats on the left; the org graph grows on the right.** Lu asks for each
person conversationally — name → role → number → who they report to — infers a little, and each
answer drops a node into the graph. When you're done, the Team page shows the finished graph and
every teammate's "what Lu knows" profile.

Example beat: *"Let's set up your team — who's first?"* → "Marcus, my CFO." → *"Got it, Marcus —
CFO. What's his number?"* → "…" → *[Marcus node appears]* → *"And who does Marcus report to?"* →
"Me." → *[connects Marcus → you]* → *"Anyone else?"*

## 2. Data model (extend `Member`)

- **`reportsTo?: string`** — manager member id; builds the real tree (fallback: role tiers
  owner → office → crew).
- **`learned?`** — the per-person profile Lu fills, mirroring the onboarding "what Lu knows about
  you," per teammate:
  ```ts
  learned?: {
    title?: string;            // "CFO", "Lead installer"
    skills?: string[];         // ["metal roofing", "gutters"]
    coverage?: string;         // towns/days they cover
    summary?: string;          // Lu's one-liner
    canHandle?: string[];      // what Lu routes to them (ties to the permissions matrix)
    source: "told" | "inferred";
  }
  ```
Members persist in `OrgProfile.seedMembers` (demo) via the existing `patchOnboardedProfile` write,
so the graph survives navigation and the Team page reads from one source.

## 3. The real conversation (Claude Haiku)

The product already runs Anthropic via the **Vercel AI SDK** (`apps/api`: `@ai-sdk/anthropic`,
`AI_MODEL=claude-haiku-4-5`, `ANTHROPIC_API_KEY`, single `getModel()` swap point). We add the same
to the web app for this flow only:

- **Deps**: add `ai` + `@ai-sdk/anthropic` to `apps/web`; set `ANTHROPIC_API_KEY`
  (+ optional `AI_MODEL=claude-haiku-4-5`) in `apps/web/.env.local` — reuse the api's dev key.
- **Server route** `POST /api/team/chat` (Next route handler — server-side so the key never ships
  to the client): `streamText({ model: anthropic("claude-haiku-4-5"), system: LU_TEAM_PROMPT,
  messages, tools })`.
- **System prompt** — Lu's team-setup persona: warm, brief, **one question at a time**; capture
  each teammate's name, title/role, phone, and who they report to; infer skills/notes when the
  owner volunteers them ("Danny does all our metal roofs"); confirm, then move on; stop when the
  owner's done.
- **Tools** (function-calling — Lu decides when she has enough to act):
  - `add_teammate({ name, title?, phone?, email?, skills?, notes? })` → creates/updates a node. Lu
    asks for each person's **cell + email** if not given, framed as "so I can send them an invite
    to join" (the node then shows "Lu will text and email them an invite").
  - `set_reports_to({ teammate, manager })` → the hierarchy edge (by name or id).
  - `finish()` → ends setup.
  The route applies each tool call to the members store and returns the tool result + Lu's next turn.
- **Client**: the AI SDK's `useChat` renders the streamed conversation (reuse the Claude-style
  chat); on each tool call/result it updates graph state → the new node **animates in** on the
  right panel.

## 4. The graph

Top-down tree built from `reportsTo`, recursive node cards (avatar · name · title · skill chips)
joined by quiet connectors; click a node → the **"What Lu knows"** panel (skills, coverage, what
she routes to them, permissions). Upgrades the placeholder `OrgChart` from ONBOARDING-CONNECT.

## 5. Scope / honesty

- **Only this flow** calls the real API; everything else stays mock.
- **Graceful fallback**: if `ANTHROPIC_API_KEY` is absent, fall back to the current scripted add
  (no crash) so the demo still works without a key.
- The teammates Lu creates are **real records** in `OrgProfile` — the graph is honest data you
  built together, not a fixture.

## 6. Build order

1. Data model (`reportsTo`, `learned`) + richer seed teammates.
2. Graph component (real tree + node "What Lu knows" panel) — replaces the placeholder OrgChart.
3. Web AI plumbing: deps + env + `POST /api/team/chat` route with the three tools.
4. Two-panel add flow: `useChat` conversation ↔ live graph; tool calls mutate the graph + persist
   to `OrgProfile`.
5. Entry points: the "Add your team" needs-you step + Team's "Add someone" open this flow.

## 7. Decisions

- **`reportsTo` captured in-conversation** (Lu asks "who do they report to") vs role-tiers only —
  recommend in-conversation; that's the magic.
- **Streaming on** (feels alive); the graph updates on tool-call events, not just at the end.
- **Key**: reuse the api's `ANTHROPIC_API_KEY` in web `.env.local` (dev only); prod gating later.
- **Cost**: Haiku is cheap and fast; one team setup is a handful of short turns.
