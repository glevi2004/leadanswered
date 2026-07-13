# SEO plan — Lead Answered (opinionated + prioritized)

## Thesis (read this first)
For a vertical SaaS aimed at contractors, **a blog is NOT your #1 SEO lever — it's the 4th.**
Priority order: (1) fix the technical foundation that's currently broken, (2) programmatic
per-trade pages that capture *buyers*, (3) a free calculator that earns links + leads,
(4) *then* a focused blog. Do them in that order. SEO compounds over 3–6 months — start now,
but keep direct outreach running; this won't book a job next week.

---

## P0 — Fix what's broken now (~1 day, biggest CWV + indexing wins)
Straight from the audit of the current landing page:
- **Tailwind loads from `cdn.tailwindcss.com` (line 31).** That's the play-CDN: render-blocking,
  compiles CSS in the browser at runtime, and Tailwind says never ship it to prod. It tanks LCP.
  → Compile Tailwind to one static `.css` file (or inline critical CSS).
- **`logo.png` is 700 KB.** A logo. → Ship an SVG or a <20 KB PNG/WebP (you already have a 17 KB
  `logo-email.png`). Convert `levi-headshot.jpg` (180 KB) to WebP. Direct LCP win.
- **No `robots.txt`, no `sitemap.xml`.** → Add both. Submit the sitemap in Google Search Console
  + Bing Webmaster Tools.
- **No canonical tags.** → Add `<link rel="canonical">` on every page.
- **No structured data.** → Add JSON-LD: `Organization`, `SoftwareApplication` (SaaS, add offers
  + aggregateRating once you have reviews), and `FAQPage` on any FAQ block. Rich results + entity clarity.
- **No `og:image` / `twitter:image`.** → Add a 1200×630 social card; shares currently render bare.
- Stand up **Google Search Console + GA4 or Plausible** now, for a baseline.

## P1 — Content platform (the enabler)
Hand-coded HTML won't scale to a blog + dozens of pages. **Same domain, subpaths** (`/blog`,
`/for/roofers`) — never a separate subdomain (it splits link equity).
- **Best for pure SEO/CWV: Astro** — zero JS by default, MDX blog, content collections, trivial
  programmatic routes. Purpose-built for exactly this.
- **Pragmatic: reuse the existing Next.js `apps/web`** for `/blog` + programmatic, leave the current
  landing as-is. Less new stack, ships faster.
- My call: **Astro if you truly want "best possible"; Next.js if you want it live this week.**

## P2 — Programmatic per-trade pages (your biggest lever)
One template + a data file → a page per trade: `/for/roofers`, `/for/plumbers`, `/for/hvac`,
`/for/electricians`, `/for/landscapers`, `/for/garage-door`, `/for/pest-control`, … (10–30 pages).
Each targets commercial-intent long-tail ("answering service for roofers", "roofer missed-call app",
"never miss a call plumber"). These capture **buyers**, not readers — higher ROI than any blog post.
**Rule:** every page must be genuinely trade-specific (real pain, examples, terminology). A spun
doorway page gets buried by Google's spam / helpful-content updates. Per-city pages = a Phase-2
bet, only after per-trade proves out.

## P3 — A free tool (links + leads)
Build the **"Missed-Call Revenue Calculator"**: avg job value × missed calls/week → $ walking out
the door. It ranks for calculator queries, is the #1 backlink magnet in this niche, and captures
email at the result. Second: a "Speed-to-Lead ROI" calc. Interactive = where the framework pays off.

## P4 — The blog (what you asked for)
Topic **clusters**, not random posts. One pillar + supporting posts per theme, every post internally
linking to the trade pages + product:
- **Speed-to-lead** — pillar: "Why the first business to respond wins the job" → "how fast should you
  respond to a lead", "the 5-minute rule", …
- **Missed calls** — "how many jobs am I losing to missed calls", "missed-call text-back, explained",
  "do contractors need an answering service".
- **Automate vs hire** — "AI vs a receptionist for a contractor", "what an answering service costs".
- **Reputation/reviews**, **seasonal** (storm season for roofers), **local lead-gen**.
Cadence: depth > volume. 1–2 genuinely useful posts/week (or 1 great one). Write for the contractor,
3rd-grade clarity, each post answering ONE real search query.

## P5 — Off-page / authority
- List on **G2, Capterra, GetApp, Software Advice** — they rank *and* drive trials.
- Backlinks: guest posts on home-service/contractor blogs, relevant podcasts, HARO/Connectively.
- Founder content on LinkedIn/X — referral traffic + the occasional link.

## Skip / don't waste time on
- Head terms ("CRM", "field service software") — incumbents own them; you won't rank.
- Mass low-quality AI content — helpful-content updates punish it. Fewer, better.
- A blog subdomain — keep everything on the root domain.
- Polishing the blog before the foundation + trade pages exist.

## Measure
Search Console (impressions → clicks → position, by query), a light rank tracker, GA4/Plausible,
and the only metric that matters: **trial signups attributed to organic.**

---

### First-week action list
1. Kill the Tailwind CDN → static CSS. 2. Compress logo + images. 3. Add robots.txt + sitemap.xml +
canonical + JSON-LD + OG image. 4. Verify Search Console, submit sitemap. 5. Decide Astro vs Next.js.
6. Ship 3 trade pages (roofers, plumbers, HVAC) + the missed-call calculator. Blog posts come after.
