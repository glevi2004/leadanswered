# Plan — focused-site fixes: proportions, framing, selection padding + the Artifacts nav

> **EXECUTION RULE — open each saved ref with the Read tool before implementing; do not work from these
> text notes alone.** Saved in `platform/design-refs/`:
> - `ref-81-desired-proportions.png` — target proportions (small pill, small controls, hero frame).
> - `ref-82-pagenav-resting.png` — the left nav at REST: a glossy stadium, round ∧/∨ chevrons, a column
>   of dots with the **current one blue**. The dots = the artifacts; the blue dot = the active artifact.
> - `ref-83-focused-resting.png` — a whole focused frame with the nav at rest (see how SMALL everything is
>   relative to the frame).
> - `ref-84-artifacts-hover.png` — the nav HOVERED: it expands into a dark "Artifacts" popover, a titled
>   list of rows (leading dot + icon + label). Active row = **lucomputer-landing…** (blue dot, highlighted).
> - `ref-85-focused-artifacts-open.png` — the full frame with the Artifacts popover open on the left.
> - Pass-1 depth refs: `ref-75/76/77`.
> Image 86 (the current WRONG build) and the earlier temp shots weren't savable (temp paths gone) —
> re-screenshot the live `/canvas` (click a page frame) to see the current oversized state.

## The key correction (from Levi): the page-nav IS the Artifacts control

The left control is **one component with two states** (like the `+` toolbar):
- **Rest** = a compact glossy dot-pager (∧ / dots / ∨). Each **dot = an artifact**; the **blue dot = the
  active artifact**; the chevrons step through them.
- **Hover** = it expands into the labeled **"Artifacts"** popover: `Browser · lucomputer-landing (img) ·
  lucomputer-landing (img) · Publish to Preview · PR Diff · Agent Interaction`, each row = leading status
  dot (blue = active) + icon + label. The active row is highlighted.
So there is NO separate artifacts button — the dot-pager expands. Dots count == artifacts count.

## Gap analysis — current (image 86) vs desired (ref-83/85)

| Element | Current (86) — WRONG | Desired (ref-83/85) | Fix |
|---|---|---|---|
| **Task pill** | Huge — ~65% of frame width, tall, `text-lg` | Small compact pill hugging the top edge | §B screen-space, small px |
| **Browser chrome** | Thick bar; big traffic-lights, big URL text, big expand icon | Thin bar; small dots/URL, proportional to the window | §A scaled-window |
| **Left nav** | Big chevron circles + big dots | Small compact dot-pager (rest) → labeled list (hover) | §B + §E |
| **Action bar** | Huge pills, big text | Small segmented pills | §B screen-space, small px |
| **Selection box** | ~40px gap all around | Hugs the frame (small gap), still outside it | §D `SEL_PAD 18→8` |
| **Framing** | Loose — canvas shows well past the dashed box | Frame ~fills the view | §C tighter zoom |

## Root cause

- **Chrome:** the frame is `CARD_W=320` world-px, but the page content renders at `IFRAME_W=1024` then
  scales `×0.3125`. The `BrowserChrome` bar renders at the frame's **native 320px**, unscaled → ~3× too big.
- **Controls (pill/nav/action bar):** they're **world-space** children of the transform, so the focus-zoom
  (~1.5×) magnifies them. Bigger zoom → bigger controls.

## Fixes

### A. Proportional browser chrome — render chrome INSIDE the scaled window
Restructure the page frame so **chrome + iframe share one 1024-px-wide container** scaled by `IFRAME_SCALE`.
The chrome is then authored at full-window proportions and shrinks with the content (h-8 → ~10px in the
frame; readable when the camera flies in).
```
<div frame (CARD_W×CARD_H, overflow-hidden, rounded-xl, elev-3)>
  <div className="flex origin-top-left flex-col"
       style={{ width: IFRAME_W, height: CARD_H/IFRAME_SCALE (=672), transform: scale(IFRAME_SCALE) }}>
    <BrowserChrome host page />                     {/* now proportional */}
    <div className="relative flex-1 overflow-hidden bg-background">
      {visible ? <iframe className="lu-frame size-full border-0"/> : <FramePlaceholder/>}
    </div>
  </div>
</div>
```

### B. Screen-space focused controls (fixed size, always small)
Move the task pill / nav / action bar OUT of the world layer into **fixed screen-space overlays** in the
canvas wrap (siblings of `<TransformWrapper>`), positioned from the focused frame's **screen rect**:
- Track `focus = {id, left, top, w, h}` = the selected page frame's screen rect, from `pos[id]` + the live
  transform (`positionX/Y`, `scale`) — same math the culling uses. Recompute on `onTransform`
  (rAF-throttled) and when selection changes.
- Sizes (small, per ref-83/85): task pill `text-[11px] px-2.5 py-1` (icon `size-3.5`, chevron `size-3`);
  action bar `text-[11px]`, pills `px-3 py-1`; nav per §E.
- `z-20`, above the pane; clicking them doesn't pan/deselect (outside the RZPP pane).

### C. Tighter framing (`goToSite`)
`flyToNode(id, min(CLICK_Z≈3.2, (W*0.8)/w, (H*0.8)/h))`, raise `MAX_Z 2.6 → 3.2` — frame nearly fills the
view, but the 0.8 leaves room for the screen-space pill (above) + action bar (below) + nav (left). Tune 0.8.

### D. Selection box padding
`SEL_PAD 18 → 8`, selection `rect rx 16 → 10` — hugs the frame, still just outside it.

### E. The Artifacts nav (`components/canvas/ArtifactsNav.tsx`, replaces `PageNav`)
Screen-space, at the focused frame's left edge. Two states, width/height animates on hover (React `open`
state like `CanvasToolbar`):
- **Rest:** glossy stadium — `∧` button, a dot column (one dot per artifact, active = `#5b9bff`), `∨` button.
- **Hover:** expands to a dark `.elev-4` popover titled **"Artifacts"**; rows = leading status dot (blue if
  active) + icon + label, active row highlighted (`bg-white/5`). Items (mock): `Browser` (window),
  `lucomputer-landing` ×2 (image), `Publish to Preview` (doc), `PR Diff` (`</>`), `Agent Interaction`
  (window). Icons: lucide `AppWindow / Image / FileText / Code2 / MousePointerClick`.
- Chevrons move the active index; `.gloss` buttons, `.gloss` container at rest, `.elev-4` when expanded.
- Visual/mock for now (no real artifact wiring).

## Verification (Playwright, both themes)

- Click a page → frames tightly (fills ~the old selection-box area), dashed box hugs the frame, chrome is a
  small proportion, and pill/nav/action-bar are small — **compare screenshot to `ref-83`**.
- Hover the left nav → it expands into the "Artifacts" list — **compare to `ref-84`/`ref-85`**.
- Light + dark; `tsc` clean; no console errors.

## Out of scope (note, don't build)

Ref-83/85's outer "dark task-workspace container with the website as a sub-window" is a deeper structural
change — our model keeps the frame = the website. Real artifact wiring, real Publish/Revert.
