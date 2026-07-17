# The Canvas — the unified model

> The single authoritative model of the Lu Computer canvas: what's on it, how everything connects, how it
> works. This **absorbs and replaces** the old `cockpit.md`, `department-as-app.md`, `canvas-tools.md`, and
> `canvas-engine.md` — one coherent source, not fragments. (The *why*: [MANIFESTO](../MANIFESTO.md). The
> *how the backend works*: [agent-backend](./agent-backend.md) (reference), [building-agents](./building-agents.md)
> (how agents build). *Where infra lives*: [byo-connect](./byo-connect.md), [FOUNDATION §7](../FOUNDATION.md).
> *Onboarding lands here*: [onboarding](./onboarding.md). *Look*: [design-system](./design-system.md).)

## The one idea

The canvas is the workspace, and it is **one graph**:

- **Lu** at the center — the orchestrator.
- **Departments = agents** — the **hubs**. Each department *is* its agent, rendered as its app.
- **Resources** — terminal, note, file, folder, site — the **spokes**, created from the ＋ menu.
- **Edges** — connections between them. **An edge is a capability grant:** connecting a resource to an
  agent lets the agent *use* it. An agent's **working set** = everything connected to it.

The **dock** is the company-level command + overview wrapped around the graph.

Everything below is that one picture, in detail. Hubs feed on spokes; the dock drives the whole thing.

## The atoms

| Atom | What it is | On the canvas |
|---|---|---|
| **Lu** | the orchestrator — routes goals into tasks across departments; does no work itself | center node; the dock's **Lu** chat |
| **Department = agent** | the unit of work; each department *is* its agent, shown as its **app** | a **Department card** + a **Workplace card**, side by side (a hub) |
| **Resource** | terminal · note (md) · file · folder · site | a node created from ＋, connected to an agent (a spoke) |
| **Edge** | a connection that grants a capability | a line: `reads` (context) · `uses` (tool) · `produces` (output) |

v0 provisions **Engineering only** — the Engineer. The other seven departments come online over time; the
frame is identical for each.

## The hub — a department is its agent's app

On the canvas a department is **two depth-cards, side by side** (dev/design design language):

### The Department card (left) — Home ⇄ Database-view

A top-right switcher toggles two views:

- **Home** — lists the **applications (sites)** this department owns/has shipped. Each row: name, a
  page/app label, "Last updated", a **Staging / Live** status, open.
- **Database view (the console)** — a **mirror-with-key-actions** of the company's **one managed Supabase
  project** (shared, Engineering-anchored — see "the backend" below). Sidebar tabs, each read from the
  Supabase Management API + the project's own APIs via the [BYO](./byo-connect.md) creds:

  | Tab | Mirror (read) | Key actions |
  |---|---|---|
  | Database | tables/schemas + row browser + query box | run a read query |
  | Migrations | applied migration history | — |
  | Storage | buckets + files | create bucket · upload |
  | Authentication | signup/anon settings, redirect URLs, providers | toggle · add redirect · enable provider |
  | Users | signups chart + recent users | add user |
  | Secrets | project URL + publishable key; secret-key state | generate / rotate / revoke secret key |
  | Logs | function/edge logs | — |
  | Suggestions | advisors (security/perf: unused index, RLS-no-policy) | apply/dismiss (later) |

  Every tab has an honest-empty state. "Mirror" = rendered in our depth-card UI, not an embedded Supabase
  iframe; "key actions" = the few high-value mutations, not full dashboard parity.

### The Workplace card (right) — what it's building now

- The **live preview** of the site(s) currently in progress (iframe — a dev URL or the Vercel preview),
  with a page/route selector.
- A **task selector** at the top (e.g. "Engineer / Build marketing website MVP") + the task's status pill.
- **Publish controls: Publish · Revert All · Request changes** — Publish is wired to the real gate (below);
  Revert All / Request changes are UI stubs today. One **or many** sites (the Engineer may build several).

**Home = what it has shipped · Console = the backend it runs on · Workplace = what it's building now.**

## The spokes — resources (create → connect → the agent uses it)

Created from the canvas **＋ menu**; each backs onto a real record and becomes useful the moment it's
**connected** (an edge) to a department/agent.

| Resource | Backing record | Connect → agent means |
|---|---|---|
| **Terminal** (command line) | `Session` (e2b pty) | the agent can **drive** it (a `drive_terminal` tool); you can drive it too. The "hand the agent a machine" primitive. |
| **Note** (markdown) | `Artifact` (`note`) | passed as **context** (`reads`). Agents also **produce** notes (`produces`). |
| **File** (image / code — the clip) | `Artifact` (`file`) | read as an **asset/context** (`reads`). |
| **Folder** (library) | `Collection` | a boundary drawn around nodes; connecting the folder connects all its members — becomes the agent's **library**. |
| **Site** | `Site` | **agent-built** (appears in the department's Home + Workplace) **or user-added** (paste a URL) → the agent references/uses it (`reads`). |

**The key reconciliation** (the thing that was scattered): a department's own faces and the connected
resources are *the same system, two views*:
- A department's **Library** = the notes/files/folders connected to it with `reads`. Connecting a folder
  *is* filling its library.
- A **terminal** connected to a department = a machine its agent drives — the same terminal that can also
  sit in its Workplace.
- The **sites** in Home/Workplace are the department's `Site` deliverables; a user-added reference site is
  the same node type, connected as a reference instead of a deliverable.
- The **Console** is the one backend all those sites run on.

## Edges — how connecting grants capability

- Draw a line from a resource node to an agent (or resource → a terminal). Kind is inferred by source:
  note/file/folder/site → **`reads`**, terminal → **`uses`**; an agent's output → **`produces`**.
- At **run time** the agent resolves its working set: `reads`-connected notes/files/folders → injected as
  context; `uses`-connected terminals → exposed as a `drive_terminal` tool; sites → their URLs in context.
  (See [agent-backend](./agent-backend.md); MVP context-injection is shipped.)
- **Orchestration is recursive:** any agent can spawn a sub-agent or a terminal and drive it — a spawned
  node is just a new node auto-connected to it.

## The backend — one shared project, Engineering-anchored

**Decision (locked):** the company has **one managed Supabase project**, owned by the **Engineering**
department, consumed by all. The Engineer builds every department's sites *into* it. The console is that
project, mirrored. (cofounder-proven; cheaper than per-department projects; the "Design's site built by the
Engineer" cross-wiring falls out naturally. Revisit per-department isolation only if ever needed.)

- Provisioned/connected via [BYO](./byo-connect.md): the owner connects their **GitHub + Vercel + Supabase**
  (token-paste today); the Engineer builds into *their* accounts; **secrets are brokered, never handed to
  the model** (stored encrypted, injected at the outbound call).
- **Migration safety gates** (adopt cofounder's): schema changes flow through PRs, never a raw tool call; a
  lint blocks tables without RLS; a lint blocks deleting old migrations.

## The publish flow — human-gated

`sandbox → PR preview → production`, **one approval gate** (the code today is single-gate, not a separate
staging environment):
1. **Build in sandbox** — the Engineer works in an isolated e2b sandbox (edits repo, runs the coding agent,
   verifies) — durably, via the [worker](./building-agents.md).
2. **Open a preview** — `open_preview` opens a PR + a Vercel **preview** deploy and stages an **Approval**
   (`request_publish`); the task moves to `needs_approval`.
3. **Publish to Production** — the Workplace/Canvas Publish button resolves the Approval → `confirmPublish`
   merges the PR and promotes to Vercel production. (A dedicated staging environment is a roadmap upgrade.)

## The flow — how it all interacts

1. You chat **Lu** → it decomposes the goal into **tasks** and **dispatches** the owning department. You
   watch the tasks + build stream **inline in the chat** (the build tracker).
2. You feed the department: drop files/notes, open a terminal, add a reference site → **connect** them →
   they're its working set/library.
3. The agent works in its **Workplace** — builds a site into the shared backend, using its connected
   terminals + library.
4. **Publish** (one approval) → **Production**; **Home** lists what shipped; **Console** shows the backend.
5. **Cross-department:** Design *owns* a site, dispatches it to Engineering; the Engineer builds it; it
   appears in Design's Home, on the shared backend.

## The dock — the company wrapper

Around the whole canvas (cofounder-structured tabs):
- **Home** — greeting + **Roadmap %** (stages › tracks › steps; auto-completes as the workspace changes) +
  **Tasks** (Needs-Clarification / Requires-Approval badges) + **Suggested Next**.
- **Lu** — the orchestrator chat (the build tracker unfolds here).
- **Company** — org view: the **Stack** (Domain / Email / Payment / Hosting — connect rows) · **Important
  links** (App, Marketing Website) · **Agents** (list + ＋ New).
- **Tasks** — all tasks + ＋ New (Plan-vs-Execute mode; approvals via an Attention Queue).
- **Library** — every file (folders by department; pin; chat-with-a-file; "bring over ChatGPT/Claude
  context" import).

## The plane — the rendering engine

The canvas plane is a pannable/zoomable infinite surface (react-zoom-pan-pinch): screen-space grid, node
culling to the viewport, a hand-tool default (pan) with a select tool, and drag to move nodes. **Nodes,
positions, and edges persist to the DB** per org (`CanvasNode` / `Edge` / `Collection` via
`/api/canvas/*`) — not localStorage. The department ring (real provisioned departments) + Lu-center are the
fixed frame; everything else is the persisted composable graph.

## Data model (all exists today)

`Department` · `Agent` · `Task` (`parentTaskId`) · `Artifact` (`note`|`file`|`agent_session`|`pr_diff`|
`site_preview`|`image`) · `Site` (+ a `departmentKey` for ownership — small addition) · `Deployment` ·
`Session` · `Approval` · `CanvasNode` (`terminal`|`note`|`file`|`folder`|`site`|`agent`) · `Edge`
(`reads`|`uses`|`produces`) · `Collection`. The company's Supabase project ref/keys attach to the
BYO connection.

## Build order

0. **Supabase connect** (extend BYO) — the backend the console reads. *(Prerequisite for the console.)*
1. **The department-as-app frame** — the two side-by-side depth-cards (Engineering first).
2. **The console** — wire the tabs to the Supabase Management API + project APIs (Database · Migrations ·
   Secrets first).
3. **Home** (the department's site list) + **Workplace** (extend the shipped cockpit workplace).
4. **The composable spokes** — the ＋ menu resources + edges-as-grants (persistence + connect shipped;
   polish per-node create/connect).
5. **The dock** — the cofounder tab structure (Company Stack, Library, Roadmap %).
6. **Cross-department** deliverables (Design's site built by the Engineer) — later.

**Already shipped** (the cockpit pass): the chat↔Engineer build tracker, real Engineering-only home,
build-resilience timeouts, canvas persistence + edges + ＋ nodes, real workplace embeds. This plan builds
the department-as-app layer on top.
