# 03 — Website: your site, live — and you build on it by talking to Sarah

> Module: `website` · route `/website` (marketing cluster, 00 §2) · status `preview` (demo) /
> `coming_soon` (real partners until the builder ships). Builds on `00-foundation.md` (shell,
> widget, gating, seam, cast — this doc owns `Site`, `SeoSnapshot` per 00 §6, plus module-local
> `SitePage`, `SiteVersion`, `SiteEdit`). Fronts FEATURES.md Pillar 1: **Website builder (XL)** +
> **SEO & AI search (L)**. Sales promise: *"First, we build your website"* (REBRAND §3.5) — and
> the product truth *"we set it up for them (they can still change things)."*

## 1. Purpose

The org's website, shown **live inside the app** — and buildable on, Lovable-style: the owner
sits in a split view with Sarah on one side and a live preview of the site on the other,
describes a change in plain words ("make the hero photo the Miller roof", "add a page for
gutter work"), watches the draft update in the preview, and hits **Publish** when it looks
right. We build the site first (done-for-you); this page is how Marcus keeps building on it
without a developer — by conversation, with his own eyes on the result. A second tab answers
*can people find me?* — rankings, Google Business Profile, and whether AI assistants mention
Apex when someone asks for a roofer nearby.

**Real today vs. mock:** entirely preview/mock. No hosting, templating, edit pipeline,
draft-preview infrastructure, rankings source, or AI-visibility check exists — `Site`,
`SitePage`, `SiteVersion`, `SiteEdit`, `SeoSnapshot` all `map from: none (new)`. The only
adjacent real data is leads with `Lead.source = 'website'`. Ships as `preview` on
`fixtures/apex.ts` (including a canned draft version so the demo shows the full
describe → preview → publish loop); `coming_soon` for real partners until the builder ships.

## 2. Layout

**A takeover workspace, not a page** (Levi, 2026-07-12 — matched against the real Lovable UI):
opening Website replaces the whole app shell. The nav sidebar is GONE — the chat column takes
its place — and the rounded page frame is gone too; the builder owns the full viewport. **← Back**
(top-left) returns to the app. The global widget launcher is hidden here (the chat IS the left
column). Implementation: `/website` lives in its own route layout OUTSIDE the `(app)` shell
group (00 §7).

Two modes, as pills in the top bar: **Site** (default) and **Performance**.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ←  apexroofingma.com  [Site|Performance]  Home ▾ 🖥📱⟳↗  ●Draft ⋯ [Publish]│
├──────────────┬─────────────────────────────────────────────────────────────┤
│ (chat, naked │                                                             │
│  on the shell│    ┌───────────────────────────────────────────────────┐    │
│  background) │    │                                                   │    │
│              │    │      the canvas — a floating rounded surface,     │    │
│ You: put the │    │      iframe of the DRAFT version                  │    │
│  copper gut… │    │                                                   │    │
│ Sarah: Done —│    │                                                   │    │
│  take a look │    │                                                   │    │
│  → preview.  │    │                                                   │    │
│              │    └───────────────────────────────────────────────────┘    │
│ (chips)      │                                                             │
│ [Ask… ➤]     │                                                             │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

- **Top bar** (one slim row, the only chrome): ← back + the domain; the Site/Performance pills;
  the preview controls — page switcher, device toggle, refresh, open-preview-in-new-tab (Site
  mode only); then the draft/live chip, an overflow ⋯ (Version history · View live site ·
  Discard draft), and **Publish** — the loudest button on the screen, top-right, exactly where
  Lovable puts it. **Phone view = a real device mockup** (the shared `PhoneFrame` — bezel,
  notch, status bar; Levi 2026-07-12), never just a narrowed pane.

- **Left: the site chat.** This is Sarah (see §3) with website context pinned — same bubbles
  and composer as the widget, scoped chips. It sits NAKED on the shell background: no card, no
  border, no boxed header — full column height, chips above the composer, composer pinned at
  the bottom (Lovable's chat column). The conversation doubles as the **edit log**: every
  applied change is a Sarah reply anchored to a `SiteEdit`, so "what changed and why" reads as
  a thread, not a table.
- **Right: the canvas.** The preview as a **floating rounded surface** with shadow and breathing
  room on the shell background (the Quo-frame language) — never a bordered box with a toolbar
  crammed on top. An iframe of the **draft version** when one exists, else the published site;
  all its controls live in the top bar.
- **Draft model (Lovable-style):** edits never touch the live site. Sarah's changes stack onto
  one open **draft version**; the preview always shows it; Publish makes it live in one step.
  There is exactly one open draft at a time — more edits extend it.
- **Version history:** sheet listing `SiteVersion`s (summary, when, by whom), newest first;
  **Restore** re-opens an old version as a new draft (never mutates history).
- **Performance mode:** the pill swaps the CANVAS (the chat column stays put — like Lovable's
  More→Analytics view). Content: hero stats row — 30-day visits sparkline + total (1,284), **leads from
  your site** (12 → links `/crm?source=website`) — then the **Visibility panel**: keyword
  rankings with delta arrows ("roofer newton ma" #3 ▲2), Google Business Profile status
  (✓ Connected · 4.9★ · 27), and **AI answers** as one human sentence (*"Ask ChatGPT for a
  roofer in Newton and Apex comes up."*) with the plumbing (structured data, llms.txt, sitemap)
  behind a "details" disclosure. Footer: snapshot date.

**Mobile:** still the takeover — canvas on top (full-width, device toggle hidden, page switcher
kept in the bar), chat below as the primary interaction. The top bar stays (back · pills ·
Publish), so no sticky publish bar is needed. Performance mode stacks stats → visibility. No
widget launcher here — the site chat IS the Sarah surface on this screen.

## 3. Sarah

This page is the clearest expression of "text Sarah, or use the app — same assistant."

- **The site chat IS Sarah** — not a separate builder bot. Turns from this pane carry
  `context: { module: 'website', entityId: <pageId> }` (00 §3) and land in the ONE owner thread
  (02-sarah), tagged like any other turn. The pane simply filters the thread to site-context
  turns so it reads as a focused building session.
- **The loop:** instruction → Sarah applies it to the draft (engine + site pipeline) → her reply
  confirms in plain words and the preview refreshes → iterate → **Publish**. If a change takes
  more than a beat, she says so (*"Working on it — the preview will flash when it's ready"*)
  rather than leaving a spinner (see §8 Q3 on turnaround).
- **Publish is the hard gate.** Nothing Sarah does here goes live on its own: on-page, the
  owner's **[Publish]** click is the explicit yes (00 §3's gate, satisfied visually instead of
  via a card). Off-page asks — Marcus texts *"add spring cleanup to the services page"* from
  his truck, or asks via the widget elsewhere — stage the same draft AND an
  `Approval(kind: 'site_edit')` card whose **[Review]** deep-links into this builder with the
  draft in the preview; approving there = Publish. On SMS, Sarah also texts back a **view-only
  preview link** (`/p/[token]` — security posture in §5): *"Done — here's how it looks:
  app.leadanswered.com/p/… Say yes and I'll publish it."* The owner's "yes" reply is the same
  code-gated approval the SMS hard gate already runs (his phone number is the authenticated
  identity on that channel). One gate, three doors — builder Publish, approval card, SMS yes —
  all resolving the same `Approval` exactly once (02-sarah §7 race rule).
- **What she does autonomously:** nothing user-visible. Draft-building, image optimization,
  SEO plumbing (structured data, llms.txt) happen without asking — they're below the waterline
  and reversible.
- **Suggestion chips** (`MODULES['website'].sarahChips`): *"Add a page"* · *"Change the hours"*
  · *"New hero photo"* · *"How do I look on Google?"* (switches to Performance).
- **SarahActions emitted:** *"Published apexroofingma.com v14 — added Copper gutters section"*
  (deep link here); weekly *"Your site: 312 visits, 4 leads"* digests are Analytics' concern (11).

## 4. Data contract

Owned here: `Site`, `SeoSnapshot` (00 §6 registry) + module-local `SitePage`, `SiteVersion`,
`SiteEdit`. All `maps from: none (new)` — this module has no existing tables.

```ts
interface Site {
  id: string
  organizationId: string
  domain: string                        // "apexroofingma.com"
  status: 'building' | 'live'
  publishedVersionId: string
  draftVersionId?: string               // at most ONE open draft
  previewUrl: string                    // the tokenized /p/[token] URL for a given version —
                                        //   ONE page serves the in-app iframe AND Sarah's
                                        //   texted link (view-only, signed + expiring; §5)
  visits30d: number
  visitsSeries: number[]                // daily, last 30 days
  leadsFromSite30d: number              // derived: count Lead.source='website' in window
  leadsSeries: number[]                 // daily new site leads; charted as the CUMULATIVE climb
}

interface SitePage {
  id: string
  siteId: string
  title: string                         // "Home", "Roof Replacement", "Gallery"
  path: string                          // "/", "/roof-replacement"
  status: 'live' | 'building'
  updatedAt: string
  updatedBy: 'sarah' | 'system'
}

interface SiteVersion {
  id: string
  siteId: string
  number: number                        // v14
  summary: string                       // "Added Copper gutters section to Services"
  createdAt: string
  publishedAt?: string                  // unset = the open draft or a superseded draft
  editIds: string[]
}

interface SiteEdit {                    // one instruction Sarah applied
  id: string
  versionId: string
  instruction: string                   // the owner's words, verbatim
  summary: string                       // what Sarah actually did
  pageIds: string[]
  status: 'draft' | 'published' | 'discarded'
  approvalId?: string                   // set only for off-page asks (Approval kind 'site_edit')
  at: string
}

interface SeoSnapshot {
  siteId: string
  checkedAt: string
  keywords: Array<{ term: string; position: number | null; delta: number }>
  gbp: { connected: boolean; rating?: number; reviewCount?: number }
  aiAnswers: { visible: boolean; sentence: string }   // the one human sentence
  plumbing: Array<{ label: string; ok: boolean }>      // structured data, llms.txt, sitemap…
}

interface WebsiteProvider {             // data/website/provider.ts per 00 §5
  getSite(organizationId: string): Promise<Site>
  listPages(siteId: string): Promise<SitePage[]>
  listVersions(siteId: string): Promise<SiteVersion[]>
  listEdits(siteId: string, limit?: number): Promise<SiteEdit[]>
  getSeoSnapshot(organizationId: string): Promise<SeoSnapshot>
}
```

Fixture anchors (`fixtures/apex.ts`): site `live` at v13; an OPEN DRAFT (v14) containing the
copper-gutters edit (tied to `esc_301`'s story) so the demo can Publish; version history v11–v13
(Miller gallery photos — published 2d; hours change — published 6d; launch); pages Home ·
Roof Replacement · Roof Repair · Gallery · Reviews · Contact; visits 1,284/30d; 12 site leads
(Dana Miller and Linda Tran among them); keywords/GBP/AI-answers as drawn in §2.

## 5. Actions

| Action | Surface | Mechanism | Sarah's engine? |
|---|---|---|---|
| Ask for a change | site chat composer / chips / widget / SMS | `POST /sarah/turn` with website context (02-sarah) → engine + site pipeline extend the draft → preview refreshes | **Yes** |
| Open a texted preview link | `/p/[token]` — public, outside the app shell | GET renders that version read-only; no session, no actions, no state change | No |
| Publish | preview toolbar / sticky bar (mobile) / approval card / SMS "yes" (off-page) | server action → api (HMAC-`cid`): promote draft → published; emits `SarahAction` | No model call — code publishes (the explicit yes) |
| Discard draft | overflow menu, confirm dialog | server action → api; draft edits → `discarded`; Sarah acknowledges in-thread next turn | No |
| Restore a version | version history sheet | server action → api: old version → NEW draft; preview switches to it | No |
| Switch page / device | top bar | client-side (iframe src param / width) | No |
| View live site | top bar ⋯ menu | external link, new tab | No |
| View leads from site | Performance stat | link `/crm?source=website` (filter owned by 05) | No |
| Expand SEO details | Visibility panel | client-side disclosure | No |

**Preview links — the security posture (decided 2026-07-12): the link *shows*, it never *does*.**
`/p/[token]` is **view-only** — it carries zero publish power, so a leaked or forwarded link can
only ever show a draft of a site that's about to be public anyway. Publishing happens ONLY through
the existing gates (builder [Publish] · approval card · SMS "yes", §3). Mechanics: the token is
HMAC-signed (the existing `cid`/`signState` pattern — no new auth machinery), encodes
`{ organizationId, siteId, versionId, exp }`, and expires (~7 days). Rules that must hold:
**side-effect-free on GET** — SMS apps and carriers prefetch every texted URL, so a fetch must
never change state, publish, or count as "seen"; **`noindex`** so drafts stay out of Google;
**one consistent domain** (`app.leadanswered.com/p/…`) so the owner learns what a real Sarah link
looks like (cheap phishing hygiene); **version-scoped** — an old link shows its old version, never
silently the newest draft; expired → the §7 expired state, never an error page.

**Mock behavior** (00 §5): the preview iframe serves fixture snapshots (a static rendering per
version); "ask for a change" replies from a scripted Sarah and flips the fixture draft;
Publish/Discard/Restore mutate nothing — optimistic UI + toast + a fake `SarahAction`, so the
full loop demos end-to-end. The texted-link flow demos too: a fixture token (`/p/demo_v14`)
renders the same snapshot the iframe shows.

## 6. Components

From 00 §8: `StatusBadge`, `EmptyState`, `StatCard`, sonner toasts, `dialog` (discard confirm),
`sheet` (version history), `dropdown-menu` (page switcher, overflow). **No `PageHeader`, no
`Tabs`** — the takeover top bar replaces both (§2). Reused from 02-sarah: the chat
bubbles/composer (`SarahMessage` rendering) — the site
chat must not fork the widget's components. **New, this module owns:** `BuilderTopBar` (back ·
pills · preview controls · draft chip · ⋯ · Publish), `PreviewCanvas` (the floating iframe
surface: device width + busy shimmer),
`VersionHistorySheet`, `SparklineStat` (shared with 11-analytics if it wants it), and the
`/p/[token]` **public preview shell** — full-bleed version render under a slim "Draft — not
published yet" bar, `noindex`, outside the `(app)` route group (00 §7, sibling of `/q`/`/i`).
Flag: none of these exist in the kit yet.

## 7. States

- **`coming_soon`** (real partners pre-build): `GatedState` teaser — *"A fast, modern site,
  built fresh. Every lead flows straight to Sarah."* + Ask Sarah.
- **`preview`** (demo): full builder on fixtures — no banner or badge (00 §4).
- **`live`, `status: 'building'`** (we're mid-build): THE moment this page earns trust — the
  preview shows the in-progress draft (*"We're building apexroofingma.com now — watch it take
  shape, and tell Sarah anything you want different."*). The build is a spectator sport, and
  the owner can steer it by chat before launch. Pages list shows `building` rows; Visibility:
  *"We're setting this up for you — rankings start once the site is live."*
- **`live`, no draft:** preview shows the published site; Publish hidden; chat invites:
  *"Want something changed? Just say it."*
- **Draft open:** draft chip + Publish visible everywhere the preview is; leaving the page
  loses nothing (the draft persists server-side).
- **Edit in flight:** Sarah's typing indicator in the chat + a subtle shimmer on the preview;
  on completion the preview flashes/refreshes. On pipeline failure: Sarah says it in-thread
  (*"That one didn't take — trying again"* / escalates to us), never a dead spinner.
- **Preview fails to load** (iframe error): fall back to the latest screenshot + *"Preview
  hiccup — your live site is fine."* with retry.
- **Expired preview link** (`/p/[token]` past its TTL, opened from an old text): *"This preview
  has expired — text Sarah for a fresh link."* Calm read-only page, never an error screen; the
  GET changes nothing (§5).
- **Publish in flight / already published elsewhere:** optimistic; conditional update loses →
  toast *"Already published"* and chip resolves (same race rule as approvals, 02-sarah §7).
- **Errors/loading:** route `loading.tsx` skeleton (split view with shimmer panes); mutations
  toast success + failure (00 §8).

## 8. Open questions

1. **Preview infrastructure** — what renders the draft: a per-org draft deployment (real iframe,
   Lovable-style, heavier infra) vs. server-rendered snapshot pages (cheaper, less alive)?
   Shapes `previewUrl` and the whole builder feel; decide in the Website-builder dev plan.
2. **Edit scope v1** — copy, photos, sections, pages, hours (spec'd) vs. full layout/theme
   redesigns by chat. Recommend: content + sections v1; structural redesigns come to us
   (Sarah escalates: "I'll have Levi look at that").
3. **Turnaround UX** — Lovable feels seconds-fast; our pipeline may take minutes at first. If
   >~15s, Sarah should set expectations in-thread and (off-page) text when the preview is ready.
   Confirm the async posture so the UI isn't designed around a speed we can't hit.
4. **Page creation from chat** ("add a gutter-work page") — allowed v1 (spec assumes yes,
   it's the same pipeline) or gated to us initially?
5. **Rankings + AI-visibility data source** — Search Console / rank-tracker API vs. hand-curated
   during the design-partner phase (Performance tab is honest either way; snapshot is dated).
6. **GBP ownership** — proposal stands: Reviews (09) owns the GBP *connection*; this page only
   reads `SeoSnapshot.gbp`.
7. **Version retention** — keep all versions forever (cheap, simple) or cap with pruning?
   Affects the history sheet only.
