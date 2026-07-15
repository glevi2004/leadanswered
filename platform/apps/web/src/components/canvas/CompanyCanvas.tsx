"use client";

import * as React from "react";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import {
  Bell, Boxes, Check, ChevronDown, Code2, Headphones, Megaphone, PenTool,
  Scale, TrendingUp, Undo2, Wallet,
} from "lucide-react";
import { SarahIcon } from "@/components/icons/sarah";
import {
  AGENTS, PAGES, SHEETS, TEAMMATES, loadPositions, savePositions, clearPositions,
  defaultPositions, agentById, ORBIT_R, type Positions, type DeptId,
} from "@/lib/canvas/graph";
import { agentBadge, workingDepts } from "@/lib/canvas/agent-work";
import { SheetGrid } from "@/components/canvas/SheetGrid";
import { CanvasToolbar, type CanvasTool } from "@/components/canvas/CanvasToolbar";
import { BrowserChrome } from "@/components/canvas/BrowserChrome";
import { ArtifactsNav } from "@/components/canvas/ArtifactsNav";
import { useSarah } from "@/components/sarah/sarah-context";

/**
 * The Workspace canvas — a flat plane (Figma-style). Lu at center, agents on a ring; each
 * agent's frames (pages + any sheet) sit in a HORIZONTAL ROW next to it, outward from Lu.
 * Each site is the real /embed page rendered wide (IFRAME_W) then SCALED DOWN to a small
 * crisp-looking miniature. Clicking a site selects it (blue dashed box) + flies the camera
 * to it — no panel/open. Pan/zoom is owned by `react-zoom-pan-pinch` (the transform engine);
 * the GRID is a screen-space overlay synced to the transform (so it never shimmers/vanishes),
 * and the live iframes are CULLED to whatever's near the viewport (off-screen → placeholder).
 * Everything visual is still ours — RZPP renders no chrome.
 */

const DEPT_ICON: Record<DeptId, React.ComponentType<{ className?: string }>> = {
  support: Headphones, operations: Boxes, finance: Wallet, legal: Scale,
  engineering: Code2, design: PenTool, marketing: Megaphone, sales: TrendingUp,
};

// node geometry (world units at z=1) — small frames showing a SHRUNK full-page miniature
const CARD_W = 320;
const CARD_H = 210;
const IFRAME_W = 1024;                    // page rendered at desktop width...
const IFRAME_SCALE = CARD_W / IFRAME_W;   // ...then scaled down so the whole layout fits
const IFRAME_H = Math.round(CARD_H / IFRAME_SCALE);
const SHEET_W = 300;
const SHEET_H = 200;
const SHEET_INNER_W = 840;
const SHEET_SCALE = SHEET_W / SHEET_INNER_W;
const SHEET_INNER_H = Math.round(SHEET_H / SHEET_SCALE);
const SEL_PAD = 8;    // breathing room around a frame (selection-box offset) — tight, hugs the frame
const CLICK_Z = 3.2;  // zoom cap when you click a site — frame nearly fills the viewport

const MIN_Z = 0.18;   // floor: the whole board still fits, but you can't shrink it to a dot
const MAX_Z = 3.2;
const INIT_Z = 0.26;  // overview
const GRID = 26;      // grid = a FIXED lattice: each square is always GRID world units (scales with zoom, never re-sizes)
const ZOOM_SENS = 0.0015; // multiplicative wheel zoom (gentle — the proven feel; RZPP's additive wheel was violent)
const SELECT_RING = "#5b9bff";
const SELECT_HALO = "rgba(91,155,255,0.12)";
const DRAG_CLASS = "lu-node";   // marks a node: excluded from canvas panning + carries drag handlers

const FRAME_IDS: string[] = [...PAGES.map((p) => p.id), ...SHEETS.map((s) => s.id)];

type TF = { scale: number; positionX: number; positionY: number };

/** Off-screen stand-in for a live frame (so we don't keep 16 iframes mounted). */
function FramePlaceholder({ label, dept }: { label: string; dept: DeptId }) {
  const Icon = DEPT_ICON[dept];
  const a = agentById(dept);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-card text-muted-foreground">
      <Icon className="size-8" />
      <span className="text-sm" style={{ color: a ? `rgb(${a.accent})` : undefined }}>{label}</span>
    </div>
  );
}

export function CompanyCanvas() {
  const { setSelectedAgent, openWidget, setWidgetMode } = useSarah();
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const apiRef = React.useRef<ReactZoomPanPinchRef | null>(null);
  const tf = React.useRef<TF>({ scale: INIT_Z, positionX: 0, positionY: 0 });

  const [ready, setReady] = React.useState(false);
  const [pos, setPos] = React.useState<Positions>(defaultPositions);
  const [sel, setSel] = React.useState<string>("lu"); // "lu" | DeptId | teammateId | site-id
  const [tool, setTool] = React.useState<CanvasTool>("select");
  const [visible, setVisible] = React.useState<Set<string>>(() => new Set(FRAME_IDS));
  const posRef = React.useRef<Positions>(pos);
  posRef.current = pos;
  const selRef = React.useRef(sel);
  selRef.current = sel;
  const overlayRef = React.useRef<HTMLDivElement>(null);

  const drag = React.useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const moved = React.useRef(false);
  const saveT = React.useRef<number | null>(null);
  const cullRaf = React.useRef<number | null>(null);
  const goT = React.useRef<number | null>(null);
  const panMoved = React.useRef(false);

  const persist = React.useCallback((p: Positions) => {
    if (saveT.current) window.clearTimeout(saveT.current);
    saveT.current = window.setTimeout(() => savePositions(p), 300);
  }, []);

  /* ---- screen-space grid: a fixed overlay whose tile size/offset track the transform, so
        the 1px lines are painted at constant on-screen size and NEVER shimmer or vanish ---- */
  const syncGrid = React.useCallback((s: TF) => {
    const g = gridRef.current;
    if (!g) return;
    // fixed world lattice: a square is ALWAYS GRID world units, so it just scales with the
    // canvas like every component — no LOD, no density jumps, its dimension never changes.
    const cell = GRID * s.scale;
    g.style.backgroundSize = `${cell}px ${cell}px`;
    g.style.backgroundPosition = `${s.positionX}px ${s.positionY}px`;
  }, []);

  /* ---- culling: only the frames whose box is near the viewport render their live iframe ---- */
  const recomputeVisible = React.useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const { scale, positionX, positionY } = tf.current;
    const W = el.clientWidth, H = el.clientHeight, m = 280;
    const next = new Set<string>();
    for (const id of FRAME_IDS) {
      const p = posRef.current[id];
      if (!p) continue;
      const sx = positionX + p.x * scale, sy = positionY + p.y * scale;
      if (sx > -m && sy > -m && sx < W + m && sy < H + m) next.add(id);
    }
    setVisible((prev) => {
      if (prev.size === next.size && [...next].every((id) => prev.has(id))) return prev;
      return next;
    });
  }, []);
  const scheduleCull = React.useCallback(() => {
    if (cullRaf.current) return;
    cullRaf.current = requestAnimationFrame(() => { cullRaf.current = null; recomputeVisible(); });
  }, [recomputeVisible]);

  /* ---- position the screen-space focused-site overlays IMPERATIVELY (no React re-render per
        frame) — the selected page frame's screen rect from pos + the live transform. The overlay
        content only re-renders when `sel` changes; the position tracks every transform. ---- */
  const positionOverlay = React.useCallback(() => {
    const ov = overlayRef.current;
    if (!ov) return;
    const id = selRef.current;
    const p = PAGES.some((pp) => pp.id === id) ? posRef.current[id] : null;
    if (!p) { ov.style.display = "none"; return; }
    const { scale, positionX, positionY } = tf.current;
    ov.style.display = "block";
    ov.style.left = `${positionX + (p.x - CARD_W / 2) * scale}px`;
    ov.style.top = `${positionY + (p.y - CARD_H / 2) * scale}px`;
    ov.style.width = `${CARD_W * scale}px`;
    ov.style.height = `${CARD_H * scale}px`;
  }, []);

  const onTransform = React.useCallback((_ref: ReactZoomPanPinchRef, state: TF) => {
    tf.current = { scale: state.scale, positionX: state.positionX, positionY: state.positionY };
    syncGrid(tf.current);
    scheduleCull();
    positionOverlay();
  }, [syncGrid, scheduleCull, positionOverlay]);

  React.useEffect(() => {
    setPos(loadPositions());
    const blockPageZoom = (e: WheelEvent) => { if (e.ctrlKey) e.preventDefault(); }; // no browser pinch-zoom
    document.addEventListener("wheel", blockPageZoom, { passive: false });
    return () => {
      document.removeEventListener("wheel", blockPageZoom);
      if (cullRaf.current) cancelAnimationFrame(cullRaf.current);
      if (saveT.current) window.clearTimeout(saveT.current);
      if (goT.current) window.clearTimeout(goT.current);
    };
  }, []);

  // re-cull whenever positions change (drag / reset)
  React.useEffect(() => { recomputeVisible(); }, [pos, recomputeVisible]);

  // reposition the focused-site overlays when the selection or layout changes
  React.useEffect(() => { positionOverlay(); }, [sel, pos, positionOverlay]);

  /* ---- our OWN wheel zoom (RZPP's is disabled): multiplicative zoom-to-cursor, gentle.
        RZPP's additive `scale + step*|deltaY|` slammed to the limit in one notch. ---- */
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (drag.current) return; // mid node-drag
      e.preventDefault();
      const api = apiRef.current;
      if (!api) return;
      const { scale, positionX, positionY } = tf.current;
      const next = Math.min(MAX_Z, Math.max(MIN_Z, scale * Math.exp(-e.deltaY * ZOOM_SENS)));
      if (next === scale) return;
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      const k = next / scale;                          // keep the point under the cursor fixed
      const nx = cx - (cx - positionX) * k, ny = cy - (cy - positionY) * k;
      tf.current = { scale: next, positionX: nx, positionY: ny };
      api.setTransform(nx, ny, next, 0);               // instant (no tween) — feels 1:1 with the wheel
      syncGrid(tf.current);
      scheduleCull();
      positionOverlay();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [syncGrid, scheduleCull, positionOverlay]);

  /** center Lu once the engine is live */
  const onInit = React.useCallback((ref: ReactZoomPanPinchRef) => {
    apiRef.current = ref;
    const el = wrapRef.current;
    if (el) {
      ref.setTransform(el.clientWidth / 2, el.clientHeight / 2, INIT_Z, 0);
      tf.current = { scale: INIT_Z, positionX: el.clientWidth / 2, positionY: el.clientHeight / 2 };
    }
    syncGrid(tf.current);
    recomputeVisible();
    positionOverlay();
    setReady(true);
  }, [syncGrid, recomputeVisible, positionOverlay]);

  /** fly the camera so a node's center sits in the middle of the viewport at `scale`.
   *  every node's true world-center is exactly pos[id], so we drive setTransform directly
   *  (precise for translate-centered pills too — unlike zoomToElement's offset math). */
  const flyToNode = React.useCallback((nodeId: string, scale: number) => {
    // deferred a beat so any dock open/close has taken its width before we center
    if (goT.current) window.clearTimeout(goT.current);
    goT.current = window.setTimeout(() => {
      goT.current = null;
      const el = wrapRef.current, api = apiRef.current, p = posRef.current[nodeId];
      if (!el || !api || !p) return;
      const z = Math.min(MAX_Z, Math.max(MIN_Z, scale));
      api.setTransform(el.clientWidth / 2 - p.x * z, el.clientHeight / 2 - p.y * z, z, 480, "easeOut");
    }, 70);
  }, []);

  /* ------------ click behavior (unchanged from before) ------------ */

  const goToSite = (nodeId: string, w: number, h: number) => {
    const el = wrapRef.current;
    if (!el) return;
    setSel(nodeId);
    // frame nearly fills the view (0.8), leaving room for the screen-space pill/nav/action-bar
    flyToNode(nodeId, Math.min(CLICK_Z, (el.clientWidth * 0.8) / w, (el.clientHeight * 0.8) / h));
  };
  const goToAgent = (nodeId: string, selId: string, dept: DeptId, targetZ: number) => {
    setSel(selId);
    setSelectedAgent(dept);
    setWidgetMode("docked");
    openWidget();
    flyToNode(nodeId, targetZ);
  };
  const selectLu = () => {
    setSel("lu");
    setSelectedAgent(null);
    setWidgetMode("docked");
    openWidget();
    flyToNode("lu", INIT_Z);
  };
  const nodeClick = (id: string) => {
    if (id === "lu") return selectLu();
    if (PAGES.some((p) => p.id === id)) return goToSite(id, CARD_W, CARD_H);
    if (SHEETS.some((s) => s.id === id)) return goToSite(id, SHEET_W, SHEET_H);
    if (AGENTS.some((a) => a.id === id)) return goToAgent(id, id, id as DeptId, 0.55);
    const t = TEAMMATES.find((x) => x.id === id);
    if (t) goToAgent(id, id, t.dept, 0.7);
  };

  /* ------------ node drag (reposition) — nodes carry DRAG_CLASS so RZPP never pans from
        them; we run our own pointer handlers, converting screen delta by the live scale ------------ */
  const nodeDrag = (id: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation();
      const p = posRef.current[id];
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = { id, sx: e.clientX, sy: e.clientY, ox: p?.x ?? 0, oy: p?.y ?? 0 };
      moved.current = false;
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
      if (!moved.current) return;
      const z = tf.current.scale;
      setPos((prev) => {
        const next = { ...prev, [d.id]: { x: d.ox + dx / z, y: d.oy + dy / z } };
        persist(next);
        return next;
      });
    },
    onPointerUp: (e: React.PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
      if (d && !moved.current) nodeClick(d.id); // a click, not a drag
    },
  });

  const resetLayout = () => {
    clearPositions();
    setPos(defaultPositions());
  };

  const working = workingDepts();
  const updates = AGENTS.map((a) => ({ a, badge: agentBadge(a.id) })).filter((x) => x.badge);
  const totalUpdates = updates.reduce((n, x) => n + (x.badge?.count ?? 0), 0);

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full cursor-grab select-none overflow-hidden bg-background font-sans text-foreground active:cursor-grabbing"
    >
      <style>{`@keyframes lu-dash{to{stroke-dashoffset:-8}}.lu-frame{pointer-events:none}`}</style>

      {/* screen-space grid — sibling of the transform, never scaled → never shimmers/vanishes */}
      <div
        ref={gridRef}
        className="canvas-grid pointer-events-none absolute inset-0"
        style={{ opacity: ready ? 1 : 0, transition: "opacity .25s" }}
      />

      <TransformWrapper
        onInit={onInit}
        onTransform={onTransform}
        initialScale={INIT_Z}
        minScale={MIN_Z}
        maxScale={MAX_Z}
        limitToBounds={false}
        centerOnInit={false}
        wheel={{ disabled: true }}
        doubleClick={{ disabled: true }}
        panning={{ excluded: [DRAG_CLASS] }}
        onPanningStart={() => { panMoved.current = false; }}
        onPanning={() => { panMoved.current = true; }}
        onPanningStop={() => { if (!panMoved.current) { setSel("lu"); setSelectedAgent(null); } }}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ width: 0, height: 0, overflow: "visible" }}
        >
          <div className="relative" style={{ opacity: ready ? 1 : 0, transition: "opacity .25s" }}>
            {/* edges */}
            <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
              <circle cx={0} cy={0} r={ORBIT_R} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              {AGENTS.map((a) => {
                const ap = pos[a.id]; if (!ap) return null;
                const on = a.id === sel;
                const isWorking = working.includes(a.id);
                const stroke = on ? SELECT_RING : isWorking ? `rgb(${a.accent})` : "currentColor";
                const op = on ? 0.9 : isWorking ? 0.55 : 0.34;
                const childEdge = (x2: number, y2: number, key: string, r = 4) => (
                  <g key={key}>
                    <line x1={ap.x} y1={ap.y} x2={x2} y2={y2} stroke={on ? SELECT_RING : "currentColor"} strokeOpacity={on ? 0.6 : 0.32} strokeWidth={1.25} strokeDasharray="5 7" vectorEffect="non-scaling-stroke" />
                    <circle cx={x2} cy={y2} r={r} fill="currentColor" opacity={0.3} />
                  </g>
                );
                return (
                  <g key={a.id}>
                    <line
                      x1={0} y1={0} x2={ap.x} y2={ap.y}
                      stroke={stroke} strokeOpacity={op} strokeWidth={1.25} strokeDasharray="5 7" vectorEffect="non-scaling-stroke"
                      style={isWorking && !on ? { animation: "lu-dash 1s linear infinite" } : undefined}
                    />
                    <circle cx={ap.x} cy={ap.y} r={5} fill="currentColor" opacity={0.32} />
                    {PAGES.filter((pg) => pg.dept === a.id).map((pg) => { const pp = pos[pg.id]; return pp ? childEdge(pp.x, pp.y, pg.id) : null; })}
                    {SHEETS.filter((s) => s.dept === a.id).map((s) => { const sp = pos[s.id]; return sp ? childEdge(sp.x, sp.y, s.id) : null; })}
                    {TEAMMATES.filter((t) => t.dept === a.id).map((t) => { const tp = pos[t.id]; return tp ? childEdge(tp.x, tp.y, t.id, 6) : null; })}
                  </g>
                );
              })}

              {/* selected SITE — blue dashed box, offset by the frame padding; non-scaling
                  stroke keeps it a constant thin dashed line at every zoom */}
              {(() => {
                const isPage = PAGES.some((pg) => pg.id === sel);
                const isSheet = SHEETS.some((s) => s.id === sel);
                const sp = (isPage || isSheet) ? pos[sel] : null;
                if (!sp) return null;
                const w = isPage ? CARD_W : SHEET_W;
                const h = isPage ? CARD_H : SHEET_H;
                return (
                  <rect
                    x={sp.x - w / 2 - SEL_PAD} y={sp.y - h / 2 - SEL_PAD}
                    width={w + 2 * SEL_PAD} height={h + 2 * SEL_PAD} rx={10}
                    fill="none" stroke={SELECT_RING} strokeWidth={1.75} strokeDasharray="7 6"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })()}
            </svg>

            {/* page frames — REAL /embed miniatures; iframe only when near the viewport */}
            {PAGES.map((pg) => {
              const p = pos[pg.id]; if (!p) return null;
              return (
                <div
                  key={pg.id}
                  data-node={pg.id}
                  className={`${DRAG_CLASS} absolute cursor-pointer overflow-hidden rounded-[10px] border border-black/5 bg-card elev-3 dark:border-white/10`}
                  style={{ left: p.x - CARD_W / 2, top: p.y - CARD_H / 2, width: CARD_W, height: CARD_H }}
                  {...nodeDrag(pg.id)}
                >
                  {/* the whole WINDOW (chrome + page) renders at desktop width then scales down,
                      so the chrome bar is proportional to the page — not the frame's native px */}
                  <div className="flex origin-top-left flex-col" style={{ width: IFRAME_W, height: IFRAME_H, transform: `scale(${IFRAME_SCALE})` }}>
                    <BrowserChrome host="lu.computer" page={pg.label} />
                    <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
                      {visible.has(pg.id) ? (
                        <iframe src={`/embed/${pg.id}`} title={pg.label} className="lu-frame size-full border-0 bg-background" />
                      ) : (
                        <FramePlaceholder label={pg.label} dept={pg.dept} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* sheet frames — REAL editable spreadsheets (scaled DOM); culled the same way */}
            {SHEETS.map((s) => {
              const p = pos[s.id]; if (!p) return null;
              return (
                <div
                  key={s.id}
                  data-node={s.id}
                  className={`${DRAG_CLASS} absolute cursor-pointer overflow-hidden rounded-[10px] border border-black/5 bg-card elev-3 dark:border-white/10`}
                  style={{ left: p.x - SHEET_W / 2, top: p.y - SHEET_H / 2, width: SHEET_W, height: SHEET_H }}
                  {...nodeDrag(s.id)}
                >
                  {visible.has(s.id) ? (
                    <div className="lu-frame origin-top-left" style={{ width: SHEET_INNER_W, height: SHEET_INNER_H, transform: `scale(${SHEET_SCALE})` }}><SheetGrid id={s.id} /></div>
                  ) : (
                    <FramePlaceholder label={s.label} dept={s.dept} />
                  )}
                </div>
              );
            })}

            {/* agent nodes */}
            {AGENTS.map((a) => {
              const p = pos[a.id]; if (!p) return null;
              const on = a.id === sel;
              const Icon = DEPT_ICON[a.id];
              const badge = agentBadge(a.id);
              return (
                <div key={a.id} data-node={a.id} className={`${DRAG_CLASS} absolute cursor-pointer`} style={{ left: p.x, top: p.y }} {...nodeDrag(a.id)}>
                  {badge && (
                    <span className="absolute -top-16 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-card px-4 py-2 text-lg font-medium text-foreground elev-2">
                      {badge.kind === "working"
                        ? <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" style={{ animationDuration: "1.6s" }} />
                        : <span className="size-3 rounded-full bg-amber-500" />}
                      {badge.count}
                    </span>
                  )}
                  <div
                    className="neu-socket -translate-x-1/2 -translate-y-1/2 rounded-[2.6rem] p-2 transition-shadow"
                    style={{ boxShadow: on ? `0 0 0 5px var(--card), 0 0 0 10px ${SELECT_RING}, 0 0 0 26px ${SELECT_HALO}` : undefined }}
                  >
                    <div className={`neu-raise flex items-center gap-4 rounded-[2.05rem] px-9 py-5 ${a.active ? "" : "opacity-40"}`}>
                      {a.active && (
                        <span className="grid size-9 place-items-center" style={{ color: `rgb(${a.accent})` }}>
                          <Icon className="size-8" />
                        </span>
                      )}
                      <span className={`text-[2rem] font-medium ${a.active ? "text-foreground" : "text-muted-foreground"}`}>{a.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* teammate nodes — game-like + selectable (ring) */}
            {TEAMMATES.map((t) => {
              const p = pos[t.id]; if (!p) return null;
              const a = agentById(t.dept)!;
              const on = t.id === sel;
              return (
                <div key={t.id} data-node={t.id} className={`${DRAG_CLASS} absolute cursor-pointer`} style={{ left: p.x, top: p.y }} {...nodeDrag(t.id)}>
                  <div className="flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
                    <span
                      className="grid size-24 place-items-center rounded-full border-[3px] text-4xl font-bold text-white"
                      style={{ backgroundColor: `rgb(${a.accent})`, borderColor: on ? SELECT_RING : `rgba(${a.accent},0.5)`, boxShadow: on ? `0 0 0 5px var(--card), 0 0 0 10px ${SELECT_RING}, 0 0 0 24px ${SELECT_HALO}` : "0 10px 20px rgba(0,0,0,0.2), inset 0 3px 3px rgba(255,255,255,0.4), inset 0 -6px 10px rgba(0,0,0,0.2)" }}
                    >
                      {t.initials}
                    </span>
                    <span className="rounded-2xl bg-card px-5 py-2 text-center elev-2">
                      <span className="block text-2xl font-semibold leading-tight text-foreground">{t.name}</span>
                      <span className="block text-lg leading-tight text-muted-foreground">{t.role}</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Lu — center */}
            <div data-node="lu" className={`${DRAG_CLASS} absolute cursor-pointer`} style={{ left: 0, top: 0 }} {...nodeDrag("lu")}>
              <div
                className="neu-socket -translate-x-1/2 -translate-y-1/2 rounded-[3rem] p-2.5 transition-shadow"
                style={{ boxShadow: sel === "lu" ? `0 0 0 5px var(--card), 0 0 0 10px ${SELECT_RING}, 0 0 0 26px ${SELECT_HALO}` : undefined }}
              >
                <div className="neu-raise flex items-center gap-4 rounded-[2.4rem] px-12 py-8">
                  <SarahIcon className="size-11 text-foreground" />
                  <span className="text-5xl font-semibold tracking-tight text-foreground">Lu</span>
                </div>
              </div>
            </div>

          </div>
        </TransformComponent>
      </TransformWrapper>

      {/* focused-site controls (DESIGN-DEPTH-2 ref-83/85) — SCREEN-SPACE + FIXED SIZE, so they stay
          small no matter the zoom. The wrapper is positioned imperatively (positionOverlay) to the
          selected page frame's screen rect; children sit just outside its edges. */}
      <div ref={overlayRef} className="pointer-events-none absolute z-20">
        {(() => {
          const selPage = PAGES.find((pp) => pp.id === sel);
          if (!selPage) return null;
          const ag = agentById(selPage.dept);
          return (
            <>
              {/* task pill — above the frame */}
              <div className="pointer-events-auto absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap">
                <div className="gloss-ink flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px]">
                  <SarahIcon className="size-3" />
                  <span className="font-semibold">{ag?.agentName ?? "Agent"}</span>
                  <span className="max-w-[120px] truncate text-primary-foreground/60">{selPage.label}</span>
                  <ChevronDown className="size-2.5 text-primary-foreground/55" />
                </div>
              </div>
              {/* artifacts nav — left of the frame */}
              <div className="pointer-events-auto absolute right-full top-1/2 mr-3 -translate-y-1/2">
                <ArtifactsNav />
              </div>
              {/* action bar — below the frame */}
              <div className="pointer-events-auto absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap">
                <div className="gloss flex items-center gap-0.5 rounded-full p-0.5 text-[10px]">
                  <button type="button" className="gloss-ink flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium">
                    <Check className="size-2.5" /> Publish to Staging
                  </button>
                  <button type="button" className="rounded-full px-2.5 py-0.5 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10">Revert All</button>
                  <button type="button" className="rounded-full px-2.5 py-0.5 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10">Request changes</button>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* canvas toolbar (bottom-center) */}
      <CanvasToolbar active={tool} onPick={setTool} />

      {/* agent-updates pill (ref-75) — bottom-left, layered avatar chips */}
      {updates.length > 0 && (
        <div className="elev-2 absolute bottom-4 left-16 z-20 flex items-center gap-2.5 rounded-full bg-card py-1.5 pl-2 pr-2">
          <span className="relative grid size-7 place-items-center rounded-full text-muted-foreground">
            <Bell className="size-4" />
            <span className="absolute right-1 top-1 size-2 rounded-full bg-red-500 ring-2 ring-card" />
          </span>
          <span className="flex -space-x-2">
            {updates.slice(0, 3).map(({ a }) => (
              <span key={a.id} className="grid size-6 place-items-center rounded-full text-[10px] font-bold text-white ring-2 ring-card" style={{ background: `rgb(${a.accent})` }}>
                {a.label[0]}
              </span>
            ))}
          </span>
          <span className="text-sm font-medium text-foreground">{totalUpdates} agent updates</span>
          <button type="button" className="gloss ml-1 rounded-full px-3 py-1 text-sm font-medium text-foreground">Review</button>
        </div>
      )}

      {/* reset layout */}
      <button
        type="button"
        onClick={resetLayout}
        title="Reset layout"
        className="absolute bottom-4 left-4 z-20 grid size-9 place-items-center rounded-xl border bg-card text-muted-foreground elev-btn transition-colors hover:text-foreground"
      >
        <Undo2 className="size-4" />
      </button>
    </div>
  );
}
