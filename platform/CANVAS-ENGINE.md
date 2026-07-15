# Plan — rebuild the Workspace canvas engine on `react-zoom-pan-pinch` (no badge, keep our design system)

## Why a library, and why this one

The jank is an **engine** problem, reproduced with Playwright:

- The grid is one `120000 × 120000px` div **inside** the zoom layer with a fixed `26px` tile, so on-screen
  tile size = `26 × zoom`. Zoom out → tiles hit ~2–4px → 1px lines can't render → the grid **shimmers,
  then vanishes into a blank void** (dead by the first zoom-out burst). That giant layer also re-composites
  every zoom step (with 16 live iframes) → the "whole UI feels buggy". Main-thread JS is fine (16 ms/frame),
  so more CSS won't fix it.
- `MIN_Z = 0.08` lets you zoom out until the whole company is a 200px dot.

We rejected **React Flow** (attribution badge) and **tldraw** (watermark, same problem). Among badge-free
OSS, only React Flow bundled grid + culling + fly-to for live-HTML nodes — so every alternative means the
**library is the pan/zoom engine and we own the grid + culling**. Given that, pick the one that keeps our
rendering 100% intact:

**`react-zoom-pan-pinch` v4 (MIT, `react: *`, no badge, no watermark).** It owns only the transform/input
engine — wheel-zoom-to-cursor, trackpad pinch, drag-pan with momentum, min/max scale, bounds, and
`zoomToElement()` for animated fly-to. **Every pixel of our canvas stays ours** (same JSX, tokens, edges).
This is a *smaller, safer* change than the React Flow migration — we delete our fragile imperative
pan/zoom/animate code and keep everything visual.

(Considered + rejected: **AntV X6** — built-in non-vanishing grid, but an imperative shape-registry API
that fights a Tailwind-token React design system. **Reaflow** — auto-layout / directed-graph oriented,
awkward for fixed-position live iframes.)

## Division of labor

| React Flow *would* have owned | Here: `react-zoom-pan-pinch` owns | Here: **we** own (unchanged / ~35 new lines) |
|---|---|---|
| viewport transform | wheel/pinch/drag → transform, momentum, min/max, bounds | — |
| fly-to | `zoomToElement(id, scale, ms, ease)` | the target-scale math (`goToSite`/`goToAgent`) |
| grid | — | **screen-space grid overlay** synced to transform (the fix) |
| culling | — | **JS iframe culling** (render `<iframe>` vs placeholder by viewport rect) |
| nodes/edges | — | **all node JSX + connector SVG, verbatim** (design system) |
| selection/dock | — | our `sel` state + `useSarah()` wiring (unchanged) |

## The one promise: our design system is untouched

Unlike the React Flow path (where we'd neutralize their node chrome), `react-zoom-pan-pinch` renders **no
chrome at all** — `<TransformComponent>` is a bare transformed div. So there is **nothing to override**.
Every node keeps its exact markup: `bg-card`, `border`, `.elev-card`
(`0 1px 2px -1px rgb(0 0 0 / .06), 0 3px 8px -3px rgb(0 0 0 / .07)` light / bevel dark), `rounded-lg`
(`--radius` 0.75rem), accent `rgb(${a.accent})`, badges, and the blue `SELECT_RING #5b9bff` /
`SELECT_HALO`. Light + dark keep working because we never stopped driving from CSS vars.

## File map

- `pnpm add react-zoom-pan-pinch` in `platform/apps/web`.
- **Rewrite `components/canvas/CompanyCanvas.tsx`** (keep name + export → `canvas/page.tsx` unchanged):
  - **Delete:** `applyView`, `animateTo`, `onWheelNative`, the pan branch of `onPointer*`, `flyTo`'s rAF,
    the `viewRef`, the `blockPinch` document hack, and the in-world `.canvas-grid` div.
  - **Keep:** all node render blocks (Lu / agent / site / sheet / teammate), the connector `<svg>`, the
    selection dashed box, `CanvasToolbar` + reset overlays, `useSarah()` wiring, `sel`/`pos` state,
    node-drag (repositioning) handlers, `loadPositions`/`savePositions`/`persist`.
  - **Add:** `<TransformWrapper>` + `<TransformComponent>` around the world layer; `apiRef` for imperative
    calls; `onTransformed` → `syncGrid()` + `scheduleCull()`; a screen-space grid `<div>` sibling; the
    culling gate on site/sheet frames.
- **Unchanged:** `lib/canvas/graph.ts` (center-based positions — no anchoring changes needed here),
  `SheetGrid.tsx`, `CanvasToolbar.tsx`, `agent-work.ts`, `sarah-context`, `embed/[node]`, `canvas/page.tsx`.
- **`globals.css`:** keep the `.canvas-grid` gradients (they become the screen-space overlay's look);
  add nothing else.

## Layout skeleton

```tsx
<div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-background select-none">
  {/* SCREEN-SPACE grid — sibling of the transform, never scaled → never vanishes */}
  <div ref={gridRef} className="canvas-grid pointer-events-none absolute inset-0" />

  <TransformWrapper
    ref={apiRef}
    minScale={0.18} maxScale={2.6} initialScale={0.26}     // 0.18 floor: whole board fits, no void
    limitToBounds={false}
    wheel={{ step: 0.12 }}                                  // zoom-to-cursor (built in)
    pinch={{ step: 5 }}
    doubleClick={{ disabled: true }}
    panning={{ excluded: ["lu-node","agent-node","site-node","sheet-node","teammate-node"] }}
    onTransformed={(_, s) => { tf.current = s; syncGrid(s); scheduleCull(); }}
  >
    <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
      <div className="relative" style={{ width: 0, height: 0 }}>   {/* world origin (0,0) */}
        <svg /* connectors — unchanged, vectorEffect non-scaling-stroke */ />
        {/* node wrappers — unchanged JSX; each id="<node>-node" + class "<type>-node" */}
      </div>
    </TransformComponent>
  </TransformWrapper>

  <CanvasToolbar active={tool} onPick={setTool} />          {/* overlay, above the pane */}
  <button /* reset */ />
</div>
```

## Grid → screen-space overlay (the actual bug fix)

`react-zoom-pan-pinch` reports `{ positionX, positionY, scale }` on every `onTransformed`. Drive the grid
in **screen space** so its lines are always crisp 1px and its density tracks zoom:

```ts
function syncGrid({ positionX, positionY, scale }) {
  const g = gridRef.current; if (!g) return;
  const cell = GRID * scale;                       // GRID = 26
  g.style.backgroundSize = `${cell}px ${cell}px`;
  g.style.backgroundPosition = `${positionX}px ${positionY}px`;   // aligns to world origin
}
```

The lines are painted once at 1px (the `.canvas-grid` gradients), so they **never shimmer or vanish** — the
element itself isn't scaled, only its `background-size`/`position` update. This is exactly what React Flow's
`<Background>` does internally; here it's 6 lines and token-driven for light/dark.
*LOD polish (optional):* when `scale < 0.25`, multiply `cell` by 5 so the grid doesn't get too dense far out.

## Culling → iframe-vs-placeholder by viewport rect (the perf fix)

Only the site/sheet **frames** are expensive (live `<iframe>` / scaled `<SheetGrid>`). Gate them:

```ts
// screen rect of a node center p under the current transform
const onScreen = (p) => {
  const { positionX, positionY, scale } = tf.current;
  const sx = positionX + p.x * scale, sy = positionY + p.y * scale;
  const m = 240;                                   // margin so it mounts just before entering
  return sx > -m && sy > -m && sx < wrapW + m && sy < wrapH + m;
};
```

`scheduleCull()` rAF-throttles a `visible: Set<id>` state; a frame renders its `<iframe>` when visible, else
a lightweight placeholder (same `bg-card`/`border`/`rounded-lg` box + dept icon + label). The frame **box is
always rendered** (edges + layout stay stable); only iframe↔placeholder swaps. At overview ~4–6 of 16 frames
are live instead of all 16.

## Camera + interaction mapping (imperative → RZPP)

| Today (hand-rolled) | `react-zoom-pan-pinch` |
|---|---|
| `onWheelNative` + `Math.exp` zoom-to-cursor | built-in `wheel` (zoom-to-cursor) |
| `onPointer*` pan + `applyView` | built-in drag-pan (`panning`, momentum) |
| `animateTo` rAF tween + `flyTo` | `apiRef.current.zoomToElement("<id>-node", scale, 480, "easeOut")` |
| `goToSite` scale `min(CLICK_Z, w*.86/w, h*.86/h)` | same math → pass as `zoomToElement` scale |
| initial center | mount effect → `setTransform(wrapW/2, wrapH/2, 0.26, 0)` |
| `MIN_Z 0.08` (void) | `minScale 0.18` (whole board fits, can't shrink to a dot) |
| pinch zooms whole browser page | RZPP owns pinch on its pane; sidebar/dock are outside → never scale |
| node reposition drag | **kept** — our pointer handlers on node wrappers (`/scale` from `tf.current`), `excluded` from panning so moving a node never pans the canvas |
| click routing via `onPointerUp` | node wrapper `onClick` (guarded by a `moved` flag from `onPanning`); iframe stays `pointer-events:none` so site clicks hit the wrapper |
| empty-canvas deselect | click on the world background (non-moved) → `setSel("lu")` + `setSelectedAgent(null)` |

Dock wiring is the same `useSarah()` contract: agent/teammate → `setSelectedAgent(dept)` + `setWidgetMode("docked")` +
`openWidget()` + fly-to; Lu → clear + recenter; site/sheet → fly-to + dashed box only.

## Parity checklist (match today, then beat it on grid + perf)

- [ ] Same layout, same node visuals in **light and dark** (tokens / `.elev-card` / accents / `rounded-lg`).
- [ ] Click agent → ring + dock opens on that dept + camera flies. Click Lu → dock + recenter.
- [ ] Click site → blue dashed box + framed fly-to (capped, sharp). Empty click → deselect.
- [ ] Drag any node ≥4px → moves + persists across reload; reset restores defaults; moving a node never pans.
- [ ] Wheel/pinch zoom the **canvas only**; sidebar/dock never scale; no browser page zoom over a site.
- [ ] **Grid stays crisp graph-paper at every zoom, including full zoom-out (the bug).**
- [ ] Connectors visible both themes; working spokes animate in accent.
- [ ] Off-screen site iframes unmount (placeholder) and remount on approach.

## Risks / honest tradeoffs

- **Blur tradeoff unchanged** — RZPP still scales the layer with one CSS transform, so a magnified iframe is
  the same miniature-vs-crisp tradeoff we already settled on. This migration fixes the grid + jank, not the
  intrinsic raster softness.
- We own grid + culling (vs. free in React Flow) — but that's ~35 lines and keeps our rendering literally
  unchanged, which is the point.
- `zoomToElement` targets a DOM id; each node wrapper needs a stable `id` — trivial.
- Click-vs-pan and node-drag-vs-canvas-pan need the same `moved`/`excluded` guards we already have.

## Verification (Playwright, both themes — same rig as the repro)

1. `pnpm exec tsc --noEmit` clean.
2. Screenshot `/canvas` (`la_org=mature`) light + dark: overview, mid-zoom, **full zoom-out**, zoomed-into-a-site.
   Assert the **grid is present + crisp at full zoom-out** (the failing case), connectors visible, frame
   roundness + selection box correct, node visuals identical to today.
3. Interaction: click Finance → dock + fly; click a site → dashed box; drag a node 200px → reload → still moved;
   confirm the min-scale floor (no void).
4. Re-run the wheel-oscillation perf probe → steady grid, no long frames.
5. Zero console errors.

## Out of scope

Real agent runtime, crisp-at-any-zoom live sites (needs a non-transform renderer — separate), toolbar
add-node actions (tracked separately), mobile canvas polish.
```
