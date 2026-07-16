# The Department-as-App

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md), [cockpit.md](./cockpit.md),
> [byo-connect.md](./byo-connect.md), [DESIGN-SYSTEM](./design-system.md). This defines what a
> **department** actually *is* as a product surface. It extends the cockpit: the department is no longer a
> thin "workplace + tasks" panel — it's **the agent's own app**, a self-contained module with a managed
> backend, its applications, and a workspace.

## The model

**Each agent is a department, and each department is "the agent's app."** It is a self-contained module
with three faces:

1. **Home** — lists the **applications (sites)** this agent has built.
2. **The console (Database view)** — a **mirror-with-key-actions** of the department's own **managed
   Supabase project**: Database · Migrations · Storage · Authentication · Users · Secrets · Logs ·
   Suggestions.
3. **The Workplace** — the live site(s) it's building right now, with the task selector + **Publish to
   Staging / Revert / Request changes** controls.

The whole department renders as a **depth-card** (the dev/design design language). The **frame is generic**
— every department has these three faces — but **each department specializes** what fills them. This spec
defines the generic frame + the **Engineering** department concretely; other departments (Design, Finance,
…) come later.

## Where the backend comes from

The console's "Database view" **is the department's own managed Supabase project** — the one the owner
connects in [BYO](./byo-connect.md). Each department's app runs on a Supabase project; the Engineer builds
sites *into* it; Home lists those sites; the Workplace shows the active build. So the department-as-app is
the product face of the BYO connection.

**Data sources for the mirror** (all reachable via the stored BYO Supabase credentials — a project ref +
keys):
- **Supabase Management API** (`api.supabase.com`) — project-level: API keys, auth config, migration
  history, logs, advisors.
- **The project's own APIs** (using its service role key) — table data, storage buckets, auth users.

"**Mirror**" = we render this in our depth-card UI (not an embedded Supabase iframe). "**Key actions**" =
the few high-value mutations per tab, not full dashboard parity.

## The console — every tab (data source · mirror · key actions)

Header: department name ("Engineering Department") + the project handle (e.g. `lucomputer-ffaa25`) + a
**Home / Database-view** toggle.

| Tab | Mirror (read) | Key actions | Source |
|---|---|---|---|
| **Database** | tables across schemas + row browser + a "Query your database" box | run a read query; (row edits later) | project Postgres / PostgREST (service key) |
| **Migrations** | applied migration history (version + name) | — (read-only) | Management API / `_prisma_migrations`-style table |
| **Storage** | buckets + files ("No storage buckets" empty state) | create bucket; upload file | project Storage API |
| **Authentication** | general settings (Disable signup, Allow anonymous), Application URLs + redirect URLs, sign-in methods (Email/Phone/Google) | toggle signup/anon; add a redirect URL; enable a provider | Management API (auth config) |
| **Users** | signups-over-time chart + recent users | add user | project Auth admin API |
| **Secrets** | project URL + publishable key (visible); secret key (not-generated state) | **generate / rotate / revoke** the secret key | Management API (API keys) |
| **Logs** | function/edge logs ("No logs found" empty state), log-type selector | — (read-only) | Management API (logs) |
| **Suggestions** | advisors — security + performance (e.g. "Unused Index", "RLS Enabled No Policy") with INFO/severity tags | (apply / dismiss later) | Management API (advisors) |

Every tab has an **honest-empty** state (matching the screenshots: "No storage buckets", "No logs found",
"The query returned no results") — a fresh department's project is genuinely empty.

## Home — the applications list

Lists every **site/app** this department has built (from the `Site` table, scoped to the department):
name, URL/host, status pill (Building / Preview / Live), repo, last deploy. This is "everything the
Engineer has shipped." Empty state when nothing's built yet.

## The Workplace — what it's building now

The live workspace (from [cockpit.md](./cockpit.md) Part D, extended):
- The **live preview** of the site(s) currently in progress (iframe — a dev URL like `localhost:3001` or
  the Vercel preview), with a page/route selector ("Viewing landing page").
- A **task selector** at the top ("Engineer / Build marketing website MVP") + the task's status pill
  ("Requires Approval").
- **Publish controls**: **Publish to Staging · Revert All · Request changes** (wired to the real approval
  + deploy flow — `request_publish` / `confirmPublish`).
- One **or many** sites — the Engineer may be building several at once; the workplace tabs/stacks them.

Home = *what it has shipped*; Workplace = *what it's building*; Console = *the backend it all runs on*.

## The generic frame + specialization + cross-department links

- **Generic frame:** Home · Console (Database view) · Workplace, in the depth-card chrome. Every department
  has it.
- **Specialization:** each department fills the frame with its own domain. **Engineer** = sites/apps +
  code (the flagship, fully specified here). **Design** (later) = the marketing website + brand assets.
  **Finance** = invoices/ledger, etc.
- **Cross-department:** a department can *own* a deliverable that another department *builds*. The **Design**
  department's marketing website is **generated by the Engineer** — Design owns/curates it; the Engineer
  builds it. Model this as: a `Site` belongs to a department, but its build is dispatched to the Engineer
  (a task with `departmentKey = "design"`, built via the Engineering agent). Departments connect the same
  way canvas resources connect to agents (cockpit.md) — via the orchestrator + edges.

## The dock (company-level, around the departments)

Cofounder-structured tabs (replacing the cockpit's `home·lu·tasks`):
- **Home** — greeting ("Good afternoon, Gabriel") + **Roadmap %** hero + **Tasks** (with
  Needs-Clarification / Requires-Approval badges) + **Suggested Next**.
- **Lu** — the orchestrator chat (the [cockpit](./cockpit.md) build-tracker lives here).
- **Company** — the org-level view: **Stack** (Domain / Email / Payment / Hosting — each a Setup/connected
  row) · **Important links** (App, Marketing Website — source + deployment) · **Agents** (the list + ＋ New).
- **Tasks** — all tasks + ＋ New task.
- **Library** — files/folders (grid/list) + "**bring over ChatGPT/Claude context**" Markdown import.

## Data model additions (over what exists)

- **Department ↔ managed project:** store the department's Supabase project ref + keys (extend
  `VercelConnection`/a new `SupabaseConnection`, or a `Department.projectRef`). The console reads this.
- **`Site.departmentKey`** (which department owns the site) + a "built-by" pointer (usually Engineering).
- Everything else (Task, Artifact, Approval, Deployment, Session, CanvasNode/Edge) already exists.

## Build order (spec-first; not yet built)

1. **The department-as-app frame** — depth-card shell + the Home / Console / Workplace tabs (the Engineer
   department first).
2. **The console** — wire each tab to the Supabase Management API + project APIs (mirror + key actions),
   starting **Database · Migrations · Secrets**, then Auth · Users · Storage · Logs · Suggestions.
3. **Home** — list the department's `Site`s.
4. **Workplace** — the live preview + task selector + publish controls (extend the cockpit workplace).
5. **The dock** — the cofounder tab structure (Company Stack + Library).
6. **Cross-department deliverables** (Design's site built by the Engineer) — later.

## Open questions

- **Per-department vs per-org project:** the screenshots show ONE Supabase project for the Engineering
  Department (`lucomputer-ffaa25`). v0: **one managed project per department** (the Engineer's app). Whether
  every department gets its own project or some share the org's project is TBD — spec the Engineer with one.
- **Mirror depth:** start read-heavy + the handful of key actions in the table; expand actions as needed.
