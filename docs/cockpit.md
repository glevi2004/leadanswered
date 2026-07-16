# The Cockpit — consolidation + the composable canvas

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md), [DEVELOPMENT.md](../DEVELOPMENT.md),
> [canvas-tools.md](./canvas-tools.md). This plan makes the UI reflect the real backend and turns the canvas
> into a working, composable surface. It replaces the mock-shell surfaces the reality-check audit found.

## The one idea

**The canvas is the workspace. You create resources and *connect* them to an agent — and a connection is a
capability grant.** Draw a line from a terminal, a note, a file, a folder, or a site to the Engineering
agent, and the agent can now *use* that thing: read a note/file as context, drive a terminal, reference a
site, work from a folder-library. An agent's **working set** = everything connected to it. Lu sends tasks
to agents; the Engineer creates its own sub-tasks and works using its connected resources — and can spawn
terminals and sub-agents of its own.

Today the canvas edges are decorative and the agent activity is mock. This plan makes edges **mean
something** and makes the data **real**.

## The end-to-end flow (what we're building toward)

1. **Log in → connect GitHub + Vercel** (done — BYO).
2. **Chat Lu** → Lu decomposes the goal into tasks and dispatches the **Engineering** agent — and you watch
   it happen *in the chat thread*.
3. **The Engineer works** — creates its own sub-tasks, uses its connected resources (files, notes,
   terminals, sites), builds in a sandbox, opens a preview, asks you to publish.
4. **You compose on the canvas** — drop files, write notes, open terminals, add sites; **group + connect**
   them to the Engineer to give it context and tools.

## Part A — Strip the mock, show real data

The audit found fixtures shown to *real* orgs. Remove them; wire the real sources.

- **Home (`/home`)**: delete the mock "Needs you" rollup (`NEEDS_YOU_SEED`, the Apex people) and every
  non-Engineering agent. Show **only the Engineering agent + real data**: real tasks (`/api/dock/tasks`),
  real sites (`/api/dock/sites`), real approvals (`/api/dock/approvals`). Empty is fine — honest-empty, not
  fake-full.
- **Canvas**: drive badges / "N agent updates" / working spinners from **real** `/api/dock/tasks`, not
  `AGENT_WORK`. Remove the mock teammates (Dev/Marina/Sol) and the mock workplace miniature. Point the
  `engineering-work` embed at real task/artifact data (or the honest-empty state).
- **Dock tabs**: keep **Lu** (chat) and make **Tasks** real (below). Delete **Company** / **Library**
  one-liner stubs (Library returns as the real folder-library, Part C). Remove the dead
  "Publish to Staging / Revert" action bar (the real publish is the `PublishApprovals` card).
- **Other surfaces**: gate `/team`, `/agents` fixtures behind demo mode, or drop them for v0.
- **Mode**: real orgs never see fixtures; demo mode is the only place Apex/AGENT_WORK render.

## Part B — Reconnect the chat ↔ Engineer wire

The single highest-impact fix. `/api/lu/chat` already returns `{ reply, tasksCreated, actions }` and Lu
already dispatches the Engineer — the client just throws the tasks away.

- **`sarah-context.tsx`**: stop discarding the response. Render `tasksCreated` as an inline card in the
  thread ("Lu created N tasks → dispatched the Engineer"), then **poll `/api/dock/tasks` + `/api/dock/
  artifacts` for those task ids right in the chat**, so the owner watches *queued → building → preview →
  needs-approval* in the same conversation, ending at the existing `PublishApprovals` card.
- **Dock "Tasks" tab**: render the real live list (the `useDockData()` logic already exists in
  `AgentDockPanel`) instead of the stub string.

Result: you type a goal to Lu and watch the Engineer's whole build unfold where you're already looking.

## Part C — The composable canvas

The canvas becomes real: nodes persist, and **edges are capability grants**.

### Node types (the "+" menu)

| Node | Create by | Backing record | Connect → agent means |
|---|---|---|---|
| **Terminal** (command line) | ＋ or agent-spawned | `Session` (e2b pty) | The agent can **drive** it (a `drive_terminal` tool bound to that session); you can drive it too. |
| **Note** (markdown) | ＋, edit inline | `Artifact` (kind `note`) | Passed as **context** (read). Agents can also **produce** notes. |
| **File** (image / code — the "clip") | ＋ upload / drop | `Artifact` (kind `file`) | Read as an **asset/context** by the agent. |
| **Folder** (library) | draw a boundary around nodes | `Collection` | Its members become the agent's **library** — the agent reads everything inside. |
| **Site** | ＋ (paste a URL, e.g. `localhost:3000`) **or** agent-built | `Site` | The agent can **reference/use** it; agent-built sites are deployed deliverables (Part D). |

### Edges = capability grants

- Draw a line **from a resource node → an agent node** (or resource → a terminal node). The `Edge` model
  (`fromId`, `toId`, `kind`) already exists; use its kinds: **`reads`** (note/file/folder/site → agent =
  context), **`uses`** (terminal → agent = a tool), **`produces`** (agent → output node).
- An **agent's working set** = every node with a `reads`/`uses` edge into it. That set is resolved at run
  time (Part E).
- A **folder** is UI-light: literally a boundary drawn around member nodes (a `Collection`); connecting the
  folder connects all its members at once.

### Per-node behavior (create → connect → the agent uses it)

- **Terminal:** ＋ opens a live e2b terminal node. Connect it to the Engineer → the Engineer gets a
  `drive_terminal` tool bound to that session (this is the "spawn a command line, hand it to the agent"
  move — the recursive-orchestration primitive from FOUNDATION §3).
- **Note (md):** write it, connect it → its content is injected into the agent's context. Ask an agent to
  "write this up as a note" → it emits a note node connected back to it (`produces`).
- **File (clip):** drop an image or a code file → connect (directly or via a folder) → the agent reads it
  as an asset (e.g. a logo to use, a spec to follow).
- **Folder / library:** group files with a boundary → connect the folder to the Engineer → it's now the
  Engineer's **library**; every file inside is available to every task it runs.
- **Site:** paste a URL (a localhost dev server, a live site) → it renders on the canvas → connect it to an
  agent → the agent can reference it while working. Sites the agent *builds* appear here automatically.

### Persistence

Wire the `CanvasNode` / `Edge` / `Collection` routes + a web client (the Prisma models + Store methods
already exist; only the HTTP routes + client calls are missing). Nodes, positions, and **edges** persist to
the DB per org — not localStorage. The canvas survives reloads and is the source of truth for the working
set.

## Part D — The Engineer's two sides

Differentiate clearly:

- **The Workplace** (the department space): the agent's **live work view** — its current tasks, its
  scratchpad/artifacts, its connected resources (its context). "What the Engineer is working on right now."
  This replaces the mock `engineering-work` embed with real `/api/dock/tasks|artifacts`.
- **Sites** (deliverables): the real deployed things the Engineer **ships** (repo → sandbox → Vercel →
  `PublishApprovals`). A site node is an *output*, distinct from the workplace. User-added reference sites
  (a pasted URL) live alongside but are marked as references, not deliverables.

## Part E — Backend: agents resolve + use their working set

When an agent runs (`runEngineering`), before/within the loop it resolves its connected resources from the
edge graph:

- **`reads`-connected notes/files/folders** → fetch content → inject into the system/context (with sane
  size limits; images by reference).
- **`uses`-connected terminals** → expose a `drive_terminal` tool bound to that `Session`'s e2b pty (the
  agent writes commands, reads output — reusing the terminal bridge with the agent on the write end).
- **`reads`-connected sites** → include their URLs in context.
- **Outputs** (notes it writes, sites it builds) → create nodes with `produces` edges back to the agent, so
  they appear on the canvas connected to it.

The Engineer can also **spawn** terminals and sub-agents (recursive orchestration) — a spawned terminal is
just a new node auto-connected to it.

## Build order

1. **Part A + B** — rip the mock, wire real home + the chat↔Engineer wire. *(Highest impact, mostly
   deletion + one fetch fix.)*
2. **Canvas persistence** — `CanvasNode`/`Edge`/`Collection` routes + client.
3. **Edges as grants + the connect UX** — draw a line resource→agent; store the edge; show it means
   something.
4. **Per-node create + connect** — terminal, note, file, folder, site (the ＋ menu), each connectable.
5. **Part E backend** — resolve the working set into the agent run (context injection first, then
   terminal-as-tool, then folders/files).
6. **Part D** — the Engineer's workplace (real) vs sites (deliverables) split.

The infra for almost all of this already exists (dock proxies, Session/Artifact/Site/CanvasNode/Edge/
Collection models, the terminal bridge). This is mostly **rewiring + deletion + the edge-as-grant layer**,
not new infrastructure.
