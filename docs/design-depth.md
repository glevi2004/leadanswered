# Lu Computer — depth & tactility (material recipes)

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md).

The depth language that makes every surface feel **physical — like game-console hardware**: pillowy nodes you
could press, sites in a deep frame with browser chrome + navigation, glossy controls with press states. This is
the token/CSS layer under the design system ([design-system.md](./design-system.md) owns the material-zoning
rules and the component catalog), plus the **focused-site components** (browser chrome, Artifacts nav, action
bar). Reference visuals live in `../platform/design-refs/` — match implementation to the pixel.

## Reference visuals

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

## The depth language (in `globals.css`)

### 1. Elevation scale (a real ladder; light source = top)

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

### 2. Neumorphism (nodes) — the signature Wii look. Two layers.

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

### 3. Gloss (tactile controls: chevrons, FAB, segmented actions)

```css
.gloss { background: linear-gradient(180deg, #fff, color-mix(in oklab, var(--card) 100%, #000 4%));
         box-shadow: 0 1px 2px rgb(0 0 0 / .08), 0 3px 6px -2px rgb(0 0 0 / .10), inset 0 1px 0 rgb(255 255 255 / .9); }
.gloss:active { box-shadow: inset 0 2px 5px rgb(0 0 0 / .14); transform: translateY(1px); }
/* dark: gradient #3a3a40→#2a2a2f, inset highlight rgb(255 255 255 / .07) */
```
`.gloss-ink` = the dark-charcoal variant for the "+" FAB and the task pill: a charcoal gradient + `--elev-3` +
an inset top highlight.

### 4. Press physics + radii

- Tactile press everywhere: `active:translate-y-px` (small) / `.gloss:active` (glossy). Cards hover-lift
  `translateY(-2px)` + an elevation bump.
- Radii: `--radius-frame: 20px` (site frames), `--radius-node: 26px` (agent pills) / stadium for wide nodes,
  `--radius-pill: 9999px` (floating pills). `--radius` for controls.

## Component application (each cites its reference)

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

## Focused-site proportions

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

## Both themes

- **Light** = warm, light-source-top: bright top bevels, soft grey drops, white gloss. Neumorphism reads as
  embossed foam.
- **Dark** = dim charcoal: the "light" highlight becomes a faint `rgb(255 255 255 / .05–.07)` top bevel, drops
  go deep `rgb(0 0 0 / .5–.65)`, gloss gradients use charcoal stops. Neumorphism reads as brushed hardware, not
  glowing plastic — highlights must not look milky.

## Out of scope

Real page-nav wiring to actual site sections, real Publish/Revert backend, pixel-art node icons, mobile depth
polish.
