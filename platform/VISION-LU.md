# VISION — Lu: the AI computer that runs your business

> Strategy doc (Levi + Claude, 2026-07-13). The zo.computer-inspired reframe, decision-ready.
> Companions: `DOGFOOD.md` (we are customer #1), `FEATURES.md`, `../gtm/todo-2026-07-13.md`.
> Status: ACTIVE — the rename is Levi's call (§8); §9 is how this week's build carries the
> vision.

## 1. The reframe in one paragraph

Today's positioning: "the AI operating system for service businesses." The sharper frame:
**an always-on AI computer that runs your business — with a 24/7 employee you can scale.**
Everything a business owner needs in the digital age lives in one workspace — website, leads,
scheduling, reviews, quoting, invoicing, recurring payments, content, SEO/AI-search — and the
agent (Lu) OPERATES all of it through real channels (SMS today; email next; more later). You
don't configure a computer; you talk to your employee, and the computer is what she runs on.

## 2. What we learned from Zo (and what we refuse to copy)

Zo (zo.computer) = a personal cloud computer per user: always-on Linux server, files,
hosting, scheduled automations, reachable via chat/iMessage/SMS/email/Telegram/Slack, instant
`you.zo.space` sites, 1000+ integrations, free tier. Reviews are consistent: genuinely novel
(the SMS/email channel body, the always-on automations), but **for builders and
experimenters — beginner-hostile, "not plug-and-play," value only after configuration
effort, not production-grade for business-critical work.**

**Steal (the mechanics):**
- The agent has CHANNELS, not just a chat box — text it, email it, and it acts.
- Instant deployment: something publicly live in the first session (`{business}.lu.computer`).
- Always-on background work, visible and explainable (our Follow-ups board already IS this,
  with better manners — she explains her silences).
- "Replaces N tools" framing; MCP-era interop (§5).

**Refuse (the shape):**
- The blank canvas. Zo sells general-purpose capability and makes the user assemble value.
  We sell FINISHED OUTCOMES: the answered line, the booked estimate, the review wave, the
  chased invoice. Zo's weakness (setup investment) is our differentiation ("the dumbest
  person can seamlessly get it" — Levi's bar).
- The consumer/general tier ("use it like Zo, upgrade to business") — PARKED. That's a
  different company competing with Zo/OpenAI. Our ladder lives INSIDE business: solo
  operator with a phone → full company with crew, payments, growth.
- Push-code/CI fantasies (Levi's own "maybe too crazy" — agreed; the canvas sneaking back).

## 3. Onboarding = the ROI ladder

Principle: **sequence by time-to-first-win; show the metric inside each step.** Session one
must end with something publicly visible. The slow stuff is labeled "compounding" so it never
reads as broken. Onboarding itself is conversational — you SET UP the workspace by talking to
Lu (the config wizard already exists; the chat layer maps 1:1 — spec before build).

| Horizon | Step | The win | The number the step shows |
|---|---|---|---|
| Minutes | Website live on `{business}.lu.computer` | real web presence tonight | site live · first visit |
| Minutes | Claim your line — Lu answers | the 9pm call stops dying | response time · leads captured |
| Day 1 | Import your history | Lu knows the business | contacts in · reactivation pool |
| Week 1–2 | First review wave | the public, braggable win | +N Google reviews |
| Week 1–2 | Follow-ups armed | recovered stalls = found money | $ recovered |
| Week 2–4 | Quotes + invoices (+ deposits, recurring) | faster yes, faster cash | days-to-paid |
| Month+ | Content · SEO · AI-search | compounding discovery | rankings · AI answers |

Get-started checklist (Apollo-style, on Home) = this table, each step deep-linking into its
module and carrying its own "this usually means →" line.

## 4. Domains + the agent's email (the plumbing that makes it feel like magic)

**Site ladder:**
1. **Instant**: publish → `{business}.lu.computer`. Live in the first session, zero DNS.
2. **Bring your domain**: Lu walks the owner through DNS in chat (or automated via an
   Entri-style connect). The site re-aliases; nothing rebuilds.
3. **Buy through us**: registrar API ("tell Lu the domain you want; she buys and wires it").

**Agent email ladder** (email = the B2B channel; SMS = the consumer channel):
1. **Instant**: `{business}@lu.computer` at signup — inbound via routing (e.g. Cloudflare
   Email Routing), outbound via Resend/Postmark with proper DKIM/SPF. Zero setup.
2. **Their domain**: `lu@{theirdomain}.com` once connected (we control DNS in ladders 2–3).

What agent-email unlocks: forward a supplier invoice → it lands parsed in Invoices; website
form → Lu qualifies by email; quotes/invoices sent by email with the accept/pay link;
booking confirmations with real calendar invites (.ics); "email Lu" as a first-class command
surface exactly like texting her.

## 5. MCP posture

- **Lu as MCP server** (say now, build later): your business, operable from Claude/ChatGPT —
  "ask Claude what's on the schedule Thursday" hits the same tools Lu uses. Cheap credibility
  with technical buyers; real differentiation when shipped.
- Lu as MCP client: how integrations accrue without bespoke connectors, eventually.
- NOT: hosting arbitrary user code/apps. Parked with the consumer tier.

## 6. One Lu, every employee — the Paperclip inversion

[Paperclip](https://github.com/paperclipai/paperclip) (OSS, ~42k stars) orchestrates
COMPANIES OF AGENTS — org charts, goals, budgets, governance, "zero-human companies." Its
users don't have an org, so it simulates one. Our customers already HAVE the org — humans in
trucks. So we invert every axis:

    Paperclip: many agents · zero humans · the org simulated
    Lu:        one agent   · all humans  · the org assisted

Not different AIs per person — ONE Lu, one brain, one org-wide memory, a different WORKING
RELATIONSHIP with each person, shaped by role. Owner pitch: "a co-founder you can scale."
Team pitch: "the coworker everyone shares."

**How it works:**
- **Identity + channels first.** Every member registers a phone (later email) so Lu knows
  WHO is texting — Mike the crew lead, not a customer, not Marcus. Crew never installs an
  app; their whole Lu experience is SMS, exactly like customers. The app is the owner's
  cockpit; the team's Lu is a contact in their phone. Invite = Lu texts THEM: "Hi Mike, I'm
  Lu — Marcus set you up. Want tomorrow's schedule each morning?" Zero-install onboarding.
- **Role lens.** Same brain; three things vary per person: what Lu SURFACES (tech's morning
  digest = route + gate codes; owner's = Needs-you), what she'll DO (estimator can draft
  quotes; tech can't), what she'll ANSWER ("what did we bill last month?" from a tech →
  "that's one for Marcus"). Permissions are conversational, not a settings matrix.
- **The field beats:** "running 30 late" → Lu shifts the stops, texts the customer a new
  window, pings the office. Job-done photos → invoice drafted for approval + review ask
  armed + photos banked for content. One text from the field fans into three modules.
- **Approval ROUTING (the piece to steal from Paperclip's governance):** hard-gate kinds
  route by role — reschedule notices + invoice nudges → office manager; review asks + money
  → owner; everything escalatable. Grafted onto the existing hard gate, which already works.
- **Memory + privacy line:** org memory shared (the Hendersons' gate code answers for
  whoever asks); threads per-person; every ACTION Lu takes lands in the org activity log
  regardless of who asked. Actions public, conversations personal — the audit trail we
  already built is the transparency mechanism.
- **Skip from Paperclip:** token budgets, multi-agent theater. An owner doesn't want AI
  spend policies; she wants the phone answered.
- **Strategy kicker: team seats are FREE.** Every seat is another person with Lu in their
  contacts, and techs change employers constantly — the crew member who moves companies is
  the referral channel. Monetize outcomes, not seats.

This reframes `12-team.md` from "members + permissions matrix" into **"who does Lu work
for"** — member = name + role preset + phone; role preset = a lens with plain-language copy;
invite = a text from Lu. Cheapest first slice: the SECOND registered number (owner +
spouse/office manager) — half the ICP is a two-person op, and "Lu answers her phone too,
and knows it's her" is 20% of the vision for 2% of the work.

## 7. The rename: lu.computer

**Recommendation: yes — and split brand from persona.**

Why yes:
- `apexroofing.lu.computer` and `apexroofing@lu.computer` are clean; the leadanswered
  equivalents are not. The subdomain aesthetics problem and the agent-email problem are the
  SAME problem: the platform name is 12 characters. Lu is 2.
- Pre-launch is the cheapest this will ever be: zero posts published, zero customers, landing
  SEO barely seeded. The cost is a focused day; the cost in six months is a migration.
- Domain in hand (Levi found lu.computer). Wordmark: "Lu" is typeable in a text thread, reads
  warm, works multilingually.

**The split (the thing Zo can't do):** Lu = the OWNER-facing brand — the computer, the app,
the platform. The CUSTOMER-facing texting persona stays per-business configurable (it already
is, in onboarding): the homeowner hears from "Sarah from Apex Roofing" — an employee, not an
AI brand. Default persona name TBD (Sarah tested well with trades; could default to Lu).
The owner talks to Lu; their customers talk to *their* employee.

**Rename checklist (when GO is called — one focused day):**
- [ ] Secure: lu.computer DNS + wildcard `*.lu.computer` (sites) + email routing/DKIM; the
      social handles; basic trademark sanity check (USPTO knockout search for "Lu" in class
      42 is crowded — likely fine as "Lu Computer"; 30 min of diligence, not zero).
- [ ] Landing page: copy, logo, analytics, sitemap, llms.txt; leadanswered.com 301s.
- [ ] App: product name in shell/auth/emails; "Sarah" refs split into BRAND (→ Lu) vs
      PERSONA (→ stays config; fixtures' Apex persona can stay "Sarah" — it demonstrates
      the configurability).
- [ ] Repo/docs: this can lag — code names don't ship.
- [ ] The Twilio line, backend, and all built UI are otherwise untouched — this is naming,
      not architecture.
- [ ] gtm: first LinkedIn posts launch WITH the new name (never post twice under two names).

## 8. Decisions (Levi)

1. **GO/NO-GO on Lu** — decide inside 24h and once. Naming thrash is worse than either name.
2. Default customer-facing persona name (keep Sarah as default? Lu? owner-chosen at
   onboarding with a good default?).
3. Consumer tier: confirm PARKED (this doc assumes yes).
4. Does the Get-started checklist (§3) become the next spec doc after Analytics/Team — ahead
   of Quotes? (It's the onboarding = the self-serve decision made real.)
5. Team seats free (§6 assumes yes) — and which roles ship as presets v1
   (Owner / Office / Crew / Estimator?).

## 9. How we build this — THIS week

The vision is the week's build program, not a poster. UI-first, mock-seam, docs-then-code —
same discipline, new content. Suggested sequence (Levi reorders freely):

- **Mon — decide + Analytics.** GO/NO-GO on Lu (§8.1) + persona default (§8.2). Build
  Analytics (11) — display-heavy, closes every demo on numbers.
- **Tue — the rename day.** Execute §7's checklist end-to-end: wildcard DNS + email routing
  secured, landing rebranded + 301s, app shell renamed with the BRAND/PERSONA split (Lu =
  platform; Apex's customer-facing persona stays "Sarah" in fixtures — it demos the
  configurability). First LinkedIn post ships this day, under the final name, telling the
  vision (§1) — the rename IS the launch post.
- **Wed — Team (12), rebuilt around §6.** Rewrite the spec first: members = who Lu works
  for; role presets with plain-language lenses; invite-by-text flow (UI + fixture SMS
  thread); approval ROUTING visible on the approvals surfaces (route chips: "→ Dana at the
  office"); the second-number slice explicitly in scope. Then build it on fixtures — the
  Apex cast gains an office manager + crew lead so every role lens is demoable.
- **Thu — onboarding spec + Get-started.** Spec the §3 ROI ladder as its own doc
  (checklist on Home + Lu-chat onboarding mapped 1:1 onto the existing config wizard), then
  build the checklist UI with per-step metrics. The website publish flow gets the §4 ladder
  UI-first: publish → `{business}.lu.computer` shown live, "connect your domain" as the
  next step, agent email (`{business}@lu.computer`) surfaced at claim time (all mock-seam).
- **Fri — Quotes (06) spec'd with BOTH fixtures.** Apex's roof quote AND our own
  design-partner proposal (one-time lines + recurring — DOGFOOD §3): if the model expresses
  both, it's right. Build starts when the spec survives a read.

Still true inside all of this: the wedge is service businesses, roofers first; Apex Roofing
stays the demo; MCP stays a sentence in the story, not a build item. The vision doesn't
widen the product — it reorders the queue so the story, the name, the team, and the
onboarding land together.
