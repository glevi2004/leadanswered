# Workspace restructure — nav trim, Dashboard, AI Assistant, Team-on-graph

The app collapses from a page-per-capability layout into **5 surfaces**, with the
**Workspace canvas as the heart**. Everything that isn't Schedule, Team, chat, or the
dashboard lives *inside a department* on the canvas, not as its own nav item.

## Decisions (locked)
- **Canvas → "Workspace"** (the heart of the product).
- **Teammates = game-like nodes on the graph** — profile image + name + role, attached
  to the department they work with (a CFO node next to Finance, a SWE next to Engineering).

## New sidebar
Edit `src/lib/data/registry.ts` (`NAV_CLUSTERS` + the `canvas` label):
```
["home", "sarah", "canvas"]   →  Dashboard · AI Assistant · Workspace
["schedule", "team"]          →  Schedule · Team
```
- **Removed from the sidebar:** Customers (`crm`), Money (`money`), Agents (`agents`),
  Sites (`sites`). Their `MODULES` entries + routes **stay live** — they just fold into
  departments (same pattern the registry comment already describes for quotes/invoices/etc).
- Canvas nav label becomes **Workspace**; keep the `/canvas` route internally (optionally
  add a `/workspace` alias + redirect later — pure polish, not required).

### Where the removed pages' content goes
| Was a nav page | Now reached via |
|---|---|
| Customers (CRM) | **Sales** department → CRM tab (already wired) |
| Money (invoices/quotes) | **Finance** department page |
| Agents | the **Workspace** canvas *is* the agent map; per-dept agents in the dock panel |
| Sites | each department's **Space** (its pages/sites); "create a site" from a dept or Lu |

## 1. Dashboard (`/home`) = "Needs you" + Widgets
Rebuild `app/(app)/home/HomeClient.tsx` into two stacked zones.

**A. Needs you** — a cross-agent rollup (a compilation of every agent's workplace):
for each department agent, surface (a) **what it's doing** (active task + working status)
and (b) **what's waiting on you** (approval / question / blocked). Each row jumps into
that department (Workspace focused on it, or its dept page).
- Data: extend `src/lib/canvas/agent-work.ts` with per-agent "needs-you" items and a
  `needsYou()` selector that flattens them across departments (reuse `workingDepts()` +
  the existing task mock).

**B. Widgets** — a customizable grid below Needs-you:
- Each widget = a **slice of a department's site** (e.g. Operations board, Sales pipeline,
  Finance unpaid, Schedule today).
- **+ Add widget** → picker of available dept-site slices; widgets are removable +
  reorderable; layout persisted to `localStorage` (`lu_dashboard_widgets_v1`).
- Build widgets from the **real components** (CrmIndex, InvoicesIndex, dept boards) at a
  compact size — not scaled iframes — for crispness + perf.

## 2. AI Assistant (`/sarah`) = full-page Lu chat
A dedicated, clean chat with Lu — she speaks for **all** agents, with none of the canvas
machinery. Reuse the existing Lu chat thread (the dock's "Lu" tab) rendered full-page; no
agent panels, no graph.

## 3. Team on the Workspace graph (game-like)
**Data model** — new `src/lib/canvas/team.ts`:
`Teammate { id, name, role, avatarUrl, deptId }`. Seed a few (CFO↔finance, SWE↔engineering,
Designer↔design). Positions persist alongside the other canvas nodes.

**Graph (CompanyCanvas):** render teammate nodes attached to their department agent
(edge agent→teammate). Styling = **game-like character card**: round avatar (profile
image) + name + role pill; small and warm, visibly a *person* vs. an agent. Draggable +
persisted like every other node.

**Management (`/team`):** a roster — list teammates, add/edit (name, role, avatar,
department). Adding one here makes it appear on the graph attached to its department.
Optional `+ Teammate` affordance inside a department's dock panel.

**Interaction:** clicking a teammate opens a **person panel** in the dock (role,
department, what they own / can be handed) — not an agent panel.

## Cleanup
- Trim `NAV_CLUSTERS`; keep `MODULES` + routes so existing links still resolve.
- Update `FEATURES.md` + `PLATFORM-VISION.md` to the 5-item nav + Workspace name.

## Out of scope (now)
Real teammate auth/permissions, real widget data pipes, `/canvas`→`/workspace` route rename.

## Suggested build order
1. **Nav trim + Workspace rename** (registry only — trivial, ships the new shape instantly).
2. **AI Assistant** full-page chat (reuse existing thread).
3. **Dashboard**: Needs-you rollup, then the widget grid.
4. **Team-on-graph**: data + game-like nodes + roster wiring + person panel.
