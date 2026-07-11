# Lead Answered — Feature Map & Foundation

> **Purpose.** The master inventory of *every* feature Lead Answered will have — the bridge between
> what the landing page now promises (the full **"AI operating system for service businesses"**) and
> what's actually built today (**SMS lead-response + qualification + booking**). Each feature here is
> scoped to become its own **development plan**. Status-tagged and dependency-ordered.
>
> Companion docs: `SCOPE.md` (system spec + architecture), `AGENT_WORKFLOWS_PLAN.md` (Sarah's
> workflows + locked copy), `TRAVEL_ROUTING.md`, `GOOGLE_CALENDAR.md`, `TESTING.md`, `DEPLOY.md`,
> and `landing-page/REBRAND-PLAN.md` (the marketed vision).

**Status legend:** ✅ built & live · 🟡 partial / seam exists · ⬜ planned (marketed, not built)

---

## 1. The product in one frame

- **Sarah** is the interface to *everything*. A provider-agnostic, tool-using agent (Vercel AI SDK)
  reachable by **SMS** (customers, the owner, and the crew) and — increasingly — **in the app**. She's
  both **customer-facing** (answers/qualifies/books leads) and **owner-facing** (the owner texts her to
  run the business). Every business decision lives in deterministic **tools**, never the model's word.
- **The app** (`app.leadanswered.com`) — everything Sarah does is also visible/controllable in a
  dashboard. Today it's onboarding + admin; the **owner dashboard is the next big surface**.
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

## 3. How to read the inventory

Features are grouped by the landing page's four pillars, preceded by the **Platform** layer everything
depends on. Each entry: **status** · what it is · the **Sarah/app** interaction · **needs** (new data
model / tools / integrations) · rough **size**. Sizes: S (days), M (1–2 wk), L (3–6 wk), XL (quarter).

---

## 4. Feature inventory

### Pillar 0 — Platform (the foundation every module rides on)

| Feature | Status | What it is / notes |
|---|---|---|
| **Sarah agent core** | ✅ | Tool-using, provider-agnostic conversation engine. New modules = new **tools**, not new engines. |
| **Multi-tenant + auth** | ✅ 🟡 | `Organization` tenancy + invite-only auth. ⬜ **Self-serve signup** (needed once we're not hand-onboarding every partner). |
| **The app / owner dashboard** | 🟡 | Web app exists (onboarding/admin). ⬜ The **dashboard** — the home surface for leads, calendar, and every module below. *This is the keystone; most modules need a screen here.* **(L)** |
| **Onboarding / done-for-you setup** | ✅ 🟡 | Onboarding flow exists. Extend per new module (import, website, review campaign) — the "we set it up for you" promise. |
| **Billing & subscriptions** | ⬜ | Design partners are free now; "founder pricing later." Needs Stripe + plan/usage model. Gate: first paid conversion. **(M)** |
| **Team accounts + permissions** | ⬜ | Marketed "Your team" — crew texts Sarah / uses the app with scoped permissions. Needs a `User`↔`Organization` role model. **(M)** |
| **Product analytics (the app)** | ⬜ | PostHog is live on the **marketing** site; instrument the **app** for usage/funnels too. **(S)** |
| **Notifications & comms infra** | ✅ | SMS/email senders, recipients, subscriptions. Reused by every module that messages someone. |

### Pillar 1 — Get Found

| Feature | Status | What it is / notes |
|---|---|---|
| **Website builder** | ⬜ | A fast, modern site built fresh per client; every lead flows straight to Sarah. Big: templating + hosting + per-client content + form→intake wiring. *"First, we build your website"* — the literal first promise. **(XL)** |
| **SEO & AI search** | ⬜ | Optimize each client site to rank on Google **and** surface in AI answers (ChatGPT/LLMs). Structured data, content, llms.txt, GBP hooks. Depends on Website. **(L)** |
| **Blog posts** | ⬜ | Owner texts Sarah job photos → she writes a post → publishes to the client site. Content-gen + the site's CMS. Depends on Website. **(M)** |
| **Social posting** | ⬜ | Sarah cross-posts to Facebook (later IG/GBP). Meta API + scheduling. Depends on Blog/content. **(M)** |

### Pillar 2 — Win the Work

| Feature | Status | What it is / notes |
|---|---|---|
| **Lead response** | ✅ | The built core — 60-second text-back, qualify, book. |
| **Quotes** | ⬜ | Draft + send quotes by text (*"Quote the Miller job — full replacement"*). Needs `Quote` model, line items, a send/track flow, an accept action for the customer. **(L)** |
| **Scheduling** | ✅ 🟡 | ✅ booking/availability/reschedule/cancel. 🟡 **travel-time routing** (`TRAVEL_ROUTING.md`) and 🟡 **Google Calendar sync** (`GOOGLE_CALENDAR.md`, adapter seam ready) — finish these two. **(M each)** |

### Pillar 3 — Get Paid & Grow

| Feature | Status | What it is / notes |
|---|---|---|
| **Reviews — reactivation campaign** | ⬜ | **The day-one ROI the whole pitch rests on.** Import past customers → Sarah texts each with the owner's photo + a review link → wave of 5-star reviews week one. Needs: customer import, review-link/GBP integration, a campaign/sequence engine, opt-out/compliance. **(L)** |
| **Invoicing** | ⬜ | Send + track invoices by text; mark paid. Needs `Invoice` model + a payments rail (Stripe / QuickBooks). Pairs with Quotes. **(L)** |
| **Follow-ups** | 🟡 | ✅ quiet-**lead** nudge exists. ⬜ Generalize to chase quiet **quotes/invoices/estimates** on a schedule. Depends on Quotes/Invoicing. **(M)** |

### Pillar 4 — Runs It All

| Feature | Status | What it is / notes |
|---|---|---|
| **CRM** | 🟡 | ✅ `Lead`/`Conversation`/`Appointment` data exists. ⬜ A real **customer** entity (distinct from a lead), a unified contact timeline, and a CRM surface in the app. Foundational for reviews/import/quotes. **(L)** |
| **Data import** | ⬜ | Bring the owner's customer list in (CSV / QuickBooks / Jobber export); Sarah reads it and "knows the business day one." Prereq for the reviews campaign + CRM. **(M)** |
| **Analytics dashboard** | ⬜ | Every visit, call, lead, quote, and booking in one place for the owner. In-app reporting on the CRM/event data. **(M)** |
| **Team** | ⬜ | (See Platform → Team accounts.) The crew texts Sarah / uses the app with permissions. |

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

1. **Owner dashboard (Phase 4)** — the home for leads + calendar + everything after. *In progress / next.*
2. **Finish Scheduling** — travel-time routing + Google Calendar sync (seams already exist; near-term wins).
3. **Data import → CRM customer entity** — the substrate the growth modules need.
4. **Reviews reactivation campaign** — deliver the **"paid for itself before you pay us"** day-one ROI. *Highest-leverage new module — it's the core of the pitch.*
5. **Website builder → SEO** — *"first, we build your website"* (the first thing we promise; also feeds Blog/Social + SEO/AI-search).
6. **Quotes → Invoicing → Follow-ups** — win-work → get-paid loop.
7. **Blog → Social** — the content engine (on top of Website).
8. **Analytics + Team + self-serve signup + Billing** — the "runs it all" + productization layer, timed to converting design partners to paid.

> Discipline (per `playbook/06-discipline.md`): **don't build ahead of a design partner who wants it.**
> Each module ships when a partner on a weekly call is pulling for it — the plan below is the map, not a
> mandate to build it all at once.

---

## 7. Next step

For each feature above we'll write a dedicated **development plan** — data model, agent tools, app UI,
integrations, edge cases, testing (extend the Tier-B suite), and rollout. Recommended first plan:
**the Reviews reactivation campaign** (highest sales leverage) *or* whichever the current design-partner
conversations are pulling toward. Tell me which and I'll draft it.
