# Analytics, Tracking & Experimentation — Build Spec

> Goal: understand **how leads interact with the site** — which pages they open, how far
> they read, what they click, where they're from, what makes them book a design-partner
> call — and build the foundation for **A/B testing**. This doc is the industry-standard,
> "do it properly once" blueprint for the Astro site on Vercel (`leadanswered.com`).
>
> It's tiered: **Tier 0** (baseline, ship first), **Tier 1** (behavior + experiments),
> **Tier 2** (advanced/server-side). You don't have to do all of it day one — but the
> architecture below means each tier slots in without rework.

---

## ✅ Implemented (site-side) — flip it on with env vars

The full **site-side** of this plan is **built, verified, and configured for PostHog**. We chose
**PostHog only** — one tool that does behavior, which pages, geo, session replay, heatmaps, web
vitals, **and A/B testing**. Simpler than the multi-tool Google stack for a solo setup, and it
answers all of §0.

**Status: wired + env set + verified.** `PUBLIC_POSTHOG_KEY` and `PUBLIC_POSTHOG_HOST`
(`https://us.i.posthog.com`) are set on **Vercel production**. On the next deploy PostHog
activates automatically — **consent-gated** (loads only after a visitor accepts the banner).
Verified locally: banner → Accept → PostHog inits → session replay + autocapture + web vitals load
+ our custom events (e.g. `cta_click`) captured, **zero errors**. PostHog stays off until consent.

**Where you'll see everything:** log into **posthog.com** → left sidebar → **Web Analytics**,
**Product Analytics** (Insights / Funnels), **Session Replay**, **Heatmaps**, **Experiments** +
**Feature Flags** (A/B tests).

*(The code is now **PostHog-only** — the GTM / GA4 / Clarity loaders were removed. If you ever want
the Google stack later, it's a clean re-add; see "Future decisions" below.)*

> **How to read the rest of this doc:** §0–§14 are the fuller *reference spec*, written around the
> industry-standard Google stack (GA4 / Clarity / GTM) because that's what "most complete" means at
> big-company scale. The **concepts** — the event taxonomy (§4), the conversion funnel (§5), UTM
> discipline (§6), geo (§7), replays/heatmaps (§8), dashboards (§9), and experiment design (§10) —
> **all apply directly to PostHog**; just read "GA4/Clarity" as "PostHog," which does it in one tool.
> Anything strictly Google-specific (GTM containers, BigQuery export, Looker Studio, Consent Mode) is
> a **later** option, not part of today's setup.

**What the site already emits** (verified pushing to `dataLayer`, no errors): Consent Mode v2
default-denied → banner (Accept/Decline → Consent Mode update) → `page_view` (+`page_type`),
`scroll_depth` (25/50/75/90), `section_view` (hero, meet_sarah, hub, offer, roi, trades, faq,
founder, final_cta), `cta_click` (+`cta_location`), `book_call_outbound` (auto on every cal.com
link), `trade_select`, `faq_open`, `demo_interact`, `nav_click`, `outbound_click`, `consent_update`.

**Code map:** `src/lib/analytics.ts` (`track()`, `pageType()`) · `src/scripts/analytics-client.ts`
(banner + consent + loaders + auto-events + `data-track` delegation) · `Base.astro` (Consent Mode
default + GTM/GA4 loaders + noscript) · `data-track`/`data-section` attributes across pages ·
`/privacy` §9 disclosure · `.env.example`. Consent is stored in `localStorage` (`la_consent`).

> Two build adjustments vs the §1 table: the consent banner is **hand-rolled** (the OSS
> `vanilla-cookieconsent` lib silently failed to render its DOM under our bundling) — simpler, one
> analytics category, zero deps. And GTM loads the **standard async way** (not Partytown) so Consent
> Mode ordering is bulletproof; Partytown stays a later perf option.

---

## 0. What we actually want to answer

Design decisions should trace back to real questions. Everything we instrument serves these:

**Acquisition** — Where do leads come from? (LinkedIn DM vs cold email vs organic vs direct.)
Which outreach message/channel drives the most *qualified* visits?

**Behavior** — Which pages do they open? How far down the home page do they scroll? Which
sections hold attention? Which trade pages get traffic? Which FAQ questions do they open?
Do they play the demo? Where do they rage-click or hesitate?

**Geography / firmographics** — Where are visitors located (country/region/city)? Device,
browser, new vs returning. (Firmographics — trade, company size — come from the cal.com
qualifier, joined on the booking.)

**Conversion** — What % click a "Become a design partner" CTA? What % reach cal.com? What %
actually book? Where in the funnel do they drop? Which CTA/section converts best?

**Experimentation** — Which headline / CTA copy / layout produces more booked calls?

If a tag or event doesn't help answer one of these, we don't add it (noise = worse analysis).

---

## 1. Recommended stack (and why)

| Layer | Tool | Why this one |
|---|---|---|
| **Tag management** | **Google Tag Manager (GTM)** — web container | Industry standard. Add/adjust tags without a code deploy; single place for GA4, pixels, consent. |
| **Core analytics** | **Google Analytics 4 (GA4)** | Free, standard, geo + funnels + audiences + BigQuery export. Fired **through GTM**, never hard-coded. |
| **Consent** | **Self-hosted banner** (hand-rolled, in-repo) + **Google Consent Mode v2** | Legally required (GDPR/ePrivacy/CCPA). Free, no vendor, zero deps. One analytics category → clear Accept/Decline, wired straight to Consent Mode v2 (mandatory for Google tags in the EEA). |
| **Behavior / qualitative** | **Microsoft Clarity** | Free, unlimited **session replays + heatmaps + rage/dead-click detection**. This is the single best tool for "how are they interacting." |
| **Product analytics + experiments** | **PostHog** *(recommended)* | One tool for event analytics, funnels, session replay, **feature flags + A/B testing**, cohorts. Generous free tier. Alternatively use **Vercel Flags** for A/B (see §10). |
| *(optional, later)* **Partytown** | `@astrojs/partytown` | Would run GTM in a web worker for CWV. **Not enabled** — GTM loads standard-async for now so Consent Mode ordering stays bulletproof; layer in later if desired. |
| *(Tier 2)* **Server-side tagging** | **GTM server-side container** on a subdomain | First-party cookies, ad-blocker resilience, PII control, better data quality. Add later. |
| *(Optional)* **Privacy-first pageviews** | **Plausible** or **Fathom** | Cookieless, no-consent-needed, clean top-line numbers. Nice complement/sanity-check to GA4. |

**Deliberately NOT using:** Google Optimize (sunset 2023 — do not use for A/B), and no hard-coded
`gtag.js` (everything routes through GTM for maintainability).

**Minimal viable pick if you want less surface area:** GTM + GA4 + Consent Mode + Clarity.
That already answers ~90% of the questions above. Add PostHog when you're ready to run experiments.

---

## 2. Architecture

```
                         ┌───────────────────────────────┐
   Visitor ───────────▶  │   leadanswered.com (Astro)     │
                         │   • GTM snippet (via Partytown)│
                         │   • dataLayer.push() events    │
                         │   • Consent banner (CMP)       │
                         └───────────────┬───────────────┘
                                         │ dataLayer + consent state
                                         ▼
                         ┌───────────────────────────────┐
                         │      Google Tag Manager        │  ← manage tags here, no deploys
                         │  (fires tags only per consent) │
                         └───┬───────────┬──────────┬─────┘
                             ▼           ▼          ▼
                          GA4        Clarity     PostHog / Ads pixels
                             │
                             ▼
                     BigQuery export (free) ─▶ Looker Studio dashboards
                             ▲
        cal.com booking ─────┘  (conversion + qualifier answers, joined by email)
```

- **One `dataLayer`** is the contract between the site and GTM. The site only ever does
  `window.dataLayer.push({...})`; GTM decides what fires. This decouples instrumentation from tools.
- **Consent gates everything.** Tags are set to *require* consent categories (analytics_storage,
  ad_storage) and stay dormant until the banner grants them (Consent Mode v2 handles EEA + cookieless pings).

---

## 3. Consent & privacy (do this first — it's a gate, not an afterthought)

1. **CMP / cookie banner — open-source, self-hosted (decided).** Use **CookieConsent by Orest Bida**
   (MIT, zero-dependency, ~10 KB) — or **Klaro!** (BSD) as an alternative. Both are free, live in our
   repo, and support category-based consent. We drive **Consent Mode v2** manually: the banner's
   `onConsent` / `onChange` callbacks call `gtag('consent','update', {...})`. No paid vendor.
   - *Caveat (honest):* OSS banners are **not** on Google's "certified CMP" list. That only matters if
     you later run **Google Ads personalization in the EEA** — then Google requires a certified CMP.
     Since we're outreach-led (no ads), OSS is fully fine now; revisit only if you start EEA ads.
2. **Consent Mode v2 default = denied**, then `update` to granted on accept:
   ```js
   // BEFORE GTM loads (in <head>)
   window.dataLayer = window.dataLayer || [];
   function gtag(){dataLayer.push(arguments);}
   gtag('consent','default',{
     ad_storage:'denied', analytics_storage:'denied',
     ad_user_data:'denied', ad_personalization:'denied',
     wait_for_update: 500
   });
   ```
   The CMP then calls `gtag('consent','update', {...})` when the user accepts.
3. **Regional nuance:** EEA/UK → opt-in (banner blocks until choice). US → opt-out is generally
   acceptable; still show a clear notice + "Do Not Sell/Share" for CCPA/CPRA.
4. **Privacy policy** at `/privacy` must be updated to list: GA4, GTM, Clarity, PostHog, cookies
   set, retention, and how to opt out. (We already have a `/privacy` page — add an Analytics section.)
5. **GA4 settings:** IP anonymization is on by default in GA4; enable **Google Signals** only if
   you want demographics/cross-device (adds consent requirements). Set **data retention to 14 months**.
   Sign Google's **Data Processing Terms**.
6. **PII rule:** never push names/emails/phones into GA4/dataLayer. Hash or keep PII in cal.com only.

---

## 4. Measurement plan — the event taxonomy (the core of this doc)

**Naming convention:** `snake_case`, verb_noun, lowercase. Reuse GA4 **recommended event names**
where they exist (`page_view`, `select_content`, `generate_lead`, `view_item`). Every custom event
carries a consistent set of params. This taxonomy is the source of truth — implement exactly this so
reports stay clean.

### Global params (attached to every event via GTM)
`page_path`, `page_title`, `page_location`, `referrer`, `device_category`, `is_returning`,
plus GA4 auto: geo (country/region/city), source/medium/campaign (from UTMs), landing_page.

### Events

| Event name | Fires when | Key params | Why we care |
|---|---|---|---|
| `page_view` | Every route (Astro is multi-page; fire on load) | `page_path`, `page_type` (home/blog/trade/about/legal) | Which pages open, entry/exit, paths |
| `scroll_depth` | 25 / 50 / 75 / 90 % of page height | `percent`, `page_path` | How far they read; where attention dies |
| `section_view` | A key section enters viewport (IntersectionObserver) | `section` (hero, insight, meet_sarah, hub, roi, offer, trades, faq, founder, final_cta) | Which parts of the story land |
| `cta_click` | Any "Become a design partner" / primary CTA click | `cta_location` (nav, hero, offer, final_cta, about, trade), `cta_text` | Which CTA/section drives intent |
| `book_call_outbound` | Click on any `cal.com` link | `cta_location` | Booking **intent** (top-of-funnel conversion) |
| `generate_lead` ⭐ | cal.com booking completed (see §5) | `value`, `trade`, `employees` | **Primary conversion** |
| `trade_select` | Trade chip / trade-page CTA click | `trade` (roofing, hvac, …) | Which trades are interested |
| `faq_open` | FAQ accordion item expanded | `question` | Real objections / what they research |
| `demo_interact` | Meet-Sarah toggle switch or "Replay" | `action` (toggle_ops, toggle_lead, replay) | Is the demo engaging? |
| `nav_click` | Top-nav link click | `link` (how, offer, trade, blog, about) | Navigation intent |
| `blog_read` | Blog post 50% + 30s dwell | `slug`, `read_percent` | Content that earns attention |
| `video_play` | Demo video play (when added) | `page_path` | Video engagement |
| `outbound_click` | Any external link (linkedin, docs) | `href`, `link_domain` | Off-site journeys |
| `form_error` / `js_error` | Client error (optional) | `message` | Quality / broken funnels |

⭐ Mark `generate_lead` (and optionally `book_call_outbound`) as **Conversions/Key Events** in GA4.

### Site-side helper (keep instrumentation DRY)
One tiny module, imported in `Base.astro`, exposes `track()`:
```js
// src/lib/analytics.ts
export function track(event: string, params: Record<string, unknown> = {}) {
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push({ event, ...params });
}
```
Then attach via `data-*` attributes so buttons are self-instrumenting — no per-button JS:
```html
<a href="https://cal.com/leviramos"
   data-track="cta_click" data-cta-location="hero" data-cta-text="Become a design partner">…</a>
```
A single delegated listener reads `data-track` + `data-*` and calls `track()`. Add the attributes
to: nav CTA, hero CTAs, offer, final CTA, about, every trade-page CTA, trade chips, FAQ buttons,
demo toggle/replay.

---

## 5. Conversion tracking (the money metric = booked calls)

The real conversion happens on **cal.com**, off our domain. Three ways to capture it, best first:

1. **cal.com native integrations** *(recommended)*: cal.com supports **GTM/GA4** and a
   **conversion/analytics** app — connect your GA4 + GTM IDs in cal.com so a booking fires
   `generate_lead` with the same measurement ID. Also enable the **cal.com webhook** → a serverless
   endpoint (Vercel function) → forward to GA4 **Measurement Protocol** for server-side truth
   (ad-blocker-proof). Store bookings + qualifier answers in a sheet/DB for the firmographic join.
2. **Redirect/thank-you**: set cal.com's post-booking redirect to `leadanswered.com/thanks?booked=1`;
   that page fires `generate_lead`. Simple, but loses attribution if they don't return — mitigate by
   passing GA `client_id` into the cal.com URL and back.
3. **Outbound-as-proxy**: count `book_call_outbound` as the tracked conversion on-site (intent), and
   reconcile actual bookings from cal.com manually. Weakest, but zero setup.

**Attribution stitch:** append the GA4 `client_id`/`session_id` and current UTMs to the cal.com link
(`?utm_source=…&client_id=…`) so a booking can be tied back to the original channel and session.

---

## 6. Campaign & source tracking — UTMs (critical, because GTM is outreach-led)

Since partners come from **cold email + LinkedIn**, not ads, the ONLY way to know which channel/
message works is disciplined **UTM tagging on every outreach link**. Standardize now:

```
https://leadanswered.com/?utm_source=linkedin&utm_medium=dm&utm_campaign=partner_2026&utm_content=roofers_v1
https://leadanswered.com/?utm_source=email&utm_medium=cold&utm_campaign=partner_2026&utm_content=hvac_v2
```
- `utm_source`: linkedin | email | referral | organic (leave blank for organic; GA4 detects it)
- `utm_medium`: dm | cold | reply | newsletter
- `utm_campaign`: `partner_2026` (the batch)
- `utm_content`: which message variant / trade → **this is your message A/B test at the outreach layer**
- Keep a **UTM registry** (a sheet) so naming stays consistent. Build a Looker Studio view grouped by
  `source / medium / content` → visits → CTA clicks → bookings. This tells you which opener converts.

---

## 7. Geography & audience (mostly free from GA4)

GA4 gives out of the box: **country, region, city**, language, device category, OS, browser, screen,
new vs returning, session source/medium/campaign, landing/exit page, engagement time, event count.
Build a **Geo report** (Explorations → free-form, dimension = City/Region, metric = users +
conversions) to see where interested leads cluster — useful for prioritizing outreach by region.
For company-level firmographics (which businesses, size, trade), rely on the **cal.com qualifier**
answers joined to the booking — GA4 won't have those.

---

## 8. Qualitative — session replay & heatmaps

- **Microsoft Clarity** (free, unlimited): watch real sessions, scroll/click **heatmaps** per page,
  automatic **rage-click / dead-click / excessive-scroll / quick-back** flags. This is where you'll
  *see* why people bounce off the hero or ignore the offer. Filter recordings by "clicked CTA" or
  "from LinkedIn." Zero sampling.
- **PostHog session replay** (if using PostHog) overlaps with Clarity but ties replays to your event
  funnels and flags. Running **both Clarity + PostHog** early is fine (Clarity for free heatmaps,
  PostHog for funnels/experiments); consolidate later if you want.
- Mask PII in replays (both tools support input masking — turn it on).

---

## 9. Dashboards & reporting

- **GA4 Explorations**: build a **Funnel exploration** — `page_view` (home) → `section_view` (offer)
  → `cta_click` → `book_call_outbound` → `generate_lead`. This is the core funnel; watch drop-off.
- **Looker Studio** (free) connected to GA4 (+ BigQuery): one exec dashboard — visits, source
  breakdown, top pages, scroll/section engagement, CTA→booking rate, geo map, weekly trend.
- **BigQuery export** (GA4 → free tier): enable day one. Raw event-level data = future-proof
  (custom analysis, ML, no sampling). Costs ~nothing at this traffic.
- **Weekly cadence:** one dashboard you read every partner-call week: *visits, by source, CTA rate,
  bookings, and top 3 Clarity findings.*

---

## 10. A/B testing & experimentation

**Tooling options (pick one to start):**
- **PostHog Experiments** *(recommended if using PostHog)*: feature flags + built-in stats engine
  (significance, sample size), ties directly to your funnels. Server- or client-side.
- **Vercel Flags / Edge Middleware** *(great since we're on Vercel)*: bucket users at the edge
  (fast, no flicker), render the variant, and log the variant into GA4/PostHog as a param. Native,
  no extra vendor.
- Enterprise: Optimizely / VWO / Statsig — overkill now.
- **Avoid** client-side "flicker" A/B tools that rewrite the DOM after load (hurts CWV + UX).

**Process (industry standard):**
1. **Hypothesis** — "Changing hero H1 from *Everything runs through Sarah* to *Run your whole
   business by text* will increase `book_call_outbound` rate."
2. **One primary metric** (booking-intent rate). Guardrail metrics (bounce, scroll depth).
3. **Sample size / duration** — compute up front (min detectable effect + baseline rate). At low
   traffic, expect to run **≥2–4 weeks** and full weekly cycles; don't peek/stop early.
4. **50/50 split**, stable bucketing (by `client_id`), significance ≥95% before calling it.
5. **Log the variant** as an event param so GA4/PostHog can segment every metric by variant.
6. **One change per test** (or a documented multivariate design). Document result + decision.

**First experiments worth running (highest leverage):**
- Hero **headline** + subhead.
- Primary **CTA copy** ("Become a design partner" vs "Get a partner slot" vs "Book a 15-min call").
- **Offer framing** order / "3 spots" prominence.
- Home **section order** (offer above vs below the hub).
- With/without the **final abacate-style CTA** panel.

> ⚠️ Honest note: at design-partner traffic volumes, rigorous A/B tests may not reach significance
> quickly. Early on, **Clarity qualitative + funnel drop-off** will teach you more than underpowered
> A/B tests. Treat formal experimentation as the goal you're *building toward*, and lean qualitative first.

---

## 11. Implementation on Astro / Vercel (concrete)

**Phase A — Tier 0 baseline (½–1 day)**
1. Create **GTM** container + **GA4** property; get `GTM-XXXX` + `G-XXXX`.
2. Add **`@astrojs/partytown`** and load GTM through it (keeps main thread clean):
   ```bash
   pnpm add @astrojs/partytown
   ```
   ```js
   // astro.config.mjs
   import partytown from '@astrojs/partytown';
   integrations: [ /* … */, partytown({ config: { forward: ['dataLayer.push'] } }) ]
   ```
3. In **`Base.astro`** `<head>`: consent-default snippet (§3) → GTM snippet (`type="text/partytown"`)
   → `<noscript>` GTM iframe first in `<body>`.
4. Add **`src/lib/analytics.ts`** `track()` + one delegated `data-track` listener (§4).
5. Sprinkle `data-track` attributes on all CTAs/chips/FAQ/demo/nav.
6. Enable **BigQuery export** + set GA4 data retention + DP terms.
7. Add a **CMP** banner + wire Consent Mode `update`.
8. Add **Clarity** tag via GTM.

**Phase B — Tier 1 (conversions + behavior)**
9. Configure GA4 **Conversions** (`generate_lead`, `book_call_outbound`).
10. Wire **cal.com → GA4/GTM** + webhook → Vercel function → Measurement Protocol (§5).
11. Add **PostHog** (via GTM or its snippet); define the funnel.
12. Build **Looker Studio** dashboard + GA4 funnel exploration.
13. Lock the **UTM registry** + tag outreach links.

**Phase C — Tier 2 (advanced)**
14. **Server-side GTM** container on `sgtm.leadanswered.com` (first-party, resilient).
15. First **A/B test** via Vercel Flags or PostHog.

**QA / validation (every tag):** use **GA4 DebugView**, **GTM Preview mode**, and **Google Tag
Assistant** to confirm events + params fire correctly and *only fire after consent*. Nothing ships to
prod until it's green in Preview. Keep a **tracking QA checklist** per event.

---

## 12. Data governance & hygiene

- **Naming:** the §4 taxonomy is law. New events get added here first, then implemented.
- **Environments:** separate GA4 property (or a `debug_mode`/env param) for staging vs prod so test
  traffic doesn't pollute real data. Filter internal/dev IPs.
- **Ownership:** one person owns the GTM container + taxonomy doc. Version the container (GTM has
  built-in versioning + notes).
- **No PII in analytics.** Ever. PII lives in cal.com only.
- **Bot/spam filtering:** enable GA4 known-bot filtering; watch for referral spam.

---

## 13. Cost

At this traffic, **$0/mo** to start — and now genuinely $0, since the consent banner is
**open-source/self-hosted** (no paid CMP). GA4, GTM, Clarity, BigQuery (free tier), Partytown,
Vercel Flags, and the OSS CMP are all free; PostHog + Plausible/Fathom have free/cheap tiers.
The only future recurring cost is **server-side GTM** (Tier 2, optional): ~$20–50/mo managed
(Stape) or ~$40–120/mo self-hosted — skip until you're scaling.

---

## 14. Rollout checklist (tl;dr)

- [ ] GTM + GA4 created, IDs in hand
- [ ] Consent Mode v2 default-denied + CMP banner live
- [ ] Partytown loading GTM; CWV unaffected
- [ ] `track()` helper + `data-track` on all CTAs/chips/FAQ/demo/nav
- [ ] Event taxonomy (§4) implemented + verified in DebugView/Preview
- [ ] `generate_lead` + `book_call_outbound` marked as Conversions
- [ ] cal.com → GA4 + webhook conversion wired; `client_id`/UTMs passed through
- [ ] Clarity live (heatmaps + replays, PII masked)
- [ ] BigQuery export + Looker Studio funnel dashboard
- [ ] UTM registry defined; outreach links tagged
- [ ] `/privacy` updated with analytics disclosures
- [ ] (Tier 1+) PostHog + first A/B test scoped

---

## 15. Future decisions (deferred — not needed now)

We went **PostHog-only** — it answers everything in §0 (behavior, which pages, geo, session replay,
heatmaps, web vitals, funnels, **and A/B testing**) in one tool, which is the right scope for a solo,
outreach-led setup. Everything below is **optional, later** — revisit only if a real need shows up.

**Resolved:**
- ~~**Which product-analytics/experiments tool?**~~ → **PostHog** (product analytics + session replay
  + heatmaps + Experiments/Feature Flags, one login, generous free tier).
- ~~**Consent banner?**~~ → **self-hosted, in-repo** (hand-rolled; the OSS lib wouldn't render under
  our bundling). One analytics category → Accept/Decline, wired to PostHog's consent.

**Deferred — decide later, with the trigger for each:**
- **GA4** — add *only* if you want Google's standard web-analytics reports or to plug into **Google
  Ads / Search Console** later. Overlaps PostHog; skip until there's a Google-ecosystem reason.
- **Microsoft Clarity** — not needed; PostHog does replays + heatmaps. (Clarity's edge = unlimited
  free recordings; only matters if you blow past PostHog's 5k/mo replay free tier.)
- **GTM** — a tag manager; not needed with PostHog wired directly. Your `GTM-PM97R9LW` container
  still exists in the account, unused. Adopt only if a non-dev needs to manage tags without deploys.
- **PostHog reverse proxy / server-side** — routes PostHog through your own domain for **ad-blocker
  resilience + first-party cookies**. Nice at scale; revisit when traffic/quality matters. (This is
  the PostHog equivalent of the §Tier-2 "server-side GTM.")
- **Plausible / Fathom** — a cookieless, no-consent top-line pageview counter. Optional "second
  opinion." Skip unless you want a banner-free public metric.
- **BigQuery export / Looker Studio** (§9) — Google-stack reporting; N/A without GA4. PostHog has its
  own dashboards + SQL (HogQL). Only relevant if you later add GA4.
- **cal.com → server-side conversion** (§5) — right now `book_call_outbound` (every cal.com click) is
  the tracked conversion proxy. If you want the *actual booked-call* event in PostHog, wire a cal.com
  webhook → a small Vercel function → PostHog capture. Do this once volume justifies it.

**Note:** §11's "implementation phases" and §14's checklist above are the *Google-stack* playbook —
they're superseded by the PostHog setup (already done). Kept for reference if you ever add GA4.
