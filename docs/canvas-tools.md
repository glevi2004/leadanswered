# Lu Computer — the canvas toolbar

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md).

The bottom-center `CanvasToolbar` (select · terminal · md · files · folder · site · text · draw) creates
**real, persisted, agent-connectable elements** on the plane. It plugs into the agent backend
([agent-backend.md](./agent-backend.md)) — agents, the sandbox runtime, the site pipeline, the library/memory,
artifacts. The canvas is the home; agents paint on it.

## 1. The element model — one persisted, typed, connectable node

Alongside the fixed lu/agent/site/sheet/teammate nodes (`lib/canvas/graph.ts`), a **`CanvasNode`** table holds
**user-created** elements, so anything on the plane is real, persistent, and wireable to an agent:

- **CanvasNode** — `orgId`, `type` (`terminal | markdown | folder | site | text | drawing`), `x`/`y`/`w`/`h`
  (world coords — the layout persists to the DB), `refId` (FK to the backing entity: a `Session` / `Artifact` /
  `Collection` / `Site` / `Note` / `Drawing`), `z`, `createdBy`.
- **Edge** — `orgId`, `fromId`, `toId`, `kind` (`owns | reads | produces`). An edge from an **Agent** to a
  CanvasNode is the load-bearing "connected to an agent" concept: the agent **owns** the site it built,
  **reads** the folder/library, a terminal session **produces** a PR. Edges give the graph meaning and drive
  what an agent can see/touch (its boundaries + context).
- The agent/Lu/teammate nodes stay; `CanvasNode` is the additive layer. `graph.ts` merges both.

## 2. Tool = an interaction MODE (reconciled with pan/zoom)

The toolbar sets the canvas **mode** (`tool`). The library owns drag = pan; the mode modulates it:

- **select** (default): click = select, drag on empty = **marquee**, drag on a node = move. Suppress library
  pan while a marquee is in progress (`panning.excluded` + a marquee overlay); hold **space** or use
  middle-mouse to pan regardless (standard canvas convention).
- **terminal/md/folder/site/text**: **place** mode — click on the plane drops that element there (or opens a
  tiny create popover), then snaps back to select.
- **draw**: freehand mode — drag paints strokes; pan needs space/middle-mouse.

## 3. Select — real multi-select

`selection: Set<string>` (not a single `sel`):

- **Marquee**: with the select tool, pointer-down on empty → draw a selection rect (screen-space overlay) → on
  up, select every node whose world box intersects it.
- **Shift/⌘-click**: add/remove a node from the set. Click empty = clear.
- **Group ops** on the set: move together (offset each by the same world delta, persist), **connect** (select
  an element + an agent → ⌘E or a context action creates an Edge), delete, and a small floating action bar
  (connect · group into folder · delete).
- The blue selection ring/box renders for every id in the set. Selecting a live site + an agent, then
  connecting them, is exactly this.

## 4. Terminal — spawn a coding agent, live on the canvas

**What it does:** click terminal → pick **Claude Code / Codex / plain shell** → it spawns, and a **live
terminal node** renders on the plane (real `xterm.js`), streaming the session; you can watch and type. The node
is an **Edge→ an agent** (the Engineering agent working interactively, or a standalone coding session). This is
the manual door to the same sandbox + coding-agent runtime the Engineering agent uses autonomously
([agent-backend.md §6](./agent-backend.md)).

**Where it runs — three tiers:**

1. **Cloud sandbox, ephemeral — DEFAULT.** An isolated sandbox (**e2b** / Daytona / Fly / Modal) with a shell +
   Claude Code/Codex preinstalled + the org's repo cloned (GitHub token). A **PTY** is streamed to the canvas
   terminal node over a **websocket** (node ⇄ `apps/api` ⇄ sandbox PTY). Zero install, works from the web,
   isolated/safe, scales, unifies with Engineering. Cost + cold-start are mitigated (pre-warm, hibernate idle);
   state persists via a PR or a volume. The right SaaS default, and the same infra Engineering needs.
2. **Your own machine — ADVANCED opt-in.** A tiny companion daemon (`npx lu connect`) tunnels the owner's local
   terminal to the canvas (their real env, files, tools; no runtime cost). Install friction + security keep it
   off the default path — shipped as "connect your machine" for power users.
3. **Persistent per-org cloud machine — LATER / premium.** A long-lived container + volume per org (an
   always-on computer) — stateful, instant reattach, feels like *your* computer. Higher always-on cost; a
   premium tier.

The **xterm.js frontend is backend-agnostic** — the same terminal node for all three; only the PTY transport
differs. Backing entity: **`Session`** (`sandboxId`, `agentKind`, `repo`, `status`, transcript → an
`agent_session` Artifact). Lifecycle: spawn → attach (reconnect to a live session) → hibernate → kill.

## 5. Markdown — a doc node, connected to an agent

Click md → a **markdown node** (view/preview + edit, a small editor in the frame), backed by an
`Artifact(kind=doc)` or a `Note`, Edge→ an agent. Three uses: **the agent's `CONTRACT.md`** (view/edit its
identity on the canvas), a **doc the agent produced** (a brief, a plan, a post draft), or a user note. Renders
like the site frame (a paper frame). Edits persist; the connected agent can read/write it (it's in its context).

## 6. Folder — the Library, made spatial

Click folder → a resizable **folder frame** on the plane. **Drag & drop** images/files onto it → they become
members; the frame shows thumbnails; double-click opens it. It's an **Edge→ an agent** = that agent's
**Library**: its knowledge (files it can reference — RAG) + its asset store (images it can drop into a site).

- Backing: **`Collection`** (`orgId`, optional `agentId`, `name`) + `Artifact` members; files land in
  **Supabase Storage**; images indexed for the agent (vector/RAG, [agent-backend.md §5c](./agent-backend.md)).
- This is the **Library** made spatial — folders of reusable assets/presets an agent can use. Drop the brand
  photos into Marketing's folder → the site build uses them; drop a spec PDF into Engineering's folder → it
  reads it.
- HTML5 drag-drop / file input → upload → Artifact → Collection member; dragging a canvas element *into* the
  frame groups it.

## 7. Site — a website node, connected to an agent

Click site → create a **Site** (pick preset + brand) → the Marketing/Engineering agent builds it via the site
pipeline ([agent-backend.md §6/§7](./agent-backend.md): repo → sandbox → PR → Vercel preview → publish →
`{slug}.lu.computer`). Renders as the **live site frame** (BrowserChrome + Artifacts nav + the action bar),
pointed at the real deployment. Edge→ the agent that owns it (and optionally chained to another site, e.g. a
booking site linked from the marketing site).

## 8. Text — a note on the plane

Click text → a **sticky/text note** (inline-editable). Backing: `Note` (`text`, style). A pure canvas primitive
— no agent needed, but connectable (a note pinned to an agent = context/instruction). The simplest tool.

## 9. Draw — freehand on the plane

Pencil → **freehand strokes** (drag → a smoothed SVG path in world coords). Backing: `Drawing` (`points`/`svg`,
`color`, `width`). Strokes live in the transformed layer so they pan/zoom with everything. Multi-stroke; erase;
a small color/width popover. Good for circling things / annotating during a review.

## 10. Connections — what "connected to an agent" means

An **Edge** from an Agent to a CanvasNode is load-bearing, not decoration:

- `reads` → the element is in the agent's **context/library** (a folder, md, or note it should know).
- `owns` → the agent is responsible for it (a site it maintains, a terminal session it drives).
- `produces` → the element is the agent's **artifact** (a PR from a terminal, a page from a site build).

Selecting an element + an agent and hitting **connect** (§3) creates the edge; it updates the agent's boundaries
+ what shows in its dock Space/Scratchpad. This is how the spatial canvas feeds the agent runtime.

## 11. Persistence + realtime

- Node layout + all elements persist to the DB (`CanvasNode`/`Edge` + backing entities). Reads via
  `@supabase/ssr` like the rest.
- **Realtime** (Supabase Realtime): terminal output, task/site build progress, and folder contents update live
  on the canvas without reload — the plane feels alive (and multiplayer-ready later).

## 12. Sequence

1. **Element model + Select multi-select + Text + Draw + MD note** — the pure-canvas layer (no new backend):
   `CanvasNode`/`Edge` tables, marquee/shift multi-select + group move/connect, sticky notes, freehand, a
   markdown node. Lands independently.
2. **Folder / Library** — Collection + Supabase Storage + drag-drop; wire a folder as an agent's library.
3. **Site tool** — hook to the site pipeline (needs [agent-backend.md §6/§7](./agent-backend.md)).
4. **Terminal** — the big one: sandbox provider + PTY streaming + xterm.js + Claude Code/Codex in the sandbox.
   Built alongside the Engineering agent (shared infra). Default = ephemeral cloud sandbox; connect-your-machine
   after.

## 13. Conventions (locked)

- **Terminal backend = ephemeral cloud sandbox (e2b)** default; connect-your-machine = advanced opt-in;
  persistent per-org machine = premium/later. (Same `Sandbox` port as [agent-backend.md](./agent-backend.md).)
- **Coding agents in the terminal = the owner's choice: Claude Code or Codex** (+ plain shell), all preinstalled.
- **Storage = Supabase Storage** for folder files/images.
- **Pan convention = space/middle-mouse** to pan while a place/select tool is active.
- The pure-canvas layer (select/text/draw/md/folder, §12 step 1) lands independently; the terminal + site tools
  ride the Engineering backend (see [engineering-agent.md](./engineering-agent.md)).
