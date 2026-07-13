# 04 — Content: blog + social (`/content`)

> Module spec per `../APP_UI_PLAN.md` §4. Builds on `00-foundation.md` (shell, widget, gating,
> data seam, shared types — referenced, never redefined). Fronts **FEATURES.md Pillar 1: Blog
> posts (M) + Social posting (M)**. Product truth source: `../landing-page/REBRAND-PLAN.md`
> §3.3 (Mode A demo) and §3.4 (Get found copy).

## 1. Purpose

Content makes the content engine's core loop visible: the owner texts Sarah photos from a
finished job → she drafts a blog post for the client site (plus a shorter, casual Facebook
version) → the owner reads it here, edits if he wants, approves → it's live on the site and
posted to Facebook (IG/GBP later). It makes two sales promises literal — *"Blog posts —
Finished a job? Text Sarah the photos and she writes a post about it."* and *"Social — She'll
post it to Facebook too."* (REBRAND §3.4) — and it is the in-app half of the §3.3 Mode A demo
beat: *"Just wrapped the Miller job — here are a few photos… write a blog post about it"* →
drafted → *"want it live on the site and posted to Facebook?"*. The page is where you **read
the full draft** (the widget/Sarah page show the same items as compact approval cards), see
everything already published and where it went, and see the month ahead on a small calendar.
The owner never writes from scratch here — Sarah is the author; the app is where you approve,
tweak, and watch it work.

**Real today vs. mock:** entirely mock. No `Post`/`SocialPost` tables, no site CMS (depends on
the Website builder, per the FEATURES dependency chain Website → SEO → Blog → Social), no Meta
integration, no scheduling worker. The whole page runs on `fixtures/apex.ts` through
`content/mock.ts`; default status `coming_soon` for real partners, `preview` in demo mode.

## 2. Layout

Route `/content` (marketing cluster, 00 §2). Three tabs; drafts-first because that's what
needs the owner.

> **Redesigned 2026-07-12 (Levi):** content items are **DECOUPLED** — a blog post and a
> Facebook post are separate cards with separate yes/no's, even when Sarah drafted both from
> the same job (she used two tools; the job is provenance, not structure). The page shows the
> CONTENT ITSELF, never metadata about it: every card is post-shaped, and the click-through
> preview renders the real artifact in a **phone mockup** (the shared `PhoneFrame`, same
> device language as the landing-page demo and reviews' AskPreview). No "Approve both."

```
┌────────────────────────────────────────────────────────────────────────┐
│ PageHeader: Content            (f Facebook — Apex Roofing ✓)           │
├────────────────────────────────────────────────────────────────────────┤
│ [ Drafts (2) ]   [ Published ]   [ Calendar ]                          │
├────────────────────────────────────────────────────────────────────────┤
│ ┌── card: post-shaped ───────────────┐ ┌── card: post-shaped ────────┐ │
│ │ (A) Apex Roofing · 2:14 PM  [Blog] │ │ (A) Apex Roofing   [Facebook]│ │
│ │ A full roof replacement in Newton  │ │ Another Newton roof done     │ │
│ │ When the Millers called about…     │ │ right ✅ 20 years old,       │ │
│ │ ▣ lead photo                       │ │ replaced in two days…        │ │
│ │ apexroofingma.com/blog · draft     │ │ ▣ photo   👍 💬 ↗ (grayed)   │ │
│ └────────────────────────────────────┘ └──────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

- **Every card is the same post-card anatomy** — avatar + "Apex Roofing" + time up top, the
  text, the photo — so blog and Facebook items read as siblings; the **kind chip** (KIND_META:
  pink Blog post · cyan Facebook post) is the identity. A blog card's footer shows its site
  destination; a Facebook card's footer shows the grayed like/comment/share row. Cards show
  the CONTENT (title + opening lines / the actual FB text), never an "excerpt" in quotes.
- **Drafts tab** — every pending item (kinds `'post'` and `'social_post'`), independent cards,
  chip "waiting on you." Click → the preview (below), where approve/edit/decline live.
- **Published tab** — same cards with proof: status chip + stats ("214 views" / "12 likes ·
  3 comments") + overflow (view on site / on Facebook / ask Sarah to repost).
- **Calendar tab** — the **same calendar grammar as Schedule** (Levi 2026-07-13): the shared
  `CalendarMonth` (extracted from 07's month view — Monday-first bordered grid, today pill,
  labeled item rows, org-timezone dates), showing only content items with their kind dots
  (blog pink · Facebook cyan). Click an item → the phone-preview overlay; **drag a scheduled
  post to another day to reschedule it** (published items are past — fixed). And the reverse
  lens: Schedule's toolbar gets a "Posts" toggle overlaying these items on the business
  calendar (07 §2).

**Preview** — opens as an **overlay on the feed** (card click → dialog, no navigation — Levi
2026-07-12); `/content/[id]` renders the same surface for deep links (posts AND social posts
share the route). The artifact rendered in a **`PhoneFrame`** — a Facebook post as it appears in the Facebook app; a blog post as the
mobile article on apexroofingma.com (site header, headline, photos, body). Beside the phone
(below, on mobile): the kind chip + status, **[Put it on my site] / [Post to Facebook]**,
**[Edit]** (flips the phone screen to editable title/body in place), **[Schedule…]**,
**[Not this one]**. Published items: same phone, read-only, permalink + stats instead of
actions.

- **Mobile:** cards stack single-column; the preview puts the phone first, actions as a
  sticky bar below. The Calendar tab collapses to a chronological agenda list. Sarah launcher
  stays bottom-right (foundation §2).

## 3. Sarah

Sarah is the author; this page is her drafts folder and portfolio.

- **What she did** — `SarahAction` rows (Home/`/sarah` activity feed) from this module:
  "Drafted a blog post from the Miller job photos", "Published *A full roof replacement in
  Newton* + posted it to Facebook" (`module: 'content'`, `href` → the post detail).
- **What she's asking** — the drafts list *is* her pending `Approval`s (kinds `'post'` and
  `'social_post'`). Identical items surface as cards in the global widget and on `/sarah`;
  approving in any surface resolves everywhere. The widget card's **Edit** button hands off
  here (`/content/[postId]`) — the widget is for yes/no, this page is for reading and editing.
- **What you can tell her** — everything generative goes through her, not forms: "make it
  shorter", "mention the ice-dam damage", "redo the Facebook one, less salesy", "post the
  hail-damage post again", "write a post about the Waltham job". The `[Ask Sarah for a post]`
  header button opens the widget pre-focused with a drafting prompt.
- **Widget contract** (foundation §3): suggestion chips (`MODULES['content'].sarahChips`):
  *"Draft a post from my last job's photos"* · *"What's going out this week?"* · *"Change
  something in the Miller draft"*. Actions that arrive as approval cards: blog-post draft
  (`'post'`), social draft (`'social_post'`). Page context sent from detail:
  `{ module: 'content', entityId: postId }` so "make it shorter" needs no title.

## 4. Data contract

Owned here per foundation §6: **`Post`**, **`SocialPost`** (+ their satellites below).
References — never redefines — `Approval`, `SarahAction`, `Contact` from `00-foundation.md`.

```ts
type PostStatus = 'draft' | 'scheduled' | 'published' | 'declined'

interface PostPhoto {
  id: string
  url: string                      // maps from: Twilio MMS media (future: re-hosted in Supabase Storage)
  alt: string                      // Sarah writes these (SEO)
  width?: number; height?: number
}

interface Post {
  id: string                       // maps from: none (new Post table)
  title: string
  slug: string
  bodyMd: string                   // markdown; rendered in-app and on the client site
  excerpt: string                  // first-line teaser for cards
  photos: PostPhoto[]
  seo: { metaTitle: string; metaDescription: string }   // the SEO snippet in detail
  status: PostStatus
  approvalId?: string              // pending Approval (kind 'post'); the drafts-list join
  contactId?: string               // the job's customer (e.g. ct_dana) — links to /crm/[id]
  sourceSummary?: string           // "From 4 photos Marcus texted after the Miller job"
  socialPostId?: string            // paired Facebook variant, if Sarah drafted one
  scheduledFor?: string            // ISO; set by Schedule…
  publishedAt?: string             // ISO
  publishedUrl?: string            // maps from: Site domain (03-website) + slug
  stats?: { views: number; clicks: number }   // stub; maps from: site analytics (later)
  createdAt: string
}

type SocialNetwork = 'facebook' | 'instagram' | 'gbp'   // facebook only at launch

interface SocialPost {
  id: string                       // maps from: none (new SocialPost table)
  postId?: string                  // parent blog post; optional → standalone posts later
  network: SocialNetwork
  body: string                     // the shorter, casual variant
  photoIds: string[]               // subset of the parent Post.photos
  status: 'draft' | 'scheduled' | 'posted' | 'declined' | 'failed'
  approvalId?: string              // pending Approval (kind 'social_post')
  scheduledFor?: string
  postedAt?: string
  permalink?: string               // maps from: Meta Graph API response (later)
  stats?: { likes: number; comments: number; shares: number }  // stub; Meta insights (later)
  createdAt: string
}

interface ContentProvider {        // data/content/provider.ts (foundation §5 seam)
  listDrafts(): Promise<{ post: Post; social?: SocialPost }[]>
  listPublished(): Promise<Post[]>            // includes their SocialPosts via socialPostId
  getPost(id: string): Promise<{ post: Post; social?: SocialPost } | null>
  monthItems(ym: string): Promise<{ date: string; postIds: string[]; status: PostStatus }[]>
  // mutations in §5
}
```

Fixtures (`fixtures/apex.ts`, the only home of mock entities — foundation §5): the flagship
**Dana Miller** arc as the pending pair — `post_301` *"A full roof replacement in Newton"*
(4 photos, `contactId: 'ct_dana'`, `approvalId` set) + `sp_301` (Facebook variant, pending) —
so a design-partner call can perform the REBRAND §3.3 approve-and-publish beat live. Published:
`post_299` *"Hail damage in Waltham: what we found and how we fixed it"* (3 weeks ago, Site +
Facebook, 214 views · 12 likes) and `post_300` *"Why we photograph your roof before we quote"*
(site only). Calendar shows those two plus the Miller pair once approved/scheduled.

## 5. Actions

All mutations toast (sonner) and, in mock, mutate nothing durable — they return success,
flip in-memory status, and enqueue a fake `SarahAction` so the demo feels alive (foundation §5).

| Action | Surface | Mock (`content/mock.ts`) | Real (`content/real.ts`, later) | Sarah's engine? |
|---|---|---|---|---|
| **Put it on my site** (`post`) | preview | resolve `Approval`, `status: 'published'`, set `publishedAt/Url`, toast "Live on apexroofingma.com", enqueue SarahAction | server action → HMAC-`cid` api call: engine resolves the hard-gate, publish tool writes to the site CMS (03-website) | **Yes** — approvals are the hard-gate; Sarah confirms in-thread ("Published — link on the way") |
| **Post to Facebook** (`social_post`) | preview | resolve `Approval`, `status: 'posted'`, fake permalink | api call: engine hard-gate → Meta Graph API post | **Yes** |
| **Decline** (either) | preview "Not this one" | `Approval → 'declined'`, item to status `'declined'` (kept, not deleted) | api call; Sarah acknowledges and can be asked to redo it via the widget | **Yes** |
| **Edit draft** (`updateDraft`: title/bodyMd; `updateSocialDraft`: body) | preview — Edit flips the phone screen editable | returns edited object, local state | server action, direct Post/SocialPost write | No — owner's own edit; Sarah sees the final text at approval |
| **Schedule…** (`schedulePost(id, date)`) | preview, date-picker | `status: 'scheduled'`, appears on the calendar | server action + worker job to publish at time (same hard-gate already satisfied) | No (approval already given) |

*(No "Approve both" — items are decoupled; wanting both is a thing you tell Sarah, not a
button. Approving a blog post and its sibling Facebook post are two independent yes's.)*

No "New post" editor: authoring is Sarah-only, by design (the promise is *text her the
photos*, not *here's a CMS*).

## 6. Components

From the kit / foundation §8: `PageHeader` (title, Facebook-connected chip in
the actions slot), `tabs`, `Card` + `StatusBadge` (`draft`/`scheduled`/
`published`/`posted`/`failed`), `EmptyState`, `GatedState`, `dialog` (photo lightbox,
composed), `popover` (calendar day peek), `calendar` + date-picker (the Schedule… action),
`dropdown-menu` (published-card overflow: view on site / view on Facebook / ask Sarah to
repost), `sonner`, `skeleton` via `loading.tsx`.

**Missing from the kit (flagging per template):**

- `CalendarMonth` — the shared events month grid (Schedule's month-view construction,
  generalized; one calendar language app-wide — supersedes the earlier one-off `MonthGrid`).
- `MarkdownView` — render `bodyMd` in-app (tiny built-in renderer; a markdown dependency
  arrives with the CMS, not before).
- `PhotoStrip` — thumbnail row + lightbox; composable from `dialog`, worth extracting since
  Quotes/Reviews will want it too.
- `PhoneFrame` — the shared device mockup (bezel + notch + status bar; the landing-page demo's
  language, generalized from reviews' AskPreview). Used here for both previews, and by
  03-website's phone view.
- `PostCard` / `FacebookPostBody` / `BlogPhoneScreen` — module-local: the post-shaped card and
  the two phone-screen renderings.

## 7. States

- **`coming_soon`** — `GatedState` teaser with the REBRAND §3.4 promise copy verbatim:
  *"Blog posts — Finished a job? Text Sarah the photos and she writes a post about it."* ·
  *"Social — She'll post it to Facebook too."* + "Ask Sarah about it" (opens the widget).
- **`preview`** (demo default) — full UI on the Apex fixtures, no banner or badge (00 §4).
- **Running, no data yet** (`live`, nothing drafted/published — never build-it-yourself):
  - Drafts tab: *"Nothing waiting on you. Text Sarah photos from your next finished job and
    her draft will land here."*
  - Published tab: *"We're setting up your blog now — your first post goes live the moment
    you approve one."* + "Ask Sarah for a post".
  - Facebook not yet connected: header chip reads *"Facebook — we're setting this up for
    you"* (dimmed); social variants show "will post once Facebook is connected" instead of
    Approve & post. No connect-it-yourself OAuth flow on this page — done-for-you, ask Sarah.
- **Error** — `(app)` group `error.tsx` (foundation §8); failed mutations toast failure. A
  `SocialPost` in `status: 'failed'` shows on its card with *"Didn't post — Sarah's retrying"*
  and a "Try again" action.

## 8. Open questions

1. **Approval ↔ entity linkage** — *resolved: 00 §6 `Approval` now carries a generic
   `entityId`* (this spec's `Post.approvalId` join still works; either direction resolves).
2. **One approval or two per drafted pair?** The §3.3 demo asks once ("live on the site and
   posted to Facebook?"). Spec assumes **two** `Approval`s (`post` + `social_post`) with an
   "Approve both" affordance — confirm, since it changes what the engine emits and the widget
   card shape.
3. **Scheduling in v1?** "Schedule…" needs a worker job and puts `scheduled` on the calendar.
   Cutting it makes approve = publish-now and the calendar published-only — meaningfully
   smaller build.
4. **Editing surface:** inline title/textarea Markdown editing (spec'd) vs. rich text — rich
   text is a new dependency and a bigger component.
5. **IG/GBP visibility:** `SocialNetwork` includes them — show as dimmed "coming soon" chips
   next to the Facebook chip, or hide entirely until built?
