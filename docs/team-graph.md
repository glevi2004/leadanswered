# Lu Computer — the team graph

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md).

As the owner adds teammates by **chatting with Lu**, she builds a live org graph — the hierarchy *plus* what
she's learned about each person. The conversation is a **real Claude call** (Vercel AI SDK + tool-use), so it
feels like talking to her. Entry: the onboarding team step ([onboarding.md](./onboarding.md)) and the Team page.

## 1. What it is

A two-panel view: **Lu chats on the left; the org graph grows on the right.** Lu asks for each person
conversationally — name → role → number → who they report to — infers a little, and each answer drops a node
into the graph. When done, the Team page shows the finished graph and every teammate's "what Lu knows" profile.

Example beat: *"Let's set up your team — who's first?"* → "Marcus, my CFO." → *"Got it, Marcus — CFO. What's his
number?"* → "…" → *[Marcus node appears]* → *"And who does Marcus report to?"* → "Me." → *[connects Marcus →
you]* → *"Anyone else?"*

## 2. Data model (extend `Member`)

- **`reportsTo?: string`** — manager member id; builds the real tree (fallback: role tiers owner → office →
  crew).
- **`learned?`** — the per-person profile Lu fills, per teammate:
  ```ts
  learned?: {
    title?: string;            // "CFO", "Lead installer"
    skills?: string[];         // what they're good at
    coverage?: string;         // areas/days they cover
    summary?: string;          // Lu's one-liner
    canHandle?: string[];      // what Lu routes to them (ties to the permissions matrix)
    source: "told" | "inferred";
  }
  ```

Teammates persist as real **Member** records, so the graph survives navigation and the Team page reads from one
source.

## 3. The real conversation (Claude Haiku)

The runtime already runs Anthropic via the **Vercel AI SDK** (`apps/api`: `@ai-sdk/anthropic`,
`claude-haiku-4-5`, one `getModel()` swap point). The web app carries the same for this flow:

- **Deps**: `ai` + `@ai-sdk/anthropic` in `apps/web`; `ANTHROPIC_API_KEY` (+ optional `AI_MODEL`) in
  `apps/web/.env.local` (dev; prod gating later).
- **Server route** `POST /api/team/chat` (server-side so the key never ships to the client):
  `streamText({ model, system: LU_TEAM_PROMPT, messages, tools })`.
- **System prompt** — Lu's team-setup persona: warm, brief, **one question at a time**; capture each teammate's
  name, title/role, phone, and who they report to; infer skills/notes when the owner volunteers them; confirm,
  then move on; stop when the owner's done.
- **Tools** (function-calling — Lu acts when she has enough):
  - `add_teammate({ name, title?, phone?, email?, skills?, notes? })` → creates/updates a node. Lu asks for each
    person's **cell + email** if not given, framed as "so I can send them an invite to join" (the node then
    shows "Lu will text and email them an invite").
  - `set_reports_to({ teammate, manager })` → the hierarchy edge (by name or id).
  - `finish()` → ends setup.
  The route applies each tool call to the members store and returns the tool result + Lu's next turn.
- **Client**: the AI SDK's `useChat` renders the streamed conversation; on each tool call/result the graph state
  updates → the new node **animates in** on the right panel.

## 4. The graph

Top-down tree built from `reportsTo`, recursive node cards (avatar · name · title · skill chips) joined by
quiet connectors; click a node → the **"What Lu knows"** panel (skills, coverage, what she routes to them,
permissions).

## 5. Scope / honesty

- **Graceful fallback**: if `ANTHROPIC_API_KEY` is absent, fall back to a scripted add (no crash) so the flow
  still works.
- The teammates Lu creates are **real records** — the graph is honest data you built together, not a fixture.

## 6. Conventions (locked)

- **`reportsTo` captured in-conversation** (Lu asks "who do they report to") — that's the magic, vs role-tiers
  only.
- **Streaming on** (feels alive); the graph updates on tool-call events, not just at the end.
- **Cost**: Haiku is cheap and fast; one team setup is a handful of short turns.
