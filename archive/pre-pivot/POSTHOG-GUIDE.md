# How to see your website data in PostHog

Everything the site tracks lands in **one place: [us.posthog.com](https://us.posthog.com)** (US cloud).
Log in and it's all in the **left sidebar**. This guide maps *what you want to know* → *exactly where
to click*.

> **Data only appears after a visitor clicks "Accept" on the cookie banner** (it's consent-gated — no
> tracking before that). **Test it yourself:** open `leadanswered.com` → click **Accept** → then open
> **Activity** in PostHog. Your visit shows up within ~a minute.

---

## Quick map — what you wanted → where it is

| You want to know… | Go to (left sidebar) |
|---|---|
| Which pages they open, traffic, top sources | **Web analytics** |
| **Where they live** (country / city) | **Web analytics** → map panel |
| Watch real visitor sessions | **Session replay** |
| Where people click / scroll on a page | **Heatmaps** (via the **Toolbar**) |
| CTA click rates, any event over time | **Product analytics → Insights** |
| The funnel (visit → CTA → booking) + drop-off | **Product analytics → Funnels** |
| Run an A/B test | **Experiments** (+ **Feature flags**) |
| Verify tracking works / raw event feed | **Activity** |

---

## The main views (step by step)

### Web Analytics — your "how's the site doing" dashboard
Left sidebar → **Web analytics**. Out of the box you get:
- Visitors & pageviews over time (set the date range top-right)
- **Top pages** — which pages people actually open
- **Referrers / channels** — where traffic comes from (direct, LinkedIn, Google…)
- **World map / location** — where your visitors are (country, region, city)
- Device, browser, bounce rate, session duration

This one screen answers most "how are leads interacting" questions.

### Session Replay — watch real visits
Left sidebar → **Session replay**. You get a list of recordings — click one to watch a visitor scroll,
hover the CTA, hesitate, and leave.
- **Filter** (top) by e.g. `Current URL = /`, or "performed event `cta_click`", or `Country = United States`.
- This is where you *see* why someone bounced off the hero or skipped the offer.
- Input-masking is on, so nothing sensitive is recorded.

### Heatmaps — where they click & scroll
Left sidebar → **Tools → Toolbar** → **Launch** on `leadanswered.com`. It opens your live site with a
**click / scroll heatmap overlay** — toggle the heatmap type in the toolbar. (This shows where attention
and clicks actually land on each page.)

### Product Analytics → Insights — chart any event
Left sidebar → **Product analytics** → **New insight** → **Trends**.
- Pick an event, e.g. `cta_click`, then add a **breakdown by `cta_location`** to see which button
  (hero vs nav vs final CTA vs trade page) drives the most clicks.
- Repeat for `book_call_outbound`, `trade_select`, `faq_open`, `scroll_depth`, etc.

### Funnels — the conversion path + where they drop off
Left sidebar → **Product analytics** → **New insight** → **Funnel**. Add these steps in order:
1. `$pageview`
2. `section_view`  → then filter its property `section = offer`
3. `cta_click`
4. `book_call_outbound`

PostHog shows the **% making it through each step** — so you see exactly where people fall out (e.g.
"lots view the offer, few click the CTA" → the offer or CTA needs work).

### Experiments — A/B testing
Left sidebar → **Experiments** → **New experiment**. You pick the change (through a **Feature flag**), a
goal metric (e.g. `book_call_outbound`), and PostHog handles the 50/50 split + statistical significance.
When you want to run a specific test (e.g. a new hero headline), tell me and I'll wire the flag into the
site so the variant renders.

### Activity — verify it's working / raw feed
Left sidebar → **Activity** (or **Data → Events**). A live stream of every event as it lands — the
fastest way to confirm tracking works right after you accept the banner.

---

## The events the site sends (reference)

| Event | Fires when | Useful property |
|---|---|---|
| `$pageview` | every page load | *(PostHog built-in — Web Analytics uses this)* |
| `page_view` | every page load | `page_type` (home / blog / trade / about…) |
| `scroll_depth` | 25 / 50 / 75 / 90 % down a page | `percent` |
| `section_view` | a section scrolls into view | `section` (hero, offer, hub, faq…) |
| `cta_click` | any primary CTA click | `cta_location` (hero, nav, final_cta, about, trade…) |
| `book_call_outbound` | **any cal.com click** (booking intent) | `cta_location` |
| `trade_select` | a trade chip click | `trade` (roofing, hvac…) |
| `faq_open` | an FAQ item is expanded | `question` |
| `demo_interact` | Meet-Sarah toggle / replay | `action` |
| `nav_click` | top-nav link click | `link` |
| `outbound_click` | any external link | `href`, `link_domain` |

Plus, automatically from PostHog: **autocapture** (all clicks/inputs), **session replay**, **heatmaps**,
and **web vitals** (page performance).

---

## A good weekly habit
Left sidebar → **Dashboards** → build one dashboard with: the **funnel**, **top pages**, **`cta_click`
by location**, and the **geo map**. Read it every partner-call week: *visits, where they came from, CTA
rate, booking intent, and 2–3 session replays of people who bounced.*

That's the whole thing — one login, everything in the sidebar.
