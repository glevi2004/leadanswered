# DOGFOOD — Lead Answered runs on Lead Answered

> Thinking doc (Levi + Claude, 2026-07-13). Not a spec — the picture of us as our own first
> customer: how we onboard ourselves, what our SERVICE CATALOG is, how quoting our services
> works in our own app, and which gaps our own usage turns into roadmap features. Companions:
> `FEATURES.md`, `app-ui/*` (the built UI), `../gtm/*`.

## 1. The thesis

Lead Answered is itself a service business. We sell a done-for-you setup, delivered as a
project, to customers who find us, ask questions, book a call, get a proposal, pay, and (we
hope) rave about us. That is EXACTLY the loop the product models:

    lead → qualify → book → do the job → invoice → review ask → follow-up on whatever stalls

So the dogfood mapping isn't a stretch — it's the same machine pointed at ourselves. And it's
already half-true: **Sarah already answers our own line** (+1 844 415-7642 — the "text Sarah"
GTM is the product running on us). Dogfooding completes the loop: our waitlist in our CRM, our
demos on our Schedule, our proposals in Quotes, our chases on the Follow-ups board.

Three payoffs:
1. **QA with stakes** — every rough edge costs US a deal first, before it costs a partner one.
2. **The best sales asset possible** — the demo stops being the Apex Roofing fixture and
   becomes: "this is our real app, running our real company. The pipeline you're looking at is
   how you got here." (Keep the Apex demo for anonymized walkthroughs; our real org is the
   closer.)
3. **Roadmap forced by real pain** — the gaps below aren't guesses; they're what we'll hit in
   week one.

## 2. Onboarding ourselves (the concrete steps)

1. Create org **Lead Answered**, owner Levi. Run our own wizard: business profile ("we set up
   an AI operating system for service businesses"), Sarah persona tuned for FOUNDERS AND
   CONTRACTORS (not homeowners), notification recipient = Levi's phone.
2. Line: already live (the assistant number). Landing-page CTA already points at it.
3. Availability: the hours Levi takes demo calls (Schedule → Availability drag grid).
4. CRM import: our real waitlist/lead CSV — the import wizard's first run with real stakes.
5. Reviews: connect our Google Business Profile; arm "after every job" (job = a completed
   partner onboarding) and plan wave #1 at existing happy design partners.
6. Follow-ups: nothing to configure — the quiet-lead nudge is already real in prod; the board
   arms itself as our pipeline moves.

## 3. The service catalog (what we actually sell, per customer)

The honest offer shape: **we have the tools, AND we drive them for you first.** The website
builder exists — and we build your first site with it. The review campaign machine exists —
and we run your first wave. That's not a contradiction; it's the product's own philosophy
("we set it up for you") applied by humans at onboarding, then handed to Sarah.

One-time services (the "job" of onboarding a partner):
| Service | What we deliver | Delivered WITH our own product? |
|---|---|---|
| **Platform setup** | Line provisioned, Sarah persona + qualification script tuned to their trade, hours/service area configured, notifications wired | the onboarding wizard |
| **First website build** | We build v1 in the builder — their branding, services, photos; they take over by texting Sarah changes | the website builder (03) |
| **History import** | Their QuickBooks/Jobber/CSV cleaned and imported; Sarah "knows the business day one" | the CRM import wizard (05) |
| **First review campaign** | Audience built from their history, ask written in their voice, wave paced and run to done | the Reviews wizard (09) |
| **Google Business Profile** | Claimed/connected, categories + photos fixed, review link wired | settings + reviews plumbing |
| **Content starter** | First 2–3 posts/case studies drafted from their real jobs | the Content module (04) |

Recurring (the subscription): Sarah answering the line 24/7 · follow-up chases · website
hosting + edits by text · ongoing review asks · the app itself.

**Why this matters for the Quotes module (06, unbuilt):** OUR OWN first quote is the perfect
stress test of its data model. A Lead Answered proposal is line items mixing **one-time
services + a recurring subscription** — e.g. Setup $X + First website $Y + Review wave $Z,
then $N/mo. Today's spec'd `Quote` is one-shot line items only. So quoting ourselves forces:
line items with a `recurring?: monthly` flag, and a customer-facing accept page that shows
"due now" vs "monthly from launch" clearly. Design 06 with our own proposal as fixture #2
(Apex's roof quote stays fixture #1) — if the model can express BOTH a roof replacement and
our design-partner proposal, it's right.

## 4. Running the company, module by module

- **Home** — the real morning check: escalations = prospect questions Sarah can't answer
  ("do you integrate with QuickBooks?"), pipeline = design-partner leads → demos → proposals
  out → setup fees awaiting payment.
- **Sarah** — answers founders on our line; qualifies (trade, market, current tooling); books
  demos into Levi's calendar; hard-gate approvals = Levi QA-ing sales replies early (which IS
  the trust story we sell). Escalation-answer flow = unblocking our own deals.
- **CRM** — prospects as contacts; stages map cleanly: qualifying → booked (demo) →
  job_scheduled (onboarding dates) → job_done (live) → paid → past_customer (churn).
  Disqualified = bad fit. The unified timeline per contractor is the deal history.
- **Schedule** — "estimates" = demo/discovery calls; "jobs" = multi-day onboarding engagements
  (an "Apex Roofing — platform setup, Mon–Wed" banner); blocks = deep work. Friction: our
  calls are VIRTUAL (→ §5.2).
- **Quotes/Invoices** — proposals with mixed one-time + recurring lines (→ §3); the public
  accept page doubles as the pilot handshake; invoices for setup fees. Friction: recurring
  billing (→ §5.1).
- **Follow-ups** — the module we feel hardest, immediately. Stalled demo request = the quiet
  lead; unanswered proposal = the held quote (held because THEY asked US something); unpaid
  setup fee = the invoice chase. The board is Levi's sales chase list, on autopilot.
- **Website/Content** — leadanswered.com edited by texting Sarah; the SEO/AI-answers panel is
  our own GEO program (llms.txt already ships); Content = case studies from each onboarding
  ("how Apex got 22 reviews in three weeks"). Friction: our channels are LinkedIn/X, not
  Facebook (→ §5.4).
- **Reviews** — after every completed onboarding, Sarah asks OUR customer for OUR Google
  review, timed to their first-win moment (their review wave landing is the natural high).
- **Analytics** — the real funnel: site visits → texts to Sarah → demos → partners → MRR.
- **Team** — Levi + future setup VAs as "crew" who text Sarah too.

## 5. Gaps our own usage exposes → the dogfood roadmap

Each of these is a feature WE need that some of OUR CUSTOMERS will also want — that's the
test for building it into the product rather than working around it.

1. **Recurring billing / subscriptions.** We: monthly SaaS fee. Customers: maintenance plans,
   gutter-cleaning subscriptions, seasonal contracts — recurring revenue exists in the trades
   too. Shape: recurring line items on quotes (§3), auto-generated invoices or Stripe
   subscriptions behind the Invoices module.
2. **Virtual appointments.** We: every call is remote — need a meet link where a roofer needs
   a street address + drive time. Customers: virtual estimates (photo/video walkthrough) are
   increasingly real in the trades. Shape: `ScheduleItem.location = address | link`, routing
   skips virtual stops, confirmations text the link.
3. **Vertical-agnostic Sarah.** We: qualification script for founders, not homeowners.
   Customers: every non-roofing trade needs the same de-roofing of copy, qualification
   questions, and demo fixtures. Shape: persona/qualification as configuration (mostly exists
   in onboarding-state), audited for baked-in roofing vocabulary.
4. **Channel-flexible content.** We: LinkedIn/X. Customers: Facebook/Instagram/Nextdoor by
   trade. Shape: Content's cross-post targets become pluggable channels.
5. **Deposits / partial payments.** We: maybe 50% setup upfront. Customers: deposits are
   STANDARD in the trades before materials. Shape: quote accept collects a deposit; invoice
   supports partials.
6. **Review destination options.** We: Google (maybe G2 later). Customers: Google dominant,
   but Yelp/Angi matter in some trades. Shape: reviewLinkUrl is already just a URL — keep it
   destination-agnostic in copy.
7. **Service catalog / price book.** We: the §3 catalog. Customers: every trade has one
   (roof sizes, water-heater swaps). Shape: a priced line-item library powering quote compose
   ("Quote the Miller job" pulls real prices) — this is probably Quotes 06's most valuable
   hidden feature.
8. **Team roles.** We: VAs doing setup work with limited access. Customers: office managers,
   crew leads. Already spec'd in 12-team; dogfooding gives it a real first user.

## 6. Honesty rails

- **Never mix the fixture and the firm.** Apex Roofing stays the anonymized demo dataset; the
  Lead Answered org is real data. Real accounts never see fixtures (existing gating rule) —
  and prospects shown OUR org see real pipeline, so demo it deliberately, not by default.
- **The offer stays honest**: "we have a website builder AND we build your first site with
  it." Never imply hand-built custom dev; never hide that the tools are self-serve after
  handoff. The pitch is the handoff: "watch us drive it, then it's yours — and Sarah's."
- Dogfooding feedback loops through the same docs-then-code discipline: pain → note in this
  doc → spec change → build on explicit go.

## 7. Open decisions (Levi)

1. Package vs à-la-carte: one "Design Partner Setup" price, or per-service line items (§3
   table)? Affects the Quotes fixture and the public accept page design.
2. Deposit policy for setup fees (and therefore whether 06/08 need partials at v1).
3. When to flip our own org from "Sarah answers + CRM" (true today) to full dogfood
   (schedule/quotes/invoices) — suggestion: the moment Quotes ships, quote the next design
   partner THROUGH the app.
4. Which service in §3 becomes the flagship case study we publish first.
