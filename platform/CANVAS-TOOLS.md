# Plan — the canvas toolbar, made real (elements · tools · backends)

> Build plan (Levi + Claude, 2026-07-15). The bottom-center `CanvasToolbar` (select · terminal · md · files ·
> folder · site · text · draw) is **visual-only today** — each tool just sets `tool` state, no effect. This
> spec makes every tool functional. It plugs into **`AGENTS-BACKEND.md`** (agents, the sandbox runtime, the
> site pipeline, the library/memory, artifacts) and **`PLATFORM-VISION.md`** (the canvas is the home; agents
> paint on it). Principle: the toolbar creates **real, persisted, agent-connectable elements** on the plane.

## 1. The element model — one persisted, typed, connectable node

Today the canvas nodes are fixed fixtures (`lib/canvas/graph.ts`: lu/agent/site/sheet/teammate). Add a
**`CanvasNode`** table for **user-created** elements, so anything on the plane is real + persistent + wireable
to an agent:
- **CanvasNode** — `orgId`, `type` (`terminal | markdown | folder | site | text | drawing`), `x`/`y`/`w`/`h`
  (world coords — the layout that's in localStorage today moves to the DB), `refId` (FK to the backing entity:
  a `Session` / `Artifact` / `Collection` / `Site` / `Note` / `Drawing`), `z`, `createdBy`.
- **Edge** — `orgId`, `fromId`, `toId`, `kind` (`owns | reads | produces`). An edge from an **Agent** to a
  CanvasNode = the connection Levi keeps describing ("connected to an agent"): the agent **owns** the site it
  built, **reads** the folder/library, a terminal session **produces** a PR. Edges give the graph meaning +
  drive what an agent can see/touch (its leash + context).
- The existing agent/Lu/teammate nodes stay; `CanvasNode` is the additive layer. `graph.ts` merges both.

## 2. Tool = an interaction MODE (reconciled with pan/zoom)

The toolbar sets the canvas **mode** (`tool`). Today RZPP owns drag=pan; the mode modulates it:
- **select** (default): click = select, drag on empty = **marquee**, drag on a node = move. → suppress RZPP
  pan while a marquee is in progress (RZPP `panning.excluded` + a marquee overlay); hold **space** or use
  middle-mouse to pan regardless (standard canvas convention).
- **terminal/md/folder/site/text**: **place** mode — click on the plane drops that element there (or opens a
  tiny create popover), then snaps back to select.
- **draw**: freehand mode — drag paints strokes; pan needs space/middle-mouse.
The active tool already renders in `CanvasToolbar`; wire `onPick` to actually switch mode + cursor.

## 3. Select — real multi-select (like any canvas app)

Replace the single `sel: string` with a **`selection: Set<string>`**:
- **Marquee**: with the select tool, pointer-down on empty → draw a selection rect (screen-space overlay) →
  on up, select every node whose world box intersects it.
- **Shift/⌘-click**: add/remove a node from the set. Click empty = clear.
- **Group ops** on the set: move together (drag any selected node moves all — offset each by the same world
  delta, persist), **connect** (select an element + an agent → ⌘E or a context action creates an Edge),
  delete, and a small floating action bar for the selection (connect · group into folder · delete).
- The blue selection ring/box already exists per-node; render it for every id in the set. Levi's example
  ("a live site + an agent node") = exactly this — select both, then connect them.

## 4. Terminal — spawn a coding agent, live on the canvas (THE backend decision)

**What it does:** click terminal → pick **Claude Code / Codex / plain shell** → it spawns, and a **live
terminal node** renders on the plane (real `xterm.js`), streaming the session; you can watch and type. The
node is an **Edge→ an agent** (it *is* the Engineering agent working interactively, or a standalone coding
session). This is the manual door to the same sandbox+coding-agent runtime the Engineering agent uses
autonomously (`AGENTS-BACKEND §6`).

**Where it runs — three tiers (pick the default, offer the others):**
1. **Cloud sandbox, ephemeral — DEFAULT.** The worker spawns an isolated sandbox (**e2b** / Daytona / Fly
   Machines / Modal) with a shell + Claude Code/Codex preinstalled + the org's repo cloned (GitHub-App token).
   A **PTY** is streamed to the canvas terminal node over a **websocket** (node ⇄ `apps/api` ⇄ sandbox PTY).
   *Pros:* zero install, works from the web, isolated/safe, scales, unifies with Engineering. *Cons:* runtime
   cost + cold-start (mitigate: pre-warm, hibernate idle), ephemeral (state persists via a PR or a volume).
   **This is the right SaaS default** and the same infra §6 needs anyway.
2. **Your own machine — ADVANCED opt-in.** A tiny companion daemon (`npx lu connect`) tunnels the user's local
   terminal to the canvas (their real env, files, tools; no runtime cost to us). *Cons:* install friction (the
   thing `VISION-LU` refuses for the mass market), security (agents on their box), only online when their
   machine is. Ship as "connect your machine" for power users, not the default.
3. **Persistent per-org cloud machine — LATER / premium.** A long-lived container + volume per org (Zo-style
   "always-on computer," `VISION-LU §2`) — stateful, instant reattach, feels like *your* computer. Higher
   always-on cost; a premium/heavy-user tier.
The **frontend (xterm.js) is backend-agnostic** — same terminal node for all three; only the PTY transport
differs. Backing entity: **`Session`** (`sandboxId`, `agentKind`, `repo`, `status`, transcript → an
`agent_session` Artifact). Lifecycle: spawn → attach (reconnect to a live session) → hibernate → kill.

## 5. Markdown — a doc node, connected to an agent

Click md → a **markdown node** (view/preview + edit, a small editor in the frame). It's backed by an
`Artifact(kind=doc)` or a `Note`, and Edge→ an agent. Three real uses: **the agent's `CONTRACT.md`** (view/edit
its identity right on the canvas), a **doc the agent produced** (a brief, a plan, a post draft), or a user
note. Renders like the site frame (BrowserChrome-less, a paper frame). Edits persist; the connected agent can
read/write it (it's in its context).

## 6. Folder — the Library, made spatial (drag-drop, agent knowledge + assets)

Click folder → a resizable **folder frame** on the plane. **Drag & drop** images/files onto it → they become
members; the frame shows thumbnails; double-click opens it. It's an **Edge→ an agent** = that agent's
**Library**: its knowledge (files it can reference — RAG) + its asset store (images it can drop into a site).
- Backing: **`Collection`** (`orgId`, optional `agentId`, `name`) + `Artifact` members; files land in **Supabase
  Storage**; images indexed for the agent (vector/RAG per `AGENTS-BACKEND §5c`).
- This IS the **Library** top-tab (`PLATFORM-VISION §6`) made spatial — folders of reusable assets/presets an
  agent can use. E.g. drop the brand photos into Marketing's folder → the site build uses them; drop a spec PDF
  into Engineering's folder → it reads it.
- Drag-drop onto a folder frame (canvas) writes membership + storage; drag a canvas element *into* the frame
  groups it. HTML5 drag-drop / file input → upload → Artifact → Collection member.

## 7. Site — a website node, connected to an agent

Click site → create a **Site** (pick preset + brand) → the Marketing/Engineering agent builds it via the site
pipeline (`AGENTS-BACKEND §6/§7`: repo → sandbox → PR → Vercel preview → publish → `{slug}.lu.computer`). Renders
as the **live site frame we already built** (BrowserChrome + ArtifactsNav + the action bar), now pointed at the
real deployment. Edge→ the agent that owns it. "Connected to another" = wired to its building agent (and
optionally chained to another site, e.g. a booking site linked from the marketing site).

## 8. Text — a note on the plane

Click text → a **sticky/text note** (inline-editable). Backing: `Note` (`text`, style). Pure canvas primitive —
no agent needed, but connectable (a note pinned to an agent = context/instruction). The simplest tool; ship first.

## 9. Draw — freehand on the plane

Pencil → **freehand strokes** (drag → a smoothed SVG path in world coords, like tldraw's draw). Backing:
`Drawing` (`points`/`svg`, `color`, `width`). Strokes live in the transformed layer so they pan/zoom with
everything. Multi-stroke; erase; a small color/width popover. Good for circling things / annotating during a
review.

## 10. Connections — what "connected to an agent" means

An **Edge** from an Agent to a CanvasNode is the load-bearing concept across all tools. It's not decoration:
- `reads` → the element is in the agent's **context/library** (folder, md, note it should know).
- `owns` → the agent is responsible for it (a site it maintains, a terminal session it drives).
- `produces` → the element is the agent's **artifact** (a PR from a terminal, a page from a site build).
Selecting an element + an agent and hitting **connect** (§3) creates the edge; it updates the agent's leash +
what shows in its dock Space/Scratchpad. This is how the spatial canvas feeds the real agent runtime.

## 11. Persistence + realtime

- Node layout + all elements → the DB (`CanvasNode`/`Edge` + backing entities), replacing the localStorage
  layout. Reads via `@supabase/ssr` like the rest.
- **Realtime** (Supabase Realtime / the §5c stream): terminal output, task/site build progress, and folder
  contents update live on the canvas without reload — the plane feels alive (and multiplayer-ready later).

## 12. Build phasing

1. **Element model + Select multi-select + Text + Draw + MD note** — the pure-canvas layer (no new backend):
   `CanvasNode`/`Edge` tables, marquee/shift multi-select + group move/connect, sticky notes, freehand, a
   markdown node. Ships a real, editable canvas fast.
2. **Folder / Library** — Collection + Supabase Storage + drag-drop; wire a folder as an agent's library.
3. **Site tool** — hook to the site pipeline (needs `AGENTS-BACKEND §6/§7` first).
4. **Terminal** — the big one: sandbox provider + PTY streaming + xterm.js + Claude Code/Codex in the sandbox.
   Built alongside the Engineering agent (shared infra). Default = ephemeral cloud sandbox; add
   connect-your-machine after.

## 13. Decisions (LOCKED 2026-07-15)

- **Terminal backend = ephemeral cloud sandbox (e2b)** default; connect-your-machine = advanced opt-in;
  persistent per-org machine = premium/later. (Same `Sandbox` port as `AGENTS-BACKEND §11`.)
- **Coding agents in the terminal = user's choice: Claude Code OR Codex** (+ plain shell), all preinstalled.
- **Storage = Supabase Storage** for folder files/images.
- **Pan convention = space/middle-mouse** to pan while a place/select tool is active (standard canvas UX).
- **Sequence:** the pure-canvas layer (select/text/draw/md/folder, §12 Phase 1) can land independently; the
  **terminal + site tools ride the Engineering backend** — built with `ENGINEERING-AGENT.md`.
