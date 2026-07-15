# PLATFORM-VISION — Lu Computer: the AI company you run

> Rewrite (Levi + Claude, 2026-07-15). **Supersedes** every earlier cut (marketplace → six fixed
> surfaces → this). New model, inspired by **Cofounder** (app.cofounder.co): the product is a
> **radial canvas of your company** — **Lu** at the center, **departments** orbiting her, each staffed
> by **agents**, with its own **space**, **tasks**, **artifacts**, and **context**. The canvas *is* the
> app. This consciously **broadens the ICP** from "service business" toward **any company** (Cofounder
> territory), with service businesses as the initial wedge (Levi's call, 2026-07-15).
> Companions: `TEAM-GRAPH.md` (the canvas engine we reuse), `VISION-LU.md`, `FEATURES.md`.
> `WORKSPACE-ASSEMBLY.md` = superseded. Not a build plan — the backbone.

## 0. Thesis

You don't manage features; **you run an AI company.** **Lu** is the operator at the center — you talk
to her about the whole business and she delegates. Around her sit the **departments** of a company,
each staffed by AI **agents** that do the work, keep their own **space** (their page/UI), own their
**tasks**, produce **artifacts**, and share a **context** (what they know + how they act). The home
screen is a **living org canvas**, not a nav bar. It's the AI-OS thesis made literal and legible: *an
org chart you can actually operate.*

## 1. The canvas — the home

A full-screen **radial graph**: **Lu** (center) with **eight departments** on spokes around her —

> **Operations · Finance · Legal · Engineering · Design · Marketing · Sales · Support**

(fixed set, same for everyone — Cofounder-style). Click any node → a **right dock** becomes that
node's panel. Pan/zoom canvas (reuses the `TeamGraph` engine). The departments are always present;
what fills each one (its agents, its space's data) is what adapts per business.

## 2. Anatomy of a department (the one unit that repeats)

Every department node opens the same five-part dock (mirroring Cofounder):

- **Description + hero** — one line on what the department does + a pixel-art hero image (brand, §9).
- **Agents** — the AI workers assigned here: a default department agent + **＋ New Agent** for custom
  ones. Each agent = goal + leash + voice + the tools/surfaces it can touch.
- **Space** — the department's **page/UI**: where its work lives and is viewed (§4). Built by / wired
  to its agent.
- **Tasks** — current and recent work owned by this department's agents (a queue/log).
- **Scratchpad** — files, notes, and **draft artifacts** the agents produce while working (documents,
  posts, invoices, a site draft).
- **Context** — the department's **knowledge**, shared with every agent in the group: facts + policy
  (its slice of the code of conduct), editable. E.g. Marketing: *"brand, content, SEO, demand gen."*

## 3. Lu — the orchestrator at the center

Lu is the top of the org chart and the way you drive the whole thing. You chat with Lu about the
company; she **plans, asks you questions, and delegates to department agents** (Cofounder's
center-node behavior). Lu is not one more agent — she's the conductor who routes work to departments
and brings their results back. Conversation is the default door; the canvas is where you see and tune
what she runs.

## 4. Spaces — the department UIs (where our built pages go)

A **space** is a department's working page. The surfaces we already built become spaces (reuse, not
waste):

| Department | Space (its page/UI) | Its agent does |
|---|---|---|
| **Sales** | Customers + leads + quotes pipeline | qualify, quote, chase a yes |
| **Operations** | Schedule / jobs / dispatch / routing | book, route, keep the calendar |
| **Finance** | Invoices + quotes + who-owes ledger | invoice + charge (Stripe/**AbacatePay** Pix/boleto) + collect |
| **Marketing** | Content + reviews + **sites** | post, run review waves, build pages |
| **Support** | The phone/text line + customer Q&A inbox | answer, book, escalate (the Receptionist = Lu on the line) |
| **Legal** | Contracts & docs | draft, review, e-sign |
| **Engineering** | Tools / sites / integrations it builds | build + maintain (light for most service businesses) |
| **Design** | Assets, wireframes, brand | produce visuals/on-brand artifacts |

Money is **no longer a page** — it's the **Finance department** (agent + ledger space + payment-page
artifacts). That's the "make Money an agent" question, resolved.

## 5. Agents act — and emit artifacts

An agent isn't just a background worker: it **does work** (invoice, post, chase, answer) **and produces
artifacts that land in other spaces** — a Finance agent spins a **payment-page site** + an "Outstanding"
**widget**; a Marketing agent builds a **landing page** + schedules posts. So **Sites and the Home
overview are canvases agents paint on**, and "what an agent may create/touch" is part of its leash
(the org-chart permission model). Adding capability = **adding an agent to a department**, set up in a
two-panel Lu conversation (reuses the hire flow we built).

## 6. Top-level tabs (the right-dock header)

Like Cofounder: **Home · Lu · Company · Tasks · Library**.

- **Home** — the overview: "Needs you" + a glance (our widget dashboard folds in here).
- **Lu** — the orchestrator chat.
- **Company** — company-wide profile + **shared data** every department uses (Customers/contacts,
  the business, the **root code of conduct**). The stable data layer under the departments.
- **Tasks** — every task across all departments.
- **Library** — reusable **presets**: agents, spaces, artifact templates you install into a department.

## 7. Context / code of conduct — company root + per-department

Two levels: a **company root** (facts + global policy, on the Company tab) and a **per-department
Context** (what that group's agents know + how they act). Every setup conversation and correction
writes into the right level. This is the moat — the longer it runs, the more each department knows how
*you* work.

## 8. ICP note (eyes open)

Fixing the eight departments to Cofounder's startup org chart **broadens us from service-business
vertical toward "any company"** — competing nearer Cofounder. The wedge stays service businesses (the
agents/spaces ship pre-wired for their world — Finance knows Pix/boleto, Ops knows job routing), but
the shell is now company-generic. For a solo/service business, startup-flavored departments
(Engineering/Design/Legal) may sit light or empty until relevant — that's acceptable; they're present
for everyone, filled on demand.

## 9. Brand

**Lu Computer** (kiwi dropped), **pixel-art** direction à la cofounder.co — 16-bit department hero
scenes (port for Ops, server room for Eng, painter for Design, Times Square for Marketing, trading
floor for Sales) + glass UI + a serif wordmark. Pixel assets via the Higgsfield MCP. See
`brand-lu-computer` (memory).

## 10. What reuses from the current build

The six-surface app we just shipped becomes the **spaces**; almost nothing is wasted:

- **`TeamGraph` pan/zoom canvas** → the department radial canvas.
- **Surface pages** (Customers/Schedule/Money/Reviews/Content/Sites/Receptionist) → **department spaces**.
- **Agent hire flow** (`AppSetup`/`/api/agent-setup/chat`) → **＋ New Agent** in a department.
- **Widget dashboard** → the **Home** tab.
- **`OrgProfile` + code of conduct** → **Context** (company root + per-department).
- **Needs-you** → Home overview.

## 11. Net-new to build (the shell)

The **canvas home** (Lu-center radial graph + spoke nodes), the **department dock** (Agents / Space /
Tasks / Scratchpad / Context sections), the **Lu orchestrator** chat + delegation, a **Tasks** model,
a **Scratchpad/artifacts** store, and the **Company** shared-data layer. Then re-slot each built
surface as its department's space.

## 12. Open questions

1. **Solo-business heaviness** — do all 8 departments show day one, or do the startup-flavored ones
   (Eng/Design/Legal) appear only when relevant?
2. **Customers home** — Company-level shared data, or owned by Sales and shared? (lean: Company.)
3. **Tasks & Scratchpad depth** — real task queue + artifact store now, or stubbed first?
4. **Onboarding** — Lu interviews you (Cofounder's "Ask User Question") to stand up the departments +
   seed each Context, then drops you on the canvas.

## 13. One line

**Lu Computer is the AI company you run: Lu at the center, a canvas of departments around her, each an
agent with its own space, work, and knowledge.**
