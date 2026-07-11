# App UI — Master Plan (docs → review → code)

> **Process.** We spec the ENTIRE app UI in docs before writing code. One spec doc per module,
> in `platform/app-ui/`. Levi reviews/edits each spec; **code is written only when Levi explicitly
> says so.** Specs follow the template in §4 so multiple agents can write/implement them in parallel.
>
> Companion docs: `FEATURES.md` (feature inventory + dependencies), `SCOPE.md` (system spec),
> `landing-page/REBRAND-PLAN.md` (**the product definition — the app must make this literal**).

---

## 1. The frame (get this right or the spec is wrong)

- **The app is the AI operating system for service businesses** — the in-app twin of everything
  Sarah does by text. It is NOT an evolution of the current five screens. The current app
  (Overview / Leads / Appointments / Settings) is the seed, not the shape.
- **The page map mirrors what we sell.** A design partner was sold four pillars of modules
  (REBRAND-PLAN §3.4); when they log in, they must see those same modules. But the pillar
  phrases are landing-page copy only — **the app nav renders NO group labels**: unlabeled
  clusters separated by spacing (pipeline · marketing · business, per `app-ui/00-foundation.md` §2).
- **Sarah is the interface to everything.** Every module = things Sarah does that the owner can
  see/approve/adjust in the app. Every screen answers: what did Sarah do, what does she need from
  me, what can I ask her to do next.
- **Sarah is everywhere: a persistent chat widget** (Apollo/Intercom-style launcher, bottom-right)
  on every page of the app — open it on Settings and ask "do I have anything Thursday?" or "quote
  the Miller job." Same conversation as her SMS thread and her dedicated page, context-aware of
  the page you're on. The widget lives in the app shell (spec: `00-foundation.md`); the dedicated
  page (`02-sarah.md`) is the full-screen version + activity + approvals.
- **"We set it up for you."** Screens read as already-configured and running — never as empty
  build-it-yourself tools. Empty states say what Sarah/we will do, not "create your first X."
- **Word choice: "app," never "dashboard"** (REBRAND-PLAN product truths).
- **There is no Leads page.** Leads and customers are one CRM — "every lead and customer,
  organized and worked automatically." The SMS thread, quotes, invoices, appointments, and reviews
  for a contact all live on one unified contact timeline inside CRM.

## 2. The page map (the app's modules)

| Nav cluster (internal — never rendered) | Page | What it is | Fronts (FEATURES.md) | Today |
|---|---|---|---|---|
| — | **Home** | The OS home: what Sarah did today, needs-your-attention (approvals, escalations), the day's schedule, headline numbers | Platform/dashboard | Overview page (reshape) |
| — | **Sarah** | The assistant, in-app: full-screen chat (same brain as SMS + the global widget); her activity log; pending approvals (the hard-gate drafts: quotes, review asks, posts, customer messages) | Sarah agent core | doesn't exist |
| — | **Sarah widget** | Persistent launcher on EVERY page (Apollo-style, bottom-right): ask anything without leaving the screen; knows what page you're on; hands off to the full page for long threads/approvals | Sarah agent core | doesn't exist |
| marketing | **Website** | The client's site, live in-app — and built on Lovable-style: Sarah chat beside a live draft preview, describe a change → watch it → Publish; version history; plus SEO & AI-search visibility (rankings, what ChatGPT says) | Website builder, SEO & AI search | doesn't exist |
| marketing | **Content** | Blog posts + social: drafts Sarah wrote from job photos → approve → published/posted | Blog posts, Social posting | doesn't exist |
| pipeline | **CRM** | Every lead + customer: pipeline (new → qualifying → booked → job → paid), contact detail = unified timeline (SMS thread, appointments, quotes, invoices, reviews), import ("Your history" — CSV/QuickBooks/Jobber) | CRM, Lead response, Data import | Leads + lead detail (absorbed) |
| pipeline | **Quotes** | Draft/send/track/accept — incl. the ones Sarah drafted by text | Quotes | doesn't exist |
| pipeline | **Schedule** | ONE calendar: estimates + jobs, drive-time-routed, reschedule/cancel; availability lives here | Scheduling, Travel routing, Google Calendar | Appointments lists (reshape) |
| pipeline | **Invoices** | Send/track/mark-paid by text | Invoicing | doesn't exist |
| marketing | **Reviews** | The reactivation campaign (import → owner-photo ask → wave of 5-stars) + ongoing per-job asks; results wall | Reviews campaign | doesn't exist |
| pipeline | **Follow-ups** | What Sarah is chasing (quiet leads, quotes, invoices) and the rules for it | Follow-ups | doesn't exist |
| business | **Analytics** | Every visit, call, lead, quote, booking, review — the ROI numbers | Analytics | doesn't exist |
| business | **Team** | Crew members, what each can text Sarah / see in the app | Team accounts | doesn't exist |
| — | **Settings** | Business profile, service area, Sarah persona, notifications, your line, billing (later) | Platform | Settings (reshape) |

(`/admin` stays as-is — internal, not part of this pass.)

## 3. Spec docs to write (`platform/app-ui/`)

`00-foundation.md` first — app shell + nav (unlabeled clusters, module gating live/preview/coming-soon),
**the global Sarah chat widget** (launcher, panel, page-context, handoff to the full page), typed
data layer with the mock↔real seam, ui-kit additions (dialog, dropdown, select, tabs, toast,
popover, date-picker, avatar, charts), shared patterns (PageHeader, DataTable, states), route
structure (`/dashboard/*` → module routes). Then one doc per §2 page (`01-home.md`, `02-sarah.md`,
`03-website.md`, `04-content.md`, `05-crm.md`, `06-quotes.md`, `07-schedule.md`, `08-invoices.md`,
`09-reviews.md`, `10-followups.md`, `11-analytics.md`, `12-team.md`, `13-settings.md`) — any order,
parallelizable.

## 4. Spec template (every doc uses exactly this structure)

1. **Purpose** — the screen's job in one paragraph; which module it fronts and the sales promise it makes literal.
2. **Layout** — regions, described or ASCII-sketched; mobile behavior.
3. **Sarah** — how the assistant shows up here: what she did, what she's asking approval for, what you can tell her to do. (First, not last — this is the product.)
4. **Data contract** — the TypeScript types the screen consumes (becomes the mock fixtures AND the backend's read model).
5. **Actions** — every mutation: server action vs api call, what involves Sarah's engine.
6. **Components** — ui-kit pieces used; flag any missing from the kit.
7. **States** — gated (preview/coming-soon) / running-with-no-data-yet ("we're setting this up") / error. Never build-it-yourself empty states.
8. **Open questions** — only decisions that change the build.

## 5. After specs are approved

Code only on Levi's explicit go, on branch `app-ui`: foundation first, then modules — screens with
real data behind them (Home, CRM, Schedule, Settings) wire to it; everything else runs on the mock
seam until its backend ships per its own FEATURES.md development plan.
