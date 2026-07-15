# Lead Answered — Feature Map & Foundation

> **Purpose.** The master inventory of *every* feature Lead Answered will have — the bridge between
> what the landing page now promises (the full **"AI operating system for service businesses"**) and
> what's actually built today (**SMS lead-response + qualification + booking**). Each feature here is
> scoped to become its own **development plan**. Status-tagged and dependency-ordered.
>
> **Nav/product model (authoritative): `PLATFORM-VISION.md`.** The final product is **one assistant
> (Lu) + a fixed set of surfaces, identical for every business** — **Dashboard · Lu · Customers ·
> Schedule · Money · Team · Agents · Sites · Settings** — with per-business adaptation *inside* the
> surfaces and a customizable **Dashboard widget board**. This doc maps every feature onto those
> surfaces (§2.5). *(The features are the same; the nav that houses them is these fixed surfaces — not
> a per-module app store.)*
>
> Companion docs: `PLATFORM-VISION.md` (the surface model), `SCOPE.md` (system spec + architecture),
> `AGENT_WORKFLOWS_PLAN.md` (Lu's workflows + locked copy), `TRAVEL_ROUTING.md`, `GOOGLE_CALENDAR.md`,
> `TESTING.md`, `DEPLOY.md`, and `landing-page/REBRAND-PLAN.md` (the marketed vision).

**Status legend:** ✅ built & live · 🟡 partial / seam exists · ⬜ planned (marketed, not built)

---

## 1. The product in one frame

- **Lu** (the assistant; "Sarah" in older built code/copy) is the interface to *everything*. A
  provider-agnostic, tool-using agent (Vercel AI SDK) reachable by **SMS** (customers, the owner, and
  the crew) and — increasingly — **in the app** (her own **Lu** surface). She's both **customer-facing**
  (answers/qualifies/books leads) and **owner-facing** (the owner texts her to run the business). Every
  business decision lives in deterministic **tools**, never the model's word.
- **The app** (`app.leadanswered.com`) — everything Lu does is also visible/controllable across the
  **fixed surfaces** (§2.5). Today it's onboarding + admin; the **Dashboard home** (pinned "Needs you"
  + a customizable widget board) is the next big surface.
- **Multi-tenant.** One row per business (`Organization`) with isolated data, its own number, timezone,
  standing availability, and config.
- **Stack** (see `DEPLOY.md`): `apps/api` + `apps/worker` + Redis on Railway, `apps/web` on Vercel,
  Postgres on Supabase, Twilio (SMS/MMS), Postmark (email), Langfuse (agent tracing). Auth = Supabase
  email+password, **invite-only**.

---

## 2. Current state — what's live today (the foundation)

Everything below is **built, tested (real-Postgres Tier-B suite), and deployed**:

- **Inbound intake** ✅ — website/email leads, **missed-call**, and **inbound SMS incl. MMS images**
  (Claude vision). Exactly-once webhook processing (idempotency on `Message.providerSid`).
- **Sarah — lead workflows** ✅ — deterministic **scripted intake** (locked copy) → open **tool-using
  agent** once booked/handed-off/declined. Tools: `qualify_lead` (captures name → `lead.contactName`),
  `check_availability`, `book_appointment`, `reschedule_appointment`, `cancel_appointment`,
  `escalate_to_organization`.
- **Booking / scheduling core** ✅ — availability from standing weekly windows minus busy, **DB-enforced
  no-double-booking** (`btree_gist` EXCLUDE), reschedule/cancel, timezone/DST-correct (luxon). Behind a
  `CalendarProvider` port (internal adapter today; Google Calendar is a future drop-in — seam exists).
- **Escalation + owner relay** ✅ — loop the owner in; the owner texts back and Sarah relays the answer
  in her own words.
- **Owner agent** ✅ — the owner directs Sarah ("text Levi we can start Monday") via `find_leads`
  + a **hard-gate send** (code sends only after the owner's explicit yes).
- **Quiet-lead nudge** ✅ — a delayed worker job re-pings leads that go quiet.
- **Onboarding + admin** ✅, **notifications** (SMS/email senders) ✅, **auth** (invite-only) ✅.
- **Data model** (Prisma): `Organization`, `Lead`, `Conversation`, `Message`, `Escalation`,
  `Appointment`, `CalendarConnection`, `Notification*`.

**Reality vs. marketing:** the site sells ~13 modules; **one of them (lead response) + scheduling is
what exists.** Everything in §4 below is the road from here to the full vision. That's the point of
this doc.

---

## 2.5 The surface map — where every feature lives

The features below are marketed as ~13 "modules," but they do **not** each get a nav tab. They land in
the **fixed surfaces** from `PLATFORM-VISION.md`. This is the nav, and what fills each surface:

| Surface | Kind | Features that live here |
|---|---|---|
| **Dashboard** | home | Pinned **"Needs you"** + a customizable **widget board**. **Analytics is here** — funnel / revenue / response-time / ROI are **report widgets**, *not* a page. Each surface declares its own glance-and-deep-link widgets. |
| **Lu** | assistant | The assistant surface + SMS. The Receptionist/lead-response core *is Lu answering the line.* |
| **Customers** | page | **CRM** (customer entity + timeline), **Data import**, custom fields. *(Was "CRM".)* |
| **Schedule** | page | **Scheduling** (booking/availability/reschedule/cancel), **travel routing**, **Google Calendar sync**. |
| **Money** | page | **Quotes** + **Invoicing** + who-owes-you, over **pluggable rails** (Stripe US / **AbacatePay** BR: Pix + boleto). One transactional page; we connect rails, never hold funds. |
| **Team** | page | **Team accounts + permissions** — the human crew, on a shared org chart with agents. |
| **Agents** | container + presets | **Receptionist** (lead response) · **Follow-ups** · **Reviews** · **Content** (Blog/Social). Each hired agent = goal + leash + voice + detail surface; agents sit on the org chart next to humans. |
| **Sites** | container + presets | **Website builder** (multi-site: Marketing / Booking / Blog / Portal, per-site builder), **SEO/AI-search**. *(Website → Sites.)* |
| **Settings** | page | Accounts, connections, the **code of conduct**, billing, plumbing. |

**Key re-slots from the old per-module framing:**
- **CRM → Customers**, **Website → Sites** (full multi-site), **Analytics page → Dashboard report
  widgets** (no standalone Analytics surface).
- **Quotes + Invoicing → Money** (one page, pluggable rails — not a processor we build).
- **Reviews, Content/Blog/Social, Follow-ups → Agents** (presets you hire, each with a leash).
- **Lead response → Agents (Receptionist) / Lu**; **Team accounts → Team surface** (humans + agents,
  one org chart).
- **Removed:** app store / Library / install-uninstall / per-app first-run / dynamic per-org nav.
  Everyone gets the same fixed nav; **New orgs are honest-empty.**

The **pillar grouping in §4 is a build/marketing lens** (Get Found / Win the Work / Get Paid / Runs It
All), kept for status tracking. The **surface map above is the nav.**

## 3. How to read the inventory

Features are grouped by the landing page's four pillars, preceded by the **Platform** layer everything
depends on. Each entry: **status** · what it is · the **Lu/app** interaction · **needs** (new data
model / tools / integrations) · rough **size** · **→ surface** it lands in. Sizes: S (days), M (1–2 wk),
L (3–6 wk), XL (quarter).

---

## 4. Feature inventory

### Pillar 0 — Platform (the foundation every module rides on)

| Feature | Status | What it is / notes |
|---|---|---|
| **Sarah agent core** | ✅ | Tool-using, provider-agnostic conversation engine. New modules = new **tools**, not new engines. |
| **Multi-tenant + auth** | ✅ 🟡 | `Organization` tenancy + invite-only auth. ⬜ **Self-serve signup** (needed once we're not hand-onboarding every partner). |
| **Dashboard (home)** | 🟡 | **→ Dashboard.** Web app exists (onboarding/admin). ⬜ The **home surface**: pinned **"Needs you"** + a customizable **widget board** (glance-and-deep-link tiles each surface declares). *Keystone — the home the surfaces report into.* **(L)** |
| **Onboarding / done-for-you setup** | ✅ 🟡 | **→ Lu / all surfaces.** Onboarding flow exists. Each surface set up in a Lu conversation that writes the **code of conduct**; skipped steps stay honest-empty as "Needs you" rows. |
| **Billing & subscriptions** | ⬜ | **→ Settings.** Design partners are free now; "founder pricing later." Needs a billing rail + plan/usage model. Gate: first paid conversion. **(M)** |
| **Team accounts + permissions** | ⬜ | **→ Team.** Marketed "Your team" — crew texts Lu / uses the app with scoped permissions; humans + agents on one org chart. Needs a `User`↔`Organization` role model. **(M)** |
| **Product analytics (the app)** | ⬜ | **→ Dashboard widgets.** PostHog is live on the **marketing** site; instrument the **app** for usage/funnels too. In-product reporting surfaces as **report widgets**, not a page. **(S)** |
| **Notifications & comms infra** | ✅ | SMS/email senders, recipients, subscriptions. Reused by every module that messages someone. |

### Pillar 1 — Get Found

| Feature | Status | What it is / notes |
|---|---|---|
| **Website builder** | ⬜ | **→ Sites.** Full **multi-site** — sites spun from presets (Marketing / Booking / Blog / Portal), per-site builder; every lead flows straight to Lu. Templating + hosting + per-site content + form→intake wiring. *"First, we build your website"* — the literal first promise. **(XL)** |
| **SEO & AI search** | ⬜ | **→ Sites.** Optimize each client site to rank on Google **and** surface in AI answers (ChatGPT/LLMs). Structured data, content, llms.txt, GBP hooks. Depends on Sites. **(L)** |
| **Blog posts** | ⬜ | **→ Agents (Content) + Sites.** Owner texts Lu job photos → the **Content agent** writes a post → publishes to a Blog site. Content-gen + the site's CMS. Depends on Sites. **(M)** |
| **Social posting** | ⬜ | **→ Agents (Content).** The Content agent cross-posts to Facebook (later IG/GBP). Meta API + scheduling. Depends on Blog/content. **(M)** |

### Pillar 2 — Win the Work

| Feature | Status | What it is / notes |
|---|---|---|
| **Lead response** | ✅ | **→ Agents (Receptionist) / Lu.** The built core — 60-second text-back, qualify, book. This preset *is* Lu answering the line. |
| **Quotes** | ⬜ | **→ Money.** Draft + send quotes by text (*"Quote the Miller job — full replacement"*); price bespoke quotes **with Lu** (her method → code of conduct). Needs `Quote` model, line items, send/track, a customer accept action. **(L)** |
| **Scheduling** | ✅ 🟡 | **→ Schedule.** ✅ booking/availability/reschedule/cancel. 🟡 **travel-time routing** (`TRAVEL_ROUTING.md`) and 🟡 **Google Calendar sync** (`GOOGLE_CALENDAR.md`, adapter seam ready) — finish these two. **(M each)** |

### Pillar 3 — Get Paid & Grow

| Feature | Status | What it is / notes |
|---|---|---|
| **Reviews — reactivation campaign** | ⬜ | **→ Agents (Reviews).** **The day-one ROI the whole pitch rests on.** Import past customers → the Reviews agent texts each with the owner's photo + a review link → wave of 5-star reviews week one. Needs: customer import, review-link/GBP integration, a campaign/sequence engine, opt-out/compliance. **(L)** |
| **Invoicing** | ⬜ | **→ Money.** Send + track invoices by text; mark paid. **Pluggable rails, not a processor we build** — Stripe (US) / **AbacatePay** (Brazil: Pix R$0,80 + boleto); webhook confirms → **auto-reconcile** → follow-ups stop. Funds land in the merchant's own account. Pairs with Quotes. **(L)** |
| **Follow-ups** | 🟡 | **→ Agents (Follow-ups).** ✅ quiet-**lead** nudge exists. ⬜ Generalize to chase quiet **quotes/invoices/estimates** on a schedule (stops on payment webhook). Depends on Quotes/Invoicing. **(M)** |

### Pillar 4 — Runs It All

| Feature | Status | What it is / notes |
|---|---|---|
| **CRM → Customers** | 🟡 | **→ Customers.** ✅ `Lead`/`Conversation`/`Appointment` data exists. ⬜ A real **customer** entity (distinct from a lead), a unified contact timeline, and the **Customers** surface. Foundational for reviews/import/quotes. **(L)** |
| **Data import** | ⬜ | **→ Customers.** Bring the owner's customer list in (CSV / QuickBooks / Jobber export); Lu reads it and "knows the business day one." Prereq for the reviews campaign + Customers. **(M)** |
| **Analytics → report widgets** | ⬜ | **→ Dashboard widgets (no page).** Every visit, call, lead, quote, and booking as **report widgets** on the Dashboard (funnel / revenue / response-time / ROI) — glance + deep-link into the owning surface. In-app reporting on the CRM/event data. **(M)** |
| **Team** | ⬜ | **→ Team.** (See Platform → Team accounts.) The crew texts Lu / uses the app with permissions; humans + agents share one org chart. |

---

## 5. Dependency map (what unblocks what)

```
Platform: Dashboard ──┬─────────────► every module needs a screen here
          Billing     │
          Team/auth   │
                      ▼
Data import ──► CRM (customer entity) ──► Reviews campaign  ◄── the day-one ROI promise
                                     └──► Analytics
Website ──► SEO ──► Blog ──► Social
Quotes ──► Invoicing ──► Follow-ups (generalized)
Scheduling(✅) ──► Travel routing / Google Calendar (finish)
```

Two things gate the most: the **owner dashboard** (the surface) and a **customer entity via import**
(the data the growth modules act on).

---

## 6. Recommended build sequence (tied to the sales promise)

The order that makes each step *sellable* and de-risks the pitch fastest:

1. **Dashboard home (Phase 4)** — the home surface (pinned "Needs you" + widget board) for leads, calendar, and everything after. *In progress / next.*
2. **Finish Scheduling** — travel-time routing + Google Calendar sync (seams already exist; near-term wins).
3. **Data import → CRM customer entity** — the substrate the growth modules need.
4. **Reviews reactivation campaign** — deliver the **"paid for itself before you pay us"** day-one ROI. *Highest-leverage new module — it's the core of the pitch.*
5. **Website builder → SEO** — *"first, we build your website"* (the first thing we promise; also feeds Blog/Social + SEO/AI-search).
6. **Quotes → Invoicing → Follow-ups** — win-work → get-paid loop.
7. **Blog → Social** — the content engine (on top of Website).
8. **Analytics (report widgets) + Team + self-serve signup + Billing** — the "runs it all" + productization layer, timed to converting design partners to paid.

> Discipline (per `playbook/06-discipline.md`): **don't build ahead of a design partner who wants it.**
> Each module ships when a partner on a weekly call is pulling for it — the plan below is the map, not a
> mandate to build it all at once.

---

## 7. Next step

For each feature above we'll write a dedicated **development plan** — data model, agent tools, app UI,
integrations, edge cases, testing (extend the Tier-B suite), and rollout. Recommended first plan:
**the Reviews reactivation campaign** (highest sales leverage) *or* whichever the current design-partner
conversations are pulling toward. Tell me which and I'll draft it.
