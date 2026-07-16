# Lu Computer — the canvas engine

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md).

The Workspace canvas runs on **`react-zoom-pan-pinch` v4** (MIT, `react: *`, no badge, no watermark). The
library owns the transform/input engine — wheel-zoom-to-cursor, trackpad pinch, drag-pan with momentum,
min/max scale, bounds, and `zoomToElement()` for animated fly-to. **We** own the grid, the culling, and every
node + edge. This split keeps 100% of the design system ours: `<TransformComponent>` renders no chrome, so
there is nothing to override.

## Why this library

`react-zoom-pan-pinch` owns only the transform/input engine, so every pixel of the canvas stays ours (same
JSX, tokens, edges) — a smaller, safer surface than a full graph library.

Rejected alternatives: **React Flow** (attribution badge) and **tldraw** (watermark) bundle grid + culling +
fly-to but brand the canvas; **AntV X6** has a non-vanishing grid but an imperative shape-registry API that
fights a Tailwind-token React design system; **Reaflow** is auto-layout / directed-graph oriented, awkward for
fixed-position live iframes.

Because the library does not ship a grid, the grid is **ours to render in screen space** — which is the fix
for the core failure mode (below), not just a cost.

## Division of labor

| `react-zoom-pan-pinch` owns | We own |
|---|---|
| viewport transform: wheel/pinch/drag → transform, momentum, min/max, bounds | — |
| fly-to: `zoomToElement(id, scale, ms, ease)` | the target-scale math (`goToSite`/`goToAgent`) |
| — | **screen-space grid overlay** synced to the transform (the fix) |
| — | **JS iframe culling** (render `<iframe>` vs placeholder by viewport rect) |
| — | **all node JSX + connector SVG** (the design system) |
| — | selection/dock state (`sel`) + dock wiring |

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
        <svg /* connectors — vectorEffect non-scaling-stroke */ />
        {/* node wrappers — each id="<node>-node" + class "<type>-node" */}
      </div>
    </TransformComponent>
  </TransformWrapper>

  <CanvasToolbar active={tool} onPick={setTool} />          {/* overlay, above the pane */}
  <button /* reset */ />
</div>
```

## Grid → screen-space overlay (the core fix)

A grid rendered *inside* the zoom layer with a fixed world-space tile shrinks on-screen as you zoom out; below
~1px per line it can't render and the grid shimmers, then vanishes into a blank void. The grid is therefore a
**screen-space** sibling of the transform: its lines are painted once at crisp 1px and only its
`background-size`/`position` update, so it never shimmers or vanishes.

`react-zoom-pan-pinch` reports `{ positionX, positionY, scale }` on every `onTransformed`:

```ts
function syncGrid({ positionX, positionY, scale }) {
  const g = gridRef.current; if (!g) return;
  const cell = GRID * scale;                       // GRID = 26
  g.style.backgroundSize = `${cell}px ${cell}px`;
  g.style.backgroundPosition = `${positionX}px ${positionY}px`;   // aligns to world origin
}
```

The `.canvas-grid` gradients supply the 1px look for light/dark. *LOD polish (optional):* when `scale < 0.25`,
multiply `cell` by 5 so the grid doesn't get too dense far out.

## Culling → iframe-vs-placeholder by viewport rect (the perf gate)

Only the site/sheet **frames** are expensive (live `<iframe>` / scaled `<SheetGrid>`). Gate them by screen rect:

```ts
// screen rect of a node center p under the current transform
const onScreen = (p) => {
  const { positionX, positionY, scale } = tf.current;
  const sx = positionX + p.x * scale, sy = positionY + p.y * scale;
  const m = 240;                                   // margin so it mounts just before entering
  return sx > -m && sy > -m && sx < wrapW + m && sy < wrapH + m;
};
```

`scheduleCull()` rAF-throttles a `visible: Set<id>` state; a frame renders its `<iframe>` when visible, else a
lightweight placeholder (same `bg-card`/`border`/`rounded-lg` box + dept icon + label). The frame **box is
always rendered** (edges + layout stay stable); only iframe↔placeholder swaps.

## Camera + interaction

- **Zoom** — built-in wheel (zoom-to-cursor) + pinch; RZPP owns pinch on its pane, so the sidebar/dock (outside
  the pane) never scale and the browser page never zooms over a site.
- **Pan** — built-in drag-pan with momentum; node wrappers are `excluded` so moving a node never pans.
- **Fly-to** — `apiRef.current.zoomToElement("<id>-node", scale, 480, "easeOut")`. `goToSite` uses
  `scale = min(CLICK_Z, w*.86/w, h*.86/h)`; initial mount centers via `setTransform(wrapW/2, wrapH/2, 0.26, 0)`.
- **Min-scale floor** — `minScale 0.18`: the whole board fits, and you can't shrink the company to a dot.
- **Node reposition** — pointer handlers on node wrappers (offset by `/scale` from `tf.current`); persisted.
- **Click vs pan** — a node wrapper `onClick` guarded by a `moved` flag from `onPanning`; the iframe stays
  `pointer-events:none` so site clicks hit the wrapper. Empty-background click deselects (recenter on Lu).
- **Dock wiring** — agent/teammate → select that dept + open the docked dock + fly-to; Lu → clear + recenter;
  site/sheet → fly-to + dashed box only.

## Tradeoffs

- **Raster softness** — RZPP scales the layer with one CSS transform, so a magnified iframe is a
  miniature-vs-crisp tradeoff. Crisp-at-any-zoom live sites need a non-transform renderer (separate work).
- **We own grid + culling** — ~35 lines, but it keeps the rendering literally unchanged, which is the point.
- `zoomToElement` targets a DOM id, so each node wrapper needs a stable `id`.
