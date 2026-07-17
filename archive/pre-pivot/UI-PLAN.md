# UI Upgrade Plan — richer components for the home page

> Goal: fix the weak, text-only "What Sarah does" section and add real visual components,
> using quo.com, didit.me, and cluely.com as references. Screenshots reviewed live.
> Everything below is a build spec — nothing built yet.

## What we're adding (4 components)

| # | Component | Inspiration | Where it goes |
|---|-----------|-------------|---------------|
| **A** | Below-hero video frame | cluely.com (framed product bleeding up from the hero) | Directly under the hero, before "The Insight" |
| **B** | "Everything Sarah handles" radial hub | didit.me "One API for identity and fraud" | Top of the "What Sarah does" section |
| **C** | Feature cards with mini-UIs | quo.com "Always say Hello" cards | Under the radial hub, replacing the plain text lists |
| **D** | Restructure "Meet Sarah" — compact chat beside the text | didit.me "Integrate in a single prompt" | Replaces the current big, centered Sarah demo |

New home order becomes:
**Hero → [A] Video → The Insight → Meet Sarah (demo) → [B] Radial hub + [C] Feature cards → Day-one ROI → Offer → Trades → Founder → FAQ → CTA**

---

## A. Below-hero video frame  *(cluely-style)*

**What cluely does:** a big rounded macOS-window frame holding the product, sitting on a bright
gradient glow, pulled up so it overlaps the bottom of the hero (the "rising screen" effect).

**What we build:**
- Full-width section right after the hero. Subtle **green radial glow** behind it (reuse the
  `hero-radial` idea, tinted brand-green).
- A **16:9 frame**, `max-w-4xl` (~900px), centered, pulled up into the hero with a negative top
  margin (`-mt-10 md:-mt-16`) so it "rises" from the hero like cluely's.
- Frame chrome: rounded-`[1.75rem]`, `bg-black` bezel (thin) → inner rounded video area; big soft
  shadow (`0 40px 90px -30px rgba(16,24,40,.4)`). Optional mac traffic-light bar on top for the
  "app" feel — but a clean bezel reads more like a demo video, which is what this is.
- **Content:** a `<video>` with a **poster image** + a centered **play button** overlay. Click →
  plays inline (`playsinline`, `controls` once playing). Muted-autoplay-loop is an option if you
  want it to move without a click.
- **Placeholder now:** ship a poster (`/video-poster.jpg`) with the play button; you drop the real
  file at `/public/sarah-demo.mp4` (or paste a Loom/YouTube URL and we swap to an iframe embed).

**Markup shape:**
```
<section class="relative">
  <div class="green-glow absolute inset-0"></div>
  <div class="max-w-4xl mx-auto px-5 -mt-10 md:-mt-16 relative">
    <div class="rounded-[1.75rem] bg-ink-900 p-2 shadow-[…]">
      <div class="relative rounded-[1.4rem] overflow-hidden aspect-video bg-black">
        <video poster="/video-poster.jpg" playsinline preload="none">…</video>
        <button class="play-overlay">▶</button>   <!-- centered, glassy -->
      </div>
    </div>
  </div>
</section>
```

**Assets from you:** the video file (mp4) + a poster frame (or just the video and we grab a poster).
**Effort:** small (~1 component + a tiny play/pause script).

---

## B. "Everything Sarah handles" radial hub  *(didit-style)*

**What didit does:** a central 3D "DIDIT API" node, with feature satellites (KYC, AML, Business
Verification, Transaction Monitoring…) as labeled icon-circles orbiting on a ring, joined by faint
connector lines. Reads instantly as "one thing, many capabilities feed it."

**What we build:** the same idea, but **Sarah in the center** and every capability orbiting her —
the single best visual for "one assistant runs all of it."

- **Center node:** a rounded-square green tile (the brand mark / a check or a chat glyph), label
  **"Sarah"** under it. Soft green glow.
- **Orbiting nodes (~12):** Website · SEO & AI search · Blog posts · Social · Lead response ·
  Quotes · Scheduling · Invoicing · Reviews · Follow-ups · CRM · Your team. Each = a small white
  circle with a line-icon + a text label, placed evenly around a ring, connected to the center by a
  1px faint line.
- **Style:** monochrome/ink icons, one or two green accents, faint concentric ring behind — clean,
  not busy.
- **Motion (ships — not optional):** a very slow rotation of the ring **and** a gentle green pulse
  traveling down each connector line toward the center. It should feel alive — like every capability
  is continuously feeding Sarah. (Respect `prefers-reduced-motion`: freeze it for those users.)
- **Responsive:** the ring math only works on wide screens. On mobile, **collapse to a simple
  wrapped grid** of the same icon+label chips (no orbit).
- **Copy above it:** keep the eyebrow "What Sarah does" + headline. Add a one-liner like *"One
  assistant. Everything below runs through her."*

**Implementation:** position nodes with CSS using `top/left` computed from an angle (a small Astro
loop over the feature list computes `cos/sin`), connectors as absolutely-positioned rotated lines or
one SVG layer. Build the layout first, then the ring rotation + connector pulses (both ship).
**Effort:** medium (the geometry, the motion, and the responsive fallback are the work).

---

## C. Feature cards with mini-UIs  *(quo-style)*

**What quo does:** each feature is a card with a **title**, a **text link ("Get a number →")**, and
a **small, real-looking UI of that feature** at the bottom (phone numbers with country flags, a
call-routing tree, an analytics bar chart). The mini-UI is what makes it feel designed, not listed.

**What we build:** replace the four plain text-list cards with **6 rich cards**, each showing a
tiny mock of that capability. Pick the 6 most visual/important; the rest live in the radial hub (B).

| Card | Mini-UI to draw (small, faked, on-brand) |
|------|------------------------------------------|
| **Answers your leads** | 2–3 iMessage bubbles (gray in / green out) + a "Replied in 57s" chip |
| **Drafts your quotes** | a small quote card: "Miller roof — full replacement", **$14,200**, a green "Sent ✓" pill |
| **Gets you reviews** | a review-request text with the owner photo + ⭐️⭐️⭐️⭐️⭐️ and "New review" toast |
| **Builds your website** | a tiny browser window (traffic lights + URL bar) showing a mini site hero |
| **Writes your blog posts** | a mini blog-post card: job photo + "New post · published" + a small Facebook re-share chip |
| **Runs your schedule** | a mini day list: 3 routed stops (9:00 Newton · 11:30 Brookline · 2:00 Waltham) + "shortest drive" |

- **Card layout (each):** icon/eyebrow → title (17–18px) → one plain line of copy → the mini-UI
  pinned to the bottom in a subtle inset (`bg-paper-100` rounded, faint border). Same card system we
  already have (`.card`), so it stays consistent.
- **Grid:** `md:grid-cols-2 lg:grid-cols-3`, generous gap. Hover lift (`.card-hover`).
- **Below the grid:** "…and more, as we build it with you." (keep the open-ended line.)

**Note:** these mini-UIs are small static mockups (divs/SVG), not real data — same trick quo uses.
**Effort:** medium-large (6 bespoke mini-UIs is the bulk of the work, but each is small).

---

## D. Restructure "Meet Sarah" — compact chat beside the text  *(didit-style)*

**What didit does ("Integrate in a single prompt"):** a **two-column** layout — a clean, **compact**
chat widget on one side (small header with a `LIVE` status tag + a little action button, the
conversation, and a prompt input bar), and the explaining copy on the other side (eyebrow, headline,
paragraph, link). The chat is small and tidy — it sits *next to* the text, it doesn't dominate.

**What's wrong with ours now:** the Sarah demo is a big centered app-window with the text stacked
above it. It eats the whole viewport and reads heavy. We already have the right *words* — the
positioning and the size are the problem.

**What we build — move to didit's layout:**
- **Two columns** (`lg:grid-cols-2`, `items-center`, big gap):
  - **Text side:** eyebrow "Meet Sarah" → headline "Text Sarah. She handles it." → subhead → the
    two **toggle chips** ("You, running things" / "Sarah, answering leads").
  - **Chat side:** a **compact** chat widget, `max-w-[400–440px]`:
    - header row — small avatar + "Sarah" + a green **● Live** tag,
    - the animated conversation at a **smaller height** (~360px, down from 440),
    - a faux input bar at the bottom ("Message Sarah…" + a green send button) for the real-app feel.
- **Mobile:** stack — text first, compact chat below.
- Keep the two-mode toggle + auto-play; it's just smaller and beside the text now.
- Chat-left / text-right or the mirror — either works; I'd match didit and put the **chat on the
  left**, text on the right.

Net effect: the demo shrinks, sits beside its explanation like didit's, and reuses all the copy we
already wrote.

---

## Build order & effort

1. **D — Restructure the Meet-Sarah demo** (small–medium). Shrinks the chat + puts it beside the text; fixes the heaviest problem first.
2. **A — Below-hero video** (small). Unblocks you dropping the video in.
3. **C — Feature cards with mini-UIs** (medium-large). Biggest visual upgrade to the weak section.
4. **B — Radial hub, animated** (medium). The "wow" breadth visual above the cards.

Each ships as its own component; I'll screenshot after each so you can react before moving on.

## What I need from you
- The **video** (mp4) + optionally a poster frame — for component A. (Placeholder ships without it.)
- Any of the 6 feature cards in **C** you'd swap for a different capability.
