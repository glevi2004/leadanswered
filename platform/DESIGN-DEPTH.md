# Plan — state-of-the-art DEPTH pass on the whole design system (Wii-console / soft-physical)

> **EXECUTION RULE — do NOT work from these text descriptions alone.** Before implementing any
> section below, open the referenced image with the Read tool and match it to the pixel. The four
> references live in the repo:
> - `platform/design-refs/ref-75-site-frame-depth.png` — a canvas **site frame** with depth: floating
>   soft card + a dark "Engineer · Build marketing website ⌄" task pill hovering on its top edge +
>   a dark rounded-square **"+" FAB** bottom-center + a white **"4 agent updates · Review"** pill
>   (bell w/ red dot, 3 layered pixel-avatar chips) bottom-left.
> - `platform/design-refs/ref-76-site-open-browser-chrome.png` — the same frame **focused**, now a
>   real **browser window**: traffic-lights ● ● ●, ‹ › ↻ ⧉ controls, "Landing / localhost:3001" URL,
>   a "Viewing landing page ⌄" dropdown + expand icon; a floating **vertical page-nav** on the left;
>   a bottom **segmented action bar** "✓ Publish to Staging · Revert All · Request changes".
> - `platform/design-refs/ref-77-vertical-nav-control.jpeg` — the **page-nav** close up: a glossy white
>   stadium, round ∧ / ∨ chevron buttons (soft-raised, pressable), a dot column between them with the
>   **current dot = blue `#5b9bff`**. iPod / Wii-remote feel.
> - `platform/design-refs/ref-78-node-depth-legal.png` — a department **node** ("Legal") with heavy
>   **neumorphic** depth: a recessed **socket ring** with a **raised pillow face** inside, dual-tone
>   shadow (dark bottom-right + light top-left). Depth is independent of state (this one is *dimmed*
>   yet fully physical). Also shows the dock's Home tab (roadmap image card, Tasks w/ orange status
>   pills, Suggested Next, chat input).

## Goal

Make every surface feel **physical and tactile — like game-console hardware**: pillowy nodes you could
press, sites that sit in a real deep frame with a browser chrome + navigation, glossy controls with
press states. Keep our editorial Cofounder palette and the light/dark toggle. This is a **depth +
tactility** pass, plus two **new focused-site components** (browser chrome + page-nav) that the refs imply.

## Current design system — review (what exists, what's flat)

- **Tokens** (`src/app/globals.css`): editorial palette, light `--background #f0f0f0` / `--card #ffffff`
  / `--border #e4e4e4`; dark `--background #1e1e23` / `--card #28282d` / `--border #323237`.
  `--radius 0.75rem`; radius scale `--radius-sm…-4xl` (×0.6…×2.6).
- **Depth utilities today are deliberately SUBTLE — this is what we're leveling up:**
  - `.elev-btn` — `0 1px 1px /.05, 0 2px 4px -1px /.09` (dark adds `inset 0 1px 0 /.08`).
  - `.elev-card` — `0 1px 2px -1px /.06, 0 3px 8px -3px /.07` (dark: `0 1px 2px /.5, 0 6px 16px -6px /.55, inset 0 1px 0 /.045`).
  - `.elev-tile` — inset top highlight + `0 1px 2px /.06`.
  - `.card-lift` — resting `0 1px 2px -1px /.06, 0 3px 8px -3px /.06` → hover `0 12px 30px /.13` + `translateY(-2px)`.
  - `.btn-glow` — the ink CTA, `0 1px 2px /.12, 0 2px 6px -2px /.18`.
- **Primitives:** `Button` (`elev-btn` on default/outline/secondary + `active:translate-y-px`),
  `Card` (`elev-card` + `ring-1 ring-foreground/10` + `rounded-xl`).
- **Canvas nodes** (`CompanyCanvas.tsx`): flat `border bg-card elev-card` pills + `rounded-3xl` — **no
  neumorphic depth yet**. Site frames: `rounded-lg border bg-card elev-card` — **flat, no browser chrome,
  no page-nav** (those don't exist anywhere in the repo).
- **Shell:** content card = `SidebarInset` `rounded-2xl border` (no real shadow).
- **Fonts:** `--font-sans` (Plus Jakarta Sans) + `--font-mono` (IBM Plex Mono). **No serif** (removed
  earlier). NOTE: ref-78's "Good afternoon, Gabriel" greeting is a serif — a decision point below.

**Verdict:** the bones are token-driven and clean, but everything is *one subtle shadow*. The refs use a
**layered elevation system + true neumorphism + gloss + press physics**. We add that as new tokens/
utilities so it flows to every surface, then apply per-component.

## Foundation — the new depth language (build FIRST, in `globals.css`)

### 1. Elevation scale (replaces the ad-hoc elev-* with a real ladder). Light source = top.

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
Utilities `.elev-1…4` = `box-shadow: var(--elev-N), var(--bevel-top)`. **Re-point the old names**
(`.elev-card`→`.elev-1`, `.elev-btn`→a lighter `.elev-2`-ish, `.card-lift` hover→`.elev-3`) so the whole
app inherits the upgrade with zero per-file churn, then tune outliers.

### 2. Neumorphism (nodes) — the signature Wii look. Two layers per ref-78.

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
Light — the **socket** it sits in (subtle recess ring, gives the concentric look):
```css
.neu-socket {
  box-shadow: inset 3px 3px 7px rgb(0 0 0 / .06), inset -3px -3px 7px rgb(255 255 255 / .7);
}
```
Dark: swap the light source to a dim charcoal — drop `rgb(0 0 0 / .55)`, highlight
`rgb(255 255 255 / .05)`, gradient mix `#fff 4%` / `#000 8%`. A node = `.neu-socket` wrapper (padding
~10px) → inner `.neu-raise` face. Selected still gets the existing blue ring/halo **on top** of the neu.

### 3. Gloss (tactile controls: chevrons, FAB, segmented actions). Per ref-77.

```css
.gloss { background: linear-gradient(180deg, #fff, color-mix(in oklab, var(--card) 100%, #000 4%));
         box-shadow: 0 1px 2px rgb(0 0 0 / .08), 0 3px 6px -2px rgb(0 0 0 / .10), inset 0 1px 0 rgb(255 255 255 / .9); }
.gloss:active { box-shadow: inset 0 2px 5px rgb(0 0 0 / .14); transform: translateY(1px); }
/* dark: gradient #3a3a40→#2a2a2f, inset highlight rgb(255 255 255 / .07) */
```
`.gloss-ink` = the dark-charcoal variant for the "+" FAB and the task pill (per ref-75/76): charcoal
gradient + `--elev-3` + inset top highlight.

### 4. Press physics + radii

- Tactile press everywhere: `active:translate-y-px` (small) / `.gloss:active` (glossy). Cards hover-lift
  `translateY(-2px)` + elevation bump (keep `.card-lift`, re-point to the new scale).
- Radii: add `--radius-frame: 20px` (site frames), `--radius-node: 26px` (agent pills) / stadium for
  wide nodes, `--radius-pill: 9999px` (floating pills). Keep `--radius` for controls.

## Component-by-component application (each cites its reference image)

1. **Canvas nodes** — `CompanyCanvas.tsx` (ref-78). Lu / agents / teammates become `.neu-socket` +
   `.neu-raise` pillows (agents `--radius-node`, Lu a wider stadium, teammate avatar circle stays but
   gets `.neu-raise`). Keep the accent icon + blue selection ring/halo layered on top. Inactive depts
   stay dimmed **but keep full depth**. Connector dot endpoints get a tiny `.gloss` bead.
2. **Site frame (resting)** — `CompanyCanvas.tsx` site/sheet frames (ref-75): `--radius-frame`, `.elev-3`
   + `--bevel-top`, a hairline `ring-1 ring-black/5`. The frame reads as a deep floating card, not a flat rect.
3. **Focused-site browser chrome** — NEW `components/canvas/BrowserFrame.tsx` (ref-76): a chrome bar
   (traffic-lights, `‹ › ↻ ⧉`, URL "Landing / localhost:PORT", right side "Viewing … ⌄" + expand) with a
   bottom hairline, wrapping the live `/embed` iframe; frame at `.elev-3`. Shown when a site is the
   focused/selected node (camera flown in). Also the **segmented action bar** ("Publish to Staging ·
   Revert All · Request changes") as a `.gloss` segmented control, and the **task pill** on the top edge
   (`.gloss-ink`, ref-75/76).
4. **Vertical page-nav** — NEW `components/canvas/PageNav.tsx` (ref-77): a `.gloss` white stadium with a
   round ∧ button, a dot column (current = `#5b9bff`), a round ∨ button; scrolls the focused site's
   sections. Floats at the frame's left with `--elev-2`.
5. **The "+" FAB + toolbar** — `CanvasToolbar.tsx` (ref-75): the collapsed "+" becomes `.gloss-ink`
   rounded-square with `--elev-3` + press; expanded tools get `.gloss` treatment.
6. **"Agent updates" pill** — the bottom-left status pill (ref-75): white `--radius-pill`, `--elev-2`,
   bell + red dot, 3 layered avatar chips (`ring-2 ring-card`, `-space-x-2`), "Review" `.gloss` button.
   (New small component if not present.)
7. **Lu dock** — `SarahWidget.tsx` + `AgentDockPanel.tsx` (ref-76/78): panel container `.elev-4` (it
   floats over the canvas), tab bar underline, **file cards** + roadmap image card as `.elev-1` with
   hover-lift, chat input as a `.neu-socket` recessed field. Status pills (Needs Clarification / Requires
   Approval) keep the orange semantic but sit on `.elev-1` rows.
8. **Primitives** — `ui/button.tsx` (primary → `.gloss-ink` + `--elev-2` + press; outline/secondary →
   `.gloss` light), `ui/card.tsx` (→ `.elev-1` + `--bevel-top`), `ui/dialog.tsx` / `ui/popover.tsx` /
   `ui/sheet.tsx` / `ui/dropdown-menu.tsx` (→ `.elev-4` overlay), `ui/input.tsx` / `ui/textarea.tsx`
   (→ subtle `.neu-socket` inset so fields read recessed), `ui/badge.tsx`, `ui/switch.tsx` (glossy knob),
   `ui/tabs.tsx` (raised active pill).
9. **App shell** — the `SidebarInset` content card → `--elev-2` + `--bevel-top` (a real deep frame, per
   ref-76/78 outer frame); sidebar rail flush; header controls (`Upgrade`, theme, map, search) → `.gloss`.
10. **Dashboard + Dept** — `NeedsYou.tsx` / `WidgetBoard.tsx` / widget cards, `DepartmentPage.tsx` /
    `RoadmapStepper.tsx` step cards, `EmptyState` → the new elevation scale + hover-lift.

## Both themes (must verify each surface in light AND dark)

- **Light** = warm, light-source-top: bright top bevels, soft grey drops, white gloss. The neumorphism
  reads as embossed foam (ref-78 is light).
- **Dark** = dim charcoal: the "light" highlight becomes a faint `rgb(255 255 255 / .05–.07)` top bevel,
  drops go deep `rgb(0 0 0 / .5–.65)`, gloss gradients use charcoal stops. Neumorphism reads as brushed
  hardware, not glowing plastic — test that highlights don't look milky.

## Build order

1. **Foundation** — elevation scale + `.neu-*` + `.gloss*` + radii tokens in `globals.css`; re-point the
   old utilities. (Whole app shifts at once — screenshot `/home` + `/canvas` both themes to sanity-check.)
2. **Canvas nodes** (ref-78) — the signature moment.
3. **Site frame resting** (ref-75) + **FAB/toolbar** + **agent-updates pill**.
4. **Focused-site: BrowserFrame + PageNav + action bar** (ref-76/77) — the new components.
5. **Lu dock** (ref-76/78).
6. **Primitives + shell + dashboard/dept sweep**.

## Decisions (LOCKED 2026-07-15)

- **Scope = FULL:** the depth overhaul **plus** the new focused-site features — `BrowserFrame` (window
  chrome), `PageNav` (glossy dot-pager), and the segmented action bar (ref-76/77) — all built this pass.
- **Typography = ALL-SANS.** Do NOT reintroduce serif; the greeting + H1s stay Plus Jakarta Sans. (Depth
  is the only visual axis changing.)
- **Neumorphism intensity:** ship a `--neu-strength` multiplier so it's one-knob tunable after the first pass.

## Appendix — exact surfaces + blast radius (from full catalog)

**Re-pointing the old utilities cascades everywhere — here's the exact reach so nothing is missed:**
- `.elev-btn` → `ui/button.tsx:11,13,15` · `CompanyCanvas.tsx:480` · `WidgetBoard.tsx:169,176` · `team/TeamRoster.tsx:251`.
- `.elev-card` → `ui/card.tsx:15` · `CompanyCanvas.tsx:371,391,413,421,449,461` · `CanvasToolbar.tsx:38` · `NeedsYou.tsx:70` · `WidgetBoard.tsx:304` · `team/TeamRoster.tsx:230`.
- `.card-lift` → `home/HomeClient.tsx:33` · `ApprovalCard.tsx:37` · `StatCard.tsx:30` · `SparklineStat.tsx:49` · `InvoicesIndex.tsx:207` · `PerformanceTab.tsx:40` · `PostCard.tsx:41` · `widget-catalog.tsx:509` · `OnboardingSketch.tsx:1133` · `FollowupsClient.tsx:306` · `CampaignDetail.tsx:122,134` · `ReviewsHome.tsx:92,166,209`.
- `.btn-glow` (the ink CTA) → `ImportWizard.tsx` (×6) · `AppSidebar.tsx:139` (company monogram) · `AvailabilityTab.tsx:46` · `ApprovalCard.tsx:65` · `GatedState.tsx:15,27` · `ApprovalRows.tsx:110,182,213` · `OnboardingSketch.tsx` (×11) · `SarahComposer.tsx:123` (send button) · `ReviewsWizard.tsx` (×4).
- `.elev-tile` → **defined, unused** — free to repurpose as the neu/gloss tile helper.
- `.green-wash` → `GatedState.tsx:14` only.

**Surfaces to upgrade (exact current classes):**
- **Primitives:** `Button` variants default/outline/secondary carry `elev-btn` (ghost/destructive/link don't).
  `Card` = `elev-card … rounded-xl bg-card ring-1 ring-foreground/10`; header/content/footer have no shadow.
  `Dialog.Content` = `rounded-xl bg-popover ring-1 ring-foreground/10` (**no shadow** → add `.elev-4`).
  `Popover`/`DropdownMenu` = `shadow-md ring-1` → `.elev-4`. `Sheet` = `shadow-lg` → `.elev-4`.
  `Input` = `rounded-lg border … dark:bg-input/30` (flat → `.neu-socket` recess). `Tabs` active =
  `data-active:bg-background … shadow-sm` (→ raised pill). `Switch` thumb = `shadow-sm` (→ glossy knob).
- **Dock:** `SarahWidget` floating card already `rounded-3xl … shadow-[0_12px_48px_rgba(16,24,40,.22)]`
  (→ `.elev-4`). `SarahDock` aside has **no surface** (sits on shell bg — fine). Tab bar =
  `border-b` + active `bg-muted`. `SarahComposer` form = `rounded-2xl border shadow-xs`
  (→ `.neu-socket` recess), send btn `btn-glow` (→ `.gloss-ink`). **`AgentDockPanel` cards are FLAT**
  `rounded-xl border bg-card p-4` (`:43,62,85,115,130`) → `.elev-1`; inner rows `rounded-lg border bg-background`.
- **Canvas:** nodes at `CompanyCanvas.tsx:413(badge),421(agent),444/449(teammate),461(Lu),371/391(frames)`;
  reset btn `:480`; `CanvasToolbar.tsx:38`. Selected ring is inline `boxShadow: 0 0 0 4px var(--card),
  0 0 0 8px SELECT_RING, 0 0 0 22px SELECT_HALO` — keep, layer over `.neu-*`.
- **Shell:** content frame = `SidebarInset` → net `bg-background rounded-2xl border shadow-sm`
  (`(app)/layout.tsx:71` + `ui/sidebar.tsx:311`) → deepen to `.elev-2` + `--bevel-top`. `PageHeader` flat
  (H1 only). `AppSidebar` monogram `btn-glow` (`:139`).
- **Dept/Dashboard:** `RoadmapStepper` StepCard **flat** `rounded-xl border bg-card p-3.5` + `ring-2` when
  active (`:30`) → `.elev-1` + hover-lift. `DepartmentPage` panels are `Card` (inherit the upgrade).
  `NeedsYou`/`WidgetBoard`/`widget-catalog` cards listed above.
- **Fonts:** `layout.tsx` — sans `Plus_Jakarta_Sans` (`--font-sans`), mono `IBM_Plex_Mono`
  (`--font-plex-mono`); `--font-heading` == sans. **No serif** exists (relevant to the serif-greeting decision).

## Verification

- Foundation: `/home` + `/canvas` in light+dark render with the new depth, nothing broken (tsc clean).
- Per component: Playwright screenshot vs the matching ref image, **light and dark** side-by-side —
  nodes (ref-78), resting frame + FAB + updates pill (ref-75), focused browser chrome + page-nav (ref-76/77).
- Press/hover states captured. Zero console errors.

## Out of scope

Real page-nav wiring to actual site sections (visual first), real Publish/Revert backend, pixel-art node
icons, mobile depth polish.
