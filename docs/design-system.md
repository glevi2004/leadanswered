# Lu Computer — Design System

> Part of the Lu Computer canon — see [COMPANY.md](../COMPANY.md).

**North star:** an editorial, Cofounder-flavored **org canvas rendered as pressable game-console hardware** — a
monochrome light/dark base where color appears only as soft-tint chips, **pixel used as an accent** (meters,
numerals, asset icons, hero art), and a **Wii + Apple material split**: neumorphic/glossy hardware you press,
frosted glass that floats above it. All-sans. "Like Cofounder & Browserbase, but more tactile."

The live component board is **`/dev/design`** (dev-only, light/dark toggle + `--neu-strength` knob). New
primitives live in `apps/web/src/components/ds/`. This doc is the spec; the board is the source of truth for
look. Material CSS recipes + the focused-site components are in **Depth & material recipes** below; the
per-component rollout map is **Component rollout (by tranche)** below.

---

## 0. The three locked decisions

| Fork | Decision | Consequence |
|---|---|---|
| **Pixel intensity** | **Pixel-accented editorial** | Clean neumorphic/editorial chrome. Pixel confined to a defined *pixel layer* (below). No pixel font, no blocky borders on chrome. |
| **Material metaphor** | **Wii + Apple, zoned** | Neumorphism + gloss for *tactile* things you press. Frosted **glass** for *floating* things (nav pills, overlays, dock). Each material has one job. |
| **Typography** | **All-sans, no serif anywhere** — incl. the wordmark | The "Lu" wordmark is Plus Jakarta Sans. Serif is fully retired. |

---

## 1. Material zoning — the core rule

The whole system reads as **two materials with clear jobs**. Never mix them on one element.

**NEU / GLOSS (the "Wii hardware" — tactile, opaque, pressable).** For anything you touch or that represents a
physical object on the canvas:
- `.neu-raise` + `.neu-socket` → department **nodes**, agent pillows (pillow-in-socket, dual light source).
- `.gloss` → pressable controls: chevrons, segmented actions, tabs' active pill, page-nav, small chips.
- `.gloss-ink` → the charcoal FAB (`+`), task pills, primary emphasis.
- `.btn-glow` (kept name) → the primary button slab.
- Press physics: `active:translate-y-px` (small), `.gloss:active` (inset + drop). Cards hover-lift `-2px`.
- Tunable via **`--neu-strength`** (0–1.6 on the board; ship default `1`).

**GLASS (the "Apple" — frosted, translucent, floating).** For anything that hovers *above* the hardware and
lets the scene show through:
- `.glass` → top-nav pills, command bar, floating panels, the Lu dock container.
- `.glass-ink` → dark frosted variant (dark bar over a bright canvas; achievement/`GamePill`).
- `.glass-hero` → frosted pane sized to sit over pixel-art hero scenes (marketing).
- Never gets a press state. Glass floats; it is not pressed.

> Rule of thumb: **if it sits on the canvas, it's neu/gloss. If it floats over the canvas, it's glass.**

---

## 2. The pixel layer — where pixel is allowed (and where it is NOT)

Pixel is a **signature accent**, exactly as Cofounder/Browserbase use it. It appears in these places only:

1. **Segmented meters** — `PixelMeter` (green→amber→red ramp). The single most recognizable Lu motif. `rows`
   stacks a denser pixel field.
2. **Flowing pixel motion** — the same pixel vocabulary, animated: `PixelLoader` (a travelling-wave / "booting
   up your company" loader) and `PixelVoice` (Lu's voice/activity equalizer — idle/listening/speaking). Lu's
   loading + voice language.
3. **Mono numerals** — big metrics in IBM Plex Mono (`234`, `10,291`, `58%`), `tabular-nums`.
4. **Pixel-art asset icons** — `PixelIcon` (folder/file/app/chart/sparkle), filled + blocky, in a glossy
   `PixelTile`. Reserved for *objects/assets* (files, artifacts, apps) — the deliberate opposite of the app's
   stroke line-icons (nav, actions).
5. **Dither / checker textures** — `.pixel-dither`, `.pixel-checker` behind hero blocks.

The landing hero is a **minimal editorial feature section** (ref: Cofounder "A full roadmap"): a left copy
column (pixel-folder tile → headline → muted paragraph → mono links) + a `.canvas-dots` dotted panel holding
`TaskStage`/`TaskCard` roadmap columns (one active card, the rest ghosted).

**Never pixel:** body/label typography, nav chrome, borders, form fields, line-icons, data tables. Chrome stays
clean editorial; pixel is the jewelry.

---

## 3. Foundations

### 3.1 Color
Base is **monochrome editorial** (`globals.css`); color is *only* soft-tint chips.

- **Neutrals** — Light: `--background #f0f0f0` · `--card #ffffff` · `--border #e4e4e4` · `--muted #ebebeb` ·
  `--foreground #2b2b2b`. Dark: `--background #1e1e23` · `--card #28282d` · `--border #323237` ·
  `--foreground #f0f0f0`.
- **Interactive accent (canonical, single):** **`#5b9bff`** — selection rings, active dots/rows, focus
  emphasis, range thumbs. *This is the one interactive blue.*
- **Semantic STATUS families** (by meaning; render as **12% bg / strong text** chip): gray=dormant ·
  blue=in-flight · violet=being-worked · emerald=good · amber=needs-an-eye · red=lost. Registry:
  `lib/dashboard-ui.ts`.
- **Categorical KINDS** (by type, one hue each, chip-only): message `#3B82F6` · quote `#8B5CF6` ·
  invoice `#10B981` · review `#F59E0B` · post `#EC4899` · site `#6366F1` · question `#F97316`. Registry:
  `ApprovalCard.tsx`.
- **Two-blues note:** `#5b9bff` (interactive/selection) and `#3B82F6` (categorical "message") are **separate
  scales by design** — one is chrome state, one is a data category; they never share a surface. Do not merge them.
- **Meter ramp:** green `hsl(135)` → amber → red `hsl(4)`, hue-interpolated per cell (`PixelMeter`).

### 3.2 Typography — all-sans
- **Sans:** Plus Jakarta Sans (`--font-sans`, also `--font-heading`) — greeting, H1s, body, labels, nav,
  wordmark.
- **Mono:** IBM Plex Mono (`--font-plex-mono`) — **numerals**, uppercase micro-labels, terminal empty states
  ("All caught up"), timestamps, code/URLs.
- **No serif** in the codebase. Do not reintroduce it.
- Numerals always `tabular-nums`.

### 3.3 Spacing, radii, elevation
- Radius base `--radius: 0.75rem`; scale `--radius-sm…-4xl` (×0.6…×2.6). Named: `--radius-frame 20px` (site
  frames), `--radius-node 26px` (agent pills), `--radius-pill 9999px` (floating pills).
- **Elevation ladder** (theme-flipping, light source = top): `.elev-1` resting card · `.elev-2` floating
  pill/button · `.elev-3` FAB / focused frame · `.elev-4` dock / popover / dialog. Each =
  `box-shadow: var(--elev-N), var(--bevel-top)`. Full token recipes in **Depth & material recipes** below.

---

## 4. Component catalog

### 4.1 Signature primitives — `components/ds/`
| Component | Purpose | Ref |
|---|---|---|
| `PixelMeter` | Segmented green→amber→red ramp meter. Full-ramp (decorative) or `value`-driven; `rows` for a denser field; tones `ramp/green/blue/violet/amber`; `sm/md`. | Cofounder "Sign ups" |
| `PixelLoader` | Flowing pixel meter — travelling-wave / "booting up your company" loader; `rows` → flowing field. Binary marching-band cells (snap on/off, no fade); embossed by default, opt-in `screen` = LCD panel + glow. | Lu motion language |
| `PixelVoice` | Lu's voice/activity equalizer — bottom-anchored rising pixel columns growing in discrete `steps()` blocks; states `idle/listening/speaking`. | Lu motion language |
| `MeterBar` | Continuous thick rounded fill in a recessed `.neu-socket`. Honest single %. Tones + `height`. | Cofounder "58% Open Rate" |
| `DeltaPill` | Mono % change chip, circled up/down arrow, green up / red down. | Cofounder "+12% / 10%" |
| `StatBlock` | The metric tile: uppercase label + mono numeral + `PixelMeter` + `DeltaPill`. `bare` for embedding. | Cofounder stat row |
| `PixelIcon` + `PixelTile` | Crisp pixel-art asset glyphs (folder/file/app/chart/sparkle) on a glossy raised tile. | Cofounder blue folder |
| `GlassNav` | Floating frosted nav pill; active = raised chip; `ink` variant over dark/photo. | Cofounder hero nav |
| `GamePill` | Frosted `glass-ink` achievement/status pill (dot + label + value) that floats over scenes. | Cofounder "Task Completed" |
| `TaskCard` + `TaskStage` | Roadmap/quest card (user/agent/approval; todo/active/locked/done) grouped in a labeled stage column. | Cofounder roadmap kanban |

### 4.2 Existing primitives (on the depth system)
`ui/button` (default=`.btn-glow`, outline/secondary=`.elev-btn`), `ui/card` (`.elev-1` + hairline ring),
`ui/badge`, `ui/progress`, `StatCard`/`SparklineStat` (`.card-lift`), `EmptyState` (dashed, `mono` variant),
`DataTable`, `RoadmapStepper`, `NeedsYou`, `CompanyCanvas` (the full neu/gloss showcase), animated line-icons.

### 4.3 Patterns demoed inline on the board (extract to `ds/` when reused)
Segmented control (neu-socket + gloss), tactile `Toggle` (glossy knob), raised-pill `Tabs`, `PageNav` dot-pager
(iPod/Wii, active dot `#5b9bff`), `NeuNode` (department pillow), `StatusChip`.

---

## 5. Branding debt

The product renamed **Lead Answered → Lu Computer** (lu.computer); the assistant persona **Sarah → Lu**; the
vertical **roofing/contractor → any service business**; "kiwi" dropped. Newer layers already use "Lu"; drift is
concentrated in three older layers (also tracked in [DEVELOPMENT.md](../DEVELOPMENT.md)).

**HIGH — user-visible (fix first):**
- **"Lead Answered" brand** still shipped: `layout.tsx` (app title + old tagline), ~15 page `<title>`s (all
  `— Lead Answered`), sign-in/welcome/set-password copy, `PublicDocLayout.tsx` "Sent via Lead Answered"
  (customer-facing).
- **"Sarah" hardcoded as the assistant** in ~59 UI strings (registry promises, empty states, toasts, labels)
  that render literally "Sarah" instead of routing through the existing `assistantName` (which already defaults
  to "Lu"). Spread across schedule, reviews, team, followups, content, crm, quotes, invoices, analytics, the Lu
  widget.

**MEDIUM — config defaults + demo:**
- Backend persona default `sarahName @default("Sarah")` (`schema.prisma`, `onboarding.ts`, `seed.ts`) feeds the
  *real* customer identity (`worker.ts`, `intake/engine.ts`, `prompt.ts`). Flip the default to `"Lu"`.
- Old lead-email domain `leadanswered.com` (`env.ts`, `.env.example`).
- Vertical-specific language in LLM prompts/examples (`engineeringTools.ts`, `team/chat/route.ts`, `judge.ts`).
- Old demo fixtures (`fixtures/*`, `DemoToggle.tsx`) — re-theme to a vertical-neutral sample, or keep as
  intentional demo data.

**LOW — internal (safe, cosmetic):**
- Package names `@leadanswered/*` (~50 import sites) → `@lu/*` (one rename decision).
- `KIWI_ICONS`/`KiwiIcon` naming, `SarahWidget`/`sarah-context`/`sarahName` identifiers, the `/sarah` route,
  ~30 "Sarah"/"trades" code comments, the repo directory name.

**Fix order:** (1) global "Lead Answered → Lu Computer" (titles + `layout.tsx` + auth/public copy — pure
find/replace, most visible); (2) route the ~59 "Sarah" strings through `assistantName`, flip the `sarahName`
default, fix sender identity; (3) lead-email domain; (4) demo re-theme; (5) internal renames when convenient.

---

## 6. Adoption plan

1. **Foundation:** `.glass*`, `.pixelated`, `.pixel-dither/checker` in `globals.css`; `ds/` primitives; the
   board at `/dev/design`.
2. **Iterate on the board** — tune `--neu-strength`, meter cell size, pixel-icon glyphs, glass blur.
3. **Roll signature components into product:** `StatBlock`/`PixelMeter` into `analytics` + dept dashboards;
   `GlassNav` into the top-nav/canvas chrome; `PixelIcon`/`PixelTile` for files/artifacts/apps; `GamePill` for
   canvas agent-updates; `TaskCard`/`TaskStage` to replace/augment `RoadmapStepper`. (See
   **Component rollout (by tranche)** below for the full map.)
4. **Branding debt sweep** (§5) — a separate PR track from the visual system; start with HIGH.
5. **Verify** every rolled-in surface in **light AND dark** (headless-Chrome screenshots, both themes).

## 7. Out of scope (v1)
Real hero pixel-art generation (Higgsfield), mobile depth polish, full `RoadmapStepper` replacement, and the
branding-debt code changes (register only).

---

## Depth & material recipes

The depth language that makes every surface feel **physical — like game-console hardware**: pillowy nodes you
could press, sites in a deep frame with browser chrome + navigation, glossy controls with press states. This is
the token/CSS layer under the material-zoning rules above, plus the **focused-site components** (browser chrome,
Artifacts nav, action bar). Reference visuals live in `../platform/design-refs/` — match implementation to the
pixel.

### Reference visuals

- **`ref-75-site-frame-depth.png`** — a canvas **site frame** with depth: a floating soft card + a dark task
  pill hovering on its top edge + a dark rounded-square **"+" FAB** bottom-center + a white **"N agent updates ·
  Review"** pill (bell w/ red dot, layered pixel-avatar chips) bottom-left.
- **`ref-76-site-open-browser-chrome.png`** — the same frame **focused**, now a real browser window:
  traffic-lights ● ● ●, `‹ › ↻ ⧉` controls, a "Landing / localhost:PORT" URL, a "Viewing … ⌄" dropdown + expand
  icon; a floating vertical page-nav on the left; a bottom **segmented action bar** (Publish · Revert · Request
  changes).
- **`ref-77-vertical-nav-control.jpeg`** — the left control close up: a glossy white stadium, round ∧ / ∨
  chevron buttons (soft-raised, pressable), a dot column between them with the **current dot = blue `#5b9bff`**.
- **`ref-78-node-depth-legal.png`** — a department **node** with heavy **neumorphic** depth: a recessed socket
  ring with a raised pillow face inside, dual-tone shadow. Depth is independent of state (this one is *dimmed*
  yet fully physical).
- **`ref-81`/`82`/`83`** — target proportions for the focused frame (small pill, small controls, hero frame),
  the left nav at rest, and a whole focused frame at rest (everything is small relative to the frame).
- **`ref-84`/`85`** — the left nav **hovered**: it expands into a dark "Artifacts" popover, a titled list of
  rows (leading dot + icon + label); the active row is highlighted.

### The depth language (in `globals.css`)

#### 1. Elevation scale (a real ladder; light source = top)

Light:
```css
--elev-1: 0 1px 2px rgb(0 0 0 / .05), 0 2px 6px -2px rgb(0 0 0 / .08);              /* resting card */
--elev-2: 0 2px 4px rgb(0 0 0 / .06), 0 8px 18px -6px rgb(0 0 0 / .12);             /* floating pill/button */
--elev-3: 0 4px 8px rgb(0 0 0 / .07), 0 18px 36px -10px rgb(0 0 0 / .16);           /* FAB / focused frame */
--elev-4: 0 8px 16px rgb(0 0 0 / .10), 0 30px 60px -14px rgb(0 0 0 / .22);          /* dock / popover / dialog */
--bevel-top: inset 0 1px 0 rgb(255 255 255 / .75);                                  /* append to raised surfaces */
```
Dark (deeper drops + a faint top bevel so edges catch light):
```css
--elev-1: 0 1px 2px rgb(0 0 0 / .5), 0 6px 16px -6px rgb(0 0 0 / .5);
--elev-2: 0 2px 4px rgb(0 0 0 / .5), 0 10px 24px -8px rgb(0 0 0 / .55);
--elev-3: 0 4px 10px rgb(0 0 0 / .55), 0 22px 44px -12px rgb(0 0 0 / .6);
--elev-4: 0 10px 24px rgb(0 0 0 / .6), 0 36px 72px -16px rgb(0 0 0 / .65);
--bevel-top: inset 0 1px 0 rgb(255 255 255 / .06);
```
Utilities `.elev-1…4` = `box-shadow: var(--elev-N), var(--bevel-top)`. The legacy names (`.elev-card`,
`.elev-btn`, `.card-lift`) re-point onto this ladder so the whole app inherits it.

#### 2. Neumorphism (nodes) — the signature Wii look. Two layers.

Light — a **raised pillow**:
```css
.neu-raise {
  background: linear-gradient(145deg,
    color-mix(in oklab, var(--card) 100%, #fff 6%),
    color-mix(in oklab, var(--card) 100%, #000 5%));
  box-shadow:
    10px 12px 28px rgb(0 0 0 / .10),        /* bottom-right drop */
    -8px -8px 20px rgb(255 255 255 / .85),  /* top-left light */
    inset 0 1px 0 rgb(255 255 255 / .9),    /* crisp top bevel */
    inset 0 -3px 6px rgb(0 0 0 / .04);      /* soft bottom shade */
}
```
Light — the **socket** it sits in (a subtle recess ring, giving the concentric look):
```css
.neu-socket {
  box-shadow: inset 3px 3px 7px rgb(0 0 0 / .06), inset -3px -3px 7px rgb(255 255 255 / .7);
}
```
Dark: swap the light source to a dim charcoal — drop `rgb(0 0 0 / .55)`, highlight `rgb(255 255 255 / .05)`,
gradient mix `#fff 4%` / `#000 8%`. A node = a `.neu-socket` wrapper (padding ~10px) → an inner `.neu-raise`
face. Selected gets the blue ring/halo layered **on top** of the neu.

#### 3. Gloss (tactile controls: chevrons, FAB, segmented actions)

```css
.gloss { background: linear-gradient(180deg, #fff, color-mix(in oklab, var(--card) 100%, #000 4%));
         box-shadow: 0 1px 2px rgb(0 0 0 / .08), 0 3px 6px -2px rgb(0 0 0 / .10), inset 0 1px 0 rgb(255 255 255 / .9); }
.gloss:active { box-shadow: inset 0 2px 5px rgb(0 0 0 / .14); transform: translateY(1px); }
/* dark: gradient #3a3a40→#2a2a2f, inset highlight rgb(255 255 255 / .07) */
```
`.gloss-ink` = the dark-charcoal variant for the "+" FAB and the task pill: a charcoal gradient + `--elev-3` +
an inset top highlight.

#### 4. Press physics + radii

- Tactile press everywhere: `active:translate-y-px` (small) / `.gloss:active` (glossy). Cards hover-lift
  `translateY(-2px)` + an elevation bump.
- Radii: `--radius-frame: 20px` (site frames), `--radius-node: 26px` (agent pills) / stadium for wide nodes,
  `--radius-pill: 9999px` (floating pills). `--radius` for controls.

### Component application (each cites its reference)

1. **Canvas nodes** — `CompanyCanvas.tsx` (ref-78). Lu / agents / teammates become `.neu-socket` + `.neu-raise`
   pillows (agents `--radius-node`, Lu a wider stadium, teammate avatar circle with `.neu-raise`). The accent
   icon + blue selection ring/halo layer on top. Inactive depts stay dimmed **but keep full depth**. Connector
   dot endpoints get a tiny `.gloss` bead.
2. **Site frame (resting)** — site/sheet frames (ref-75): `--radius-frame`, `.elev-3` + `--bevel-top`, a
   hairline `ring-1 ring-black/5`. Reads as a deep floating card.
3. **Focused-site browser chrome** — `components/canvas/BrowserFrame.tsx` (ref-76): a chrome bar (traffic-lights,
   `‹ › ↻ ⧉`, a "Landing / localhost:PORT" URL, "Viewing … ⌄" + expand) with a bottom hairline, wrapping the
   live `/embed` iframe; frame at `.elev-3`. Shown when a site is the focused node. Plus the **segmented action
   bar** (Publish · Revert · Request changes) as a `.gloss` segmented control, and the **task pill** on the top
   edge (`.gloss-ink`).
4. **The Artifacts nav (left control)** — `components/canvas/ArtifactsNav.tsx` (ref-77, 82–85). One component,
   two states (like the `+` toolbar): **rest** = a compact glossy dot-pager (∧ / dots / ∨) where each **dot =
   an artifact** and the **active dot = `#5b9bff`**; **hover** = it expands into a dark `.elev-4` "Artifacts"
   popover, rows = a leading status dot (blue if active) + icon + label, active row highlighted. Rows:
   `Browser` · site images · `Publish to Preview` · `PR Diff` · `Agent Interaction`. Chevrons move the active
   index.
5. **The "+" FAB + toolbar** — `CanvasToolbar.tsx` (ref-75): the collapsed "+" is a `.gloss-ink` rounded-square
   with `--elev-3` + press; expanded tools get `.gloss`.
6. **"Agent updates" pill** — the bottom-left status pill (ref-75): white `--radius-pill`, `--elev-2`, a bell +
   red dot, layered avatar chips (`ring-2 ring-card`, `-space-x-2`), a "Review" `.gloss` button.
7. **Lu dock** — the dock panel + `AgentDockPanel.tsx` (ref-76/78): the container `.elev-4` (it floats over the
   canvas), a tab-bar underline, **file cards** + the roadmap image card as `.elev-1` with hover-lift, the chat
   input as a `.neu-socket` recessed field. Status pills keep their semantic color on `.elev-1` rows.
8. **Primitives** — `ui/button` (primary → `.gloss-ink` + `--elev-2` + press; outline/secondary → `.gloss`),
   `ui/card` (→ `.elev-1` + `--bevel-top`), `ui/dialog` / `ui/popover` / `ui/sheet` / `ui/dropdown-menu`
   (→ `.elev-4` overlay), `ui/input` / `ui/textarea` (→ `.neu-socket` inset), `ui/badge`, `ui/switch` (glossy
   knob), `ui/tabs` (raised active pill).
9. **App shell** — the `SidebarInset` content card → `--elev-2` + `--bevel-top` (a real deep frame); sidebar
   rail flush; header controls → `.gloss`.
10. **Dashboard + Dept** — `NeedsYou` / widget cards, `DepartmentPage` / `RoadmapStepper` step cards,
    `EmptyState` → the elevation scale + hover-lift.

### Focused-site proportions

The focused controls must stay **small** relative to the frame (ref-83/85):

- **Proportional browser chrome — render chrome INSIDE the scaled window.** Chrome + iframe share one 1024-px-
  wide container scaled by `IFRAME_SCALE`, so the chrome is authored at full-window proportions and shrinks with
  the content (readable when the camera flies in), instead of rendering at the frame's native width (~3× too big).
  ```
  <div frame (CARD_W×CARD_H, overflow-hidden, rounded-xl, elev-3)>
    <div className="flex origin-top-left flex-col"
         style={{ width: IFRAME_W, height: CARD_H/IFRAME_SCALE, transform: scale(IFRAME_SCALE) }}>
      <BrowserChrome host page />                     {/* now proportional */}
      <div className="relative flex-1 overflow-hidden bg-background">
        {visible ? <iframe className="lu-frame size-full border-0"/> : <FramePlaceholder/>}
      </div>
    </div>
  </div>
  ```
- **Screen-space focused controls (fixed size).** The task pill / Artifacts nav / action bar are **fixed
  screen-space overlays** (siblings of the transform wrapper), positioned from the focused frame's **screen
  rect** (`focus = {id, left, top, w, h}` computed from `pos[id]` + the live transform — the same math the
  culling uses; recomputed rAF-throttled on transform + on selection change). This keeps them small regardless
  of the focus-zoom. Sizes: task pill `text-[11px] px-2.5 py-1`, action bar `text-[11px]` pills `px-3 py-1`.
- **Tighter framing (`goToSite`).** `flyToNode(id, min(CLICK_Z≈3.2, (W*0.8)/w, (H*0.8)/h))`, `MAX_Z 3.2` — the
  frame nearly fills the view, the 0.8 leaving room for the screen-space pill/action-bar/nav.
- **Selection box padding.** `SEL_PAD 8`, selection `rect rx 10` — hugs the frame, still just outside it.

### Both themes

- **Light** = warm, light-source-top: bright top bevels, soft grey drops, white gloss. Neumorphism reads as
  embossed foam.
- **Dark** = dim charcoal: the "light" highlight becomes a faint `rgb(255 255 255 / .05–.07)` top bevel, drops
  go deep `rgb(0 0 0 / .5–.65)`, gloss gradients use charcoal stops. Neumorphism reads as brushed hardware, not
  glowing plastic — highlights must not look milky.

### Out of scope

Real page-nav wiring to actual site sections, real Publish/Revert backend, pixel-art node icons, mobile depth
polish.

---

## Component rollout (by tranche)

`/dev/design` is the canonical **component gallery**: every real component in `apps/web/src/components/**` gets
a redesigned twin there, demoed in **light + dark**, before it is rolled into the product. Build on the board →
verify both themes → replace in product. This doc is the map: the foundation fixes, then the per-component
inventory by tranche.

The foundation and the primitives (Tranche 1) cascade app-wide, so they lead; the composite twins live on the
board and are swapped into the real, auth-gated surfaces as a reviewed sweep. The locked design language is §0–§4
above and must be obeyed for every twin: **material zoning** (neu/gloss = tactile things you press; **glass** =
floating things), the **pixel layer** (accent only), **all-sans** + IBM Plex Mono numerals, monochrome **color**
+ one interactive blue `#5b9bff`, and the **elevation ladder** `.elev-1…4` with depth duality `.neu-card` (raised)
vs `.neu-card-in` (recessed).

### 0. Foundation fixes FIRST (they cascade to every component)

From the design review — do these before/with Tranche 1 or every twin inherits the weakness:

1. **Widen the elevation ladder.** `elev-1…4` and `neu-card` vs `neu-card-in` are near-identical today.
   Increase the deltas between rungs so raised/recessed reads at a glance.
2. **Re-model dark depth.** Drops barely register on the dark canvas → everything flattens to one charcoal.
   Add rim/edge highlights + a surface that genuinely lightens as it rises; drops become the secondary cue.
3. **Add the missing token layers:** a named **type scale** (display/h1/h2/title/body/label/mono-caption),
   a **spacing scale**, and **motion tokens** (durations + easings) so twins stop using ad-hoc `text-[13px]`/`px-2.5`.
4. **Define states once:** focus ring (`#5b9bff`), hover-lift, disabled, loading, invalid — reused by all primitives.
5. **A11y pass:** raise `--muted-foreground` contrast; min 12px on mono micro-labels; ensure meters never rely on hue alone.

Add a **"Foundations — states & scales"** frame to the board demoing the above.

### 1. Board reorganization

Add a top-level **"App components"** super-section under the existing signature frames, with one
sub-frame per tranche below. Each twin frame shows: the component in its key states, a one-line
`Cap` naming the material zone + tokens used, and (where relevant) the primitive it now composes.
Keep the `neu`-strength knob + theme toggle global.

### 2. Inventory + redesign spec, by tranche

`components/ui/*` are the base layer — redesigning them upgrades the whole app for free, so they go first.
Legend for **Do**: `gloss`=pressable, `glass`=floating, `neu`=pillow, `socket`=recessed field, `chip`=soft-tint,
`prim`=compose an existing `ds/` primitive.

#### Tranche 1 — UI primitives (`components/ui/`) · cascade to everything
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `button` | shadcn + `elev-btn` | primary → `gloss-ink` + press; outline/secondary → `gloss`; ghost/link flat | P0 |
| `card` | `elev-card` + ring | `neu-card` (raised) / `neu-card-in` (recessed) pair | P0 |
| `input` / `textarea` | flat border | `neu-socket` recessed field + focus ring | P0 |
| `select` / `command` | shadcn | trigger = `gloss`; menu = `glass`/`elev-4` floating | P0 |
| `checkbox` / `switch` | shadcn | glossy knob (switch already prototyped on board) | P0 |
| `tabs` | `shadow-sm` active | raised `gloss` pill active (board `Tabs` pattern) | P0 |
| `badge` | shadcn variants | soft-tint status/kind chip (board `StatusChip`) | P0 |
| `dialog` / `sheet` / `popover` / `dropdown-menu` / `tooltip` | `shadow-md/lg` | `glass` or `elev-4` floating overlays | P0 |
| `progress` | thin bar | swap to `MeterBar` (recessed socket) | P1 |
| `skeleton` | pulse | pixel/shimmer loading in the pixel language | P1 |
| `sonner` (toast) | default | `glass` / `GamePill`-style floating toast | P1 |
| `table` | shadcn | editorial table (hairline rows, mono numerals) | P1 |
| `avatar` / `separator` / `label` | shadcn | avatar `neu-chip` ring; hairline separators; mono labels | P2 |
| `calendar` / `chart` | shadcn / recharts | calendar in tokens; chart palette = system + meter ramp | P2 |
| `sidebar` | shadcn | see Tranche 5 (shell) | P1 |

#### Tranche 2 — Data & metrics
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `app/StatCard` | flat `card-lift` | **replace with `StatBlock`** (`PixelMeter` + `DeltaPill`) | P0 |
| `app/SparklineStat` | flat | `StatBlock bare` + sparkline in system palette | P1 |
| `app/DataTable` | tanstack + flat | editorial table + kind chips + mono numerals | P1 |
| `dashboard/NeedsYou` | flat rows | Lu-interaction rows: `neu-card-in` rows + status chips + `gloss` action | P0 |

#### Tranche 3 — Cards, states & roadmap
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `app/ApprovalCard` / `ApprovalRows` | flat + `btn-glow` | categorical-kind chip + `TaskCard`-style row + `gloss` actions | P0 |
| `dept/RoadmapStepper` | flat StepCard | **replace/augment with `TaskCard` + `TaskStage`** (depth duality) | P0 |
| `dept/DepartmentPage` | bespoke | roadmap stepper + panels on `neu-card`; dept header editorial | P1 |
| `app/EmptyState` | dashed + mono | keep mono "All caught up"; add `PixelIcon` + `neu-card-in` well | P1 |
| `app/GatedState` | `btn-glow`/`green-wash` | upgrade/locked state as `glass-hero` over dither + `gloss-ink` CTA | P2 |
| `app/ModuleStub` | stub | "app coming soon" tile with `PixelTile`/`PixelIcon` | P2 |

#### Tranche 4 — Lu chat surface (`components/sarah/`)
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `sarah/SarahWidget` | floating `shadow-[…]` | Lu dock: `elev-4` floating panel, tabbed | P0 |
| `sarah/SarahComposer` | `rounded-2xl border` + `btn-glow` send | `neu-socket` recessed input + `gloss-ink` send + `PixelVoice` state | P0 |
| `sarah/SarahThread` | bubbles | keep iMessage bubbles; Lu row uses `neu` avatar + `PixelVoice` | P1 |
| `app/SarahActionRow` | flat | action row = `neu-card-in` + kind chip + `gloss` button | P1 |

#### Tranche 5 — App shell / chrome
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `AppSidebar` + `ui/sidebar` | shadcn sidebar, monogram `btn-glow` | rail flush; monogram `neu`; nav items with `#5b9bff` active | P1 |
| `app/PageHeader` | H1 only | editorial header (title + mono kicker + `gloss` header controls) | P1 |
| `theme-toggle` | icon button | `gloss` pill toggle (board pattern) | P2 |
| `SidebarInset` content frame | `border shadow-sm` | `elev-2` + bevel deep frame (shell = the outer console) | P1 |

#### Tranche 6 — Canvas polish (partly on-system already)
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `canvas/AgentDockPanel` | flat `border` cards | file/roadmap cards → `elev-1` + hover-lift; input `neu-socket` | P1 |
| `canvas/CanvasToolbar` | on-system | confirm `gloss-ink` FAB + `gloss` tools | P2 |
| `canvas/BrowserChrome` | built | tune to `ref-76` proportions in the tokens | P2 |
| `canvas/CompanyCanvas` | neu nodes (done) | audit against `neu` spec; connector beads `gloss` | P2 |
| `canvas/SheetGrid` / `Workplace` | grid | recessed `neu-inset` canvas + `elev` frames | P2 |

#### Tranche 7 — Team, onboarding, workspace
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `team/TeamRoster` | partly on-system | finish neu/gloss pass | P2 |
| `team/TeamGraph` | graph | nodes = `neu` pillows; edges in system ink | P2 |
| `team/PermissionsMatrix` | table | editorial matrix + chips | P2 |
| `team/TeamSetup` / `TeamSetupPersisted` / `TeamClient` | two-panel | Lu-convo panel + `neu` roster; reuse dock patterns | P2 |
| `workspace/AppSetup` / `AppSetupPanel` | two-panel | same AppSetup convo shell as TeamSetup | P2 |

#### Tranche 8 — Customer-facing / media
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `app/PublicDocLayout` | "Sent via …" | editorial public doc frame (also fix brand string) | P1 |
| `app/MarkdownView` | prose | tokenized prose (type scale, mono code) | P2 |
| `app/CalendarMonth` | bespoke | tokens + `#5b9bff` selection | P2 |
| `app/StarRating` | stars | amber review stars (categorical) | P3 |
| `app/PhoneFrame` / `PhotoStrip` | frames | `elev-3` device frame; media in `neu-inset` | P3 |

**Not redesigned (keep as-is):** `components/icons/*` (stroke line-icons — the deliberate opposite of pixel
icons; audit for consistency only), `DemoToggle`, `SidebarResizer`, `AuthHashHandler`, `setup-steps.ts`,
`sarah-context.tsx`, `theme-provider.tsx` (infra, no surface).

### 3. Per-component workflow

1. Build the twin in a board sub-frame, all key states, using tokens + zones (no ad-hoc shadows/sizes).
2. Screenshot **light + dark** (Playwright, `channel: chrome`) — the twin must read in both.
3. Tune `--neu-strength` / tokens if it fights the foundation.
4. Roll into product: replace the real component's classes; re-verify the live surface both themes.

### 4. Suggested sequence

**Foundation (§0) → Tranche 1 (primitives, biggest cascade) → 2 → 3 → 4 → 5 → 6 → 7 → 8.**
P0 items inside a tranche first. Primitives unlock the most surface for the least work, so they lead.

### 5. Out of scope here

Wordmark/logo direction (parked), the branding-debt string sweep (separate track, §5 above), real backend
wiring (Publish/Revert, artifacts), mobile depth polish.
