# The Department-as-App

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md), [cockpit.md](./cockpit.md),
> [byo-connect.md](./byo-connect.md), [DESIGN-SYSTEM](./design-system.md). This defines what a
> **department** actually *is* as a product surface. It extends the cockpit: the department is no longer a
> thin "workplace + tasks" panel — it's **the agent's own app**, a self-contained module with a managed
> backend, its applications, and a workspace.

## The model

**Each agent is a department, and each department is "the agent's app."** On the canvas it is **two
depth-cards, side by side**:

- **The Department card** (left) — a **Home ⇄ Database-view** toggle (the top-right switcher):
  - **Home** — lists the **applications (sites)** this agent has built (each row: name, a page/app label,
    "Last updated", a **Staging / Live** status, and open).
  - **Database view** — a **mirror-with-key-actions** of the department's own **managed Supabase project**
    (Database · Migrations · Storage · Authentication · Users · Secrets · Logs · Suggestions).
- **The Workplace card** (right) — the live site(s) it's building **right now**, with the task selector at
  the top + the **Publish to Staging / Revert All / Request changes** controls.

Both are **depth-cards** (the dev/design design language), sitting **side by side** and connected on the
canvas — the Department (what it manages + has shipped) next to the Workplace (what it's building). The
**frame is generic** — every department is this Department-card + Workplace-card pair — but **each
department specializes** what fills them. This spec defines the generic frame + the **Engineering**
department concretely; other departments (Design, Finance, …) come later.

## Where the backend comes from

The console's "Database view" **is the company's single managed Supabase project** — the one the owner
connects in [BYO](./byo-connect.md) — shown as the **Engineering** department's console (Engineering owns
the backend; **decision A** below). The Engineer builds every department's sites *into* that one project; a
department's Home lists the sites it owns; the Workplace shows the active build. So the department-as-app is
the product face of the BYO connection, anchored to Engineering.

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

## Reference: how cofounder actually does it (from the crawl) + our deltas

The crawl of cofounder.co docs + the Supabase case study confirmed the model and surfaced where **our
design intentionally diverges**:

- **Managed backend is PER-COMPANY, not per-department (cofounder).** cofounder provisions **one** dedicated
  Supabase project + **two** GitHub repos (`app` + `marketing`) + **two** Vercel projects per *customer*,
  **anchored to Engineering and consumed by every department**. The full Database/Auth/Users/Storage/Logs/
  Advisors surface exists because that one project is real — the customer can drop into the actual Supabase
  dashboard. cofounder's *own* per-department UI is lighter (a Database *viewer* artifact + repo-based
  migrations + Settings-level secrets). **So the per-department console this spec describes is an expansion
  beyond cofounder** — see "the one decision" below.
- **The department surface (cofounder)** = Agents · Tasks · Context · Rules · Artifacts (staging URLs =
  "sites built"; the live task tracker = "workplace"). Our **Home ⇄ Database-view + Workplace** is our own,
  sharper framing of the same concepts.
- **Publish flow = two-stage, human-gated at each hop:** sandbox → **staging** ("Publish to Preview") →
  **production** ("Publish" button). Only two envs (staging + production); "preview" = the deploy that lands
  on staging. Migrations apply on the staging path at publish-to-staging, the prod path at publish-to-prod.
  This is exactly the **Publish to Staging / Revert All / Request changes** control in the Workplace.
- **Roadmap mechanic** (drives the dock Home's %): **Stages** (idea → setup → identity → build → GTM →
  launch → scale → mature) › **Tracks** (product/eng/brand/research/ops/revenue/support) › **Steps**
  (Available / In-Progress / Completed / **Locked**). Steps auto-complete as the workspace changes; a
  "Suggested Next" list is derived from it. Task labels: "Agent can do this / Needs your input / Needs
  earlier steps first."
- **Secrets are BROKERED, never stored** — agents get **placeholders**; the trusted backend swaps the real
  credential in at the outbound request. Ties directly to our BYO/secrets model (store encrypted, inject at
  call time; never hand the raw token to the model). Worth mirroring.
- **Migration safety gates** (cofounder's real "advisors"): agents can't run a migration via a tool call —
  every schema change is a PR; a lint **blocks any table without RLS**; a lint **blocks deleting old
  migrations**. Adopt these for our Engineer.
- **Project graduation** — the customer can graduate and keep the Supabase project (+ GitHub collaborator +
  Vercel invite) and own the whole stack. Our BYO already puts it in their account, so we're graduated by
  default.

## Decision (locked): one shared backend, Engineering-anchored — (A)

The backend model is settled: **(A) one shared managed Supabase project per company, owned by Engineering.**
Every other department is an app/site the Engineer builds into it, with its own Home + Workplace pointing at
the shared backend — cofounder-proven, cheaper (one project), and the cross-wiring ("Design's site built by
the Engineer") falls out naturally. Revisit (B) only if a department ever needs an isolated backend. The two
options for the record:

- **(A) One shared managed backend, Engineering-anchored** (cofounder's proven model). The Database-view
  console is the *company's* app backend, shown under Engineering; other departments own their **sites**
  (built by the Engineer) but consume the one backend. Cheaper (1 Supabase project), simpler, proven.
- **(B) Per-department app + backend** (your screenshots' implication). Each agent's department is a fully
  independent app with its **own** Supabase project/console. Richer + matches "each agent has its own app,"
  but N projects = more cost + provisioning + the "design site is built by the Engineer" cross-wiring gets
  more complex (whose project does it deploy to?).

**Recommendation:** start **(A)** — Engineering owns the one managed backend + console; every other
department is an **app/site the Engineer builds** into it (Design's marketing site, etc.), with its own
Home + Workplace but *pointing at* the shared backend. It's cofounder-proven, cheaper, and the cross-wiring
("Design's site built by Engineer") falls out naturally. We can graduate to (B) if a department genuinely
needs an isolated backend.

## Open questions (smaller)

- **Mirror depth:** start read-heavy + the handful of key actions in the console table; expand as needed.
- **Repos:** cofounder uses two (`app` + `marketing`); we currently make one repo per site. Decide whether
  to consolidate to app+marketing or keep repo-per-site.
