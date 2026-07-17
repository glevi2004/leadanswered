"use client";

/**
 * /dev/pixelate — pixel-art COMPOSITION studio (DEV tool).
 * Stack layers (images + text), drag them around a canvas, then pixelate + recolor
 * (design-system palette) + animate the whole composition. Output is one
 * <PixelSprite> you can drop into loaders / empty states / hero marks.
 * e.g. the pixel Mac + "lu.computer" text, both dissolving in the same blue.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PixelSprite, type PixelAnim } from "@/components/ds/PixelSprite";

const COMPW = 1040, COMPH = 460;

const RECOLORS: { label: string; stops: string[] | null }[] = [
  { label: "Original", stops: null },
  { label: "Ink", stops: ["#1b1b1f", "#8a8a8a", "#f2f2f2"] },
  { label: "Blue", stops: ["#0b1f3a", "#5b9bff", "#e8f1ff"] },
  { label: "Emerald", stops: ["#06281c", "#10b981", "#d6ffe9"] },
  { label: "Amber", stops: ["#3a1f00", "#f59e0b", "#fff0d6"] },
  { label: "Violet", stops: ["#1e0a3a", "#8b5cf6", "#efe6ff"] },
  { label: "Red", stops: ["#3a0a0a", "#ef4444", "#ffe0e0"] },
];
const ANIMATIONS: PixelAnim[] = [
  "none", "dissolve", "wipe", "rise", "radial", "twinkle",
  "type", "spiral", "scan", "wave", "pulse", "rain", "gather", "glitch",
];
const CHECKER = "repeating-conic-gradient(#f2f2f2 0deg 90deg,#e6e6e6 90deg 180deg) 0 0/16px 16px";

type Layer = { id: number; kind: "image" | "text"; src?: string; text?: string; fontSize?: number; x: number; y: number; scale: number };

let nextId = 3;

export default function PixelStudio() {
  const [layers, setLayers] = useState<Layer[]>([
    { id: 1, kind: "image", src: "/pixel/mac.png", x: 40, y: 70, scale: 0.55 },
    { id: 2, kind: "text", text: "lu.computer", fontSize: 86, x: 330, y: 175, scale: 1 },
  ]);
  const [selected, setSelected] = useState<number | null>(2);
  const [pixelSize, setPixelSize] = useState(12);
  const [colors, setColors] = useState(20);
  const [cellPx, setCellPx] = useState(11);
  const [gap, setGap] = useState(1);
  const [recolorIdx, setRecolorIdx] = useState(2);
  const [custom, setCustom] = useState({ on: false, from: "#1b1b2f", to: "#5b9bff" });
  const [animation, setAnimation] = useState<PixelAnim>("dissolve");
  const [speed, setSpeed] = useState(1);
  const [composite, setComposite] = useState<ImageData | null>(null);

  const layoutRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<HTMLCanvasElement | null>(null);
  const imgCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);

  const gradient = custom.on ? [custom.from, custom.to] : RECOLORS[recolorIdx].stops ?? undefined;

  const measure = useCallback((l: Layer): { w: number; h: number } => {
    if (l.kind === "image") {
      const img = imgCache.current.get(l.src!);
      return { w: (img?.naturalWidth ?? 120) * l.scale, h: (img?.naturalHeight ?? 120) * l.scale };
    }
    const c = document.createElement("canvas").getContext("2d")!;
    c.font = `700 ${l.fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    return { w: c.measureText(l.text ?? "").width, h: (l.fontSize ?? 40) * 1.05 };
  }, []);

  // draw the composition → ImageData (for PixelSprite) + layout preview (for editing)
  const recompose = useCallback(() => {
    const off = document.createElement("canvas");
    off.width = COMPW;
    off.height = COMPH;
    const cx = off.getContext("2d")!;
    for (const l of layers) {
      if (l.kind === "image") {
        const img = imgCache.current.get(l.src!);
        if (img) cx.drawImage(img, l.x, l.y, img.naturalWidth * l.scale, img.naturalHeight * l.scale);
      } else {
        cx.font = `700 ${l.fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
        cx.textBaseline = "top";
        cx.fillStyle = "#18181c";
        cx.fillText(l.text ?? "", l.x, l.y);
      }
    }
    setComposite(cx.getImageData(0, 0, COMPW, COMPH));

    // layout preview (actual colours) + selection box
    const lc = layoutRef.current;
    if (lc) {
      lc.width = COMPW;
      lc.height = COMPH;
      const g = lc.getContext("2d")!;
      g.clearRect(0, 0, COMPW, COMPH);
      g.drawImage(off, 0, 0);
      const sel = layers.find((l) => l.id === selected);
      if (sel) {
        const { w, h } = measure(sel);
        g.strokeStyle = "#5b9bff";
        g.lineWidth = 3;
        g.setLineDash([8, 6]);
        g.strokeRect(sel.x - 4, sel.y - 4, w + 8, h + 8);
      }
    }
  }, [layers, selected, measure]);

  // ensure images loaded, then recompose
  useEffect(() => {
    const srcs = layers.filter((l) => l.kind === "image" && l.src).map((l) => l.src!);
    let pending = 0;
    for (const s of srcs) {
      if (imgCache.current.has(s)) continue;
      pending++;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imgCache.current.set(s, img);
        recompose();
      };
      img.src = s;
    }
    document.fonts?.ready.then(recompose).catch(() => {});
    recompose();
    void pending;
  }, [layers, recompose]);

  // dragging on the layout canvas
  function toCanvas(e: React.PointerEvent) {
    const lc = layoutRef.current!;
    const r = lc.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * COMPW, y: ((e.clientY - r.top) / r.height) * COMPH };
  }
  function onDown(e: React.PointerEvent) {
    const p = toCanvas(e);
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      const { w, h } = measure(l);
      if (p.x >= l.x && p.x <= l.x + w && p.y >= l.y && p.y <= l.y + h) {
        setSelected(l.id);
        drag.current = { id: l.id, dx: p.x - l.x, dy: p.y - l.y };
        (e.target as Element).setPointerCapture?.(e.pointerId);
        return;
      }
    }
    setSelected(null);
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const p = toCanvas(e);
    const d = drag.current;
    setLayers((ls) => ls.map((l) => (l.id === d.id ? { ...l, x: Math.round(p.x - d.dx), y: Math.round(p.y - d.dy) } : l)));
  }
  function onUp() {
    drag.current = null;
  }

  const sel = layers.find((l) => l.id === selected) ?? null;
  const update = (patch: Partial<Layer>) => setLayers((ls) => ls.map((l) => (l.id === selected ? { ...l, ...patch } : l)));
  function addText() {
    const id = nextId++;
    setLayers((ls) => [...ls, { id, kind: "text", text: "text", fontSize: 72, x: 120, y: 120, scale: 1 }]);
    setSelected(id);
  }
  function addImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const id = nextId++;
    setLayers((ls) => [...ls, { id, kind: "image", src: URL.createObjectURL(f), x: 120, y: 120, scale: 0.5 }]);
    setSelected(id);
  }
  function removeSel() {
    if (selected == null) return;
    setLayers((ls) => ls.filter((l) => l.id !== selected));
    setSelected(null);
  }
  function download() {
    spriteRef.current?.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = "pixel-sprite.png";
      a.click();
    });
  }

  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-[1120px]">
        <h1 className="text-2xl font-semibold tracking-tight">Pixel studio — compose · pixelate · animate</h1>
        <p className="mt-1 text-sm text-muted-foreground">Drag layers to arrange, then pixelate + recolor + animate the whole thing into one <code className="font-mono">&lt;PixelSprite&gt;</code>.</p>

        {/* layers toolbar */}
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 elev-1">
          <Button size="sm" variant="outline" onClick={addText}>+ Text</Button>
          <label className="inline-flex cursor-pointer items-center rounded-lg border px-2.5 py-1 text-[0.8rem] font-medium elev-btn">
            + Image
            <input type="file" accept="image/*" className="hidden" onChange={addImage} />
          </label>
          {sel && (
            <>
              <span className="ml-1 text-[12px] text-muted-foreground">selected: {sel.kind}</span>
              {sel.kind === "text" && (
                <input
                  value={sel.text}
                  onChange={(e) => update({ text: e.target.value })}
                  className="rounded-lg border bg-background px-2 py-1 text-[13px]"
                  placeholder="text"
                />
              )}
              <Ctl label="size" v={sel.kind === "text" ? sel.fontSize ?? 72 : Math.round(sel.scale * 100)}
                min={sel.kind === "text" ? 16 : 5} max={sel.kind === "text" ? 200 : 200}
                set={(n) => update(sel.kind === "text" ? { fontSize: n } : { scale: n / 100 })} w="w-28" />
              <Button size="sm" variant="ghost" onClick={removeSel}>Delete</Button>
            </>
          )}
          <Button size="sm" onClick={download} className="ml-auto">Download frame</Button>
        </div>

        {/* pixel + recolor + animation controls */}
        <div className="mt-3 flex flex-wrap items-center gap-5 rounded-2xl border bg-card p-4 elev-1">
          <Ctl label="pixel" v={pixelSize} min={4} max={32} set={setPixelSize} w="w-24" />
          <Ctl label="colors" v={colors} min={2} max={64} set={setColors} w="w-24" />
          <Ctl label="cell" v={cellPx} min={4} max={20} set={setCellPx} w="w-20" />
          <Ctl label="gap" v={gap} min={0} max={3} set={setGap} w="w-14" />
          <Ctl label="speed" v={speed} min={0.2} max={3} step={0.1} set={setSpeed} w="w-24" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4 elev-1">
          <span className="mr-1 text-[13px] text-muted-foreground">recolor</span>
          {RECOLORS.map((g, i) => {
            const active = !custom.on && recolorIdx === i;
            return (
              <button key={g.label} onClick={() => { setCustom((c) => ({ ...c, on: false })); setRecolorIdx(i); }}
                className={cn("flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[12px] transition", active ? "border-[#5b9bff] bg-muted" : "hover:bg-muted")}>
                <span className="h-4 w-7 rounded" style={{ background: g.stops ? `linear-gradient(90deg, ${g.stops.join(",")})` : CHECKER }} />
                {g.label}
              </button>
            );
          })}
          <label className={cn("flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[12px]", custom.on ? "border-[#5b9bff] bg-muted" : "")}>
            <input type="checkbox" checked={custom.on} onChange={(e) => setCustom((c) => ({ ...c, on: e.target.checked }))} />
            custom
            <input type="color" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, on: true, from: e.target.value }))} className="h-5 w-6 rounded border-0 bg-transparent p-0" />
            <input type="color" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, on: true, to: e.target.value }))} className="h-5 w-6 rounded border-0 bg-transparent p-0" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4 elev-1">
          <span className="mr-1 text-[13px] text-muted-foreground">animation</span>
          {ANIMATIONS.map((a) => (
            <button key={a} onClick={() => setAnimation(a)}
              className={cn("rounded-lg border px-2.5 py-1 text-[12px] capitalize transition", animation === a ? "border-[#5b9bff] bg-muted" : "hover:bg-muted")}>
              {a}
            </button>
          ))}
        </div>

        {/* layout (editable) + pixel result */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <figure className="rounded-2xl border bg-card p-4 elev-1">
            <figcaption className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">layout — drag to arrange</figcaption>
            <div className="overflow-hidden rounded-lg" style={{ background: CHECKER }}>
              <canvas ref={layoutRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} className="block w-full cursor-move touch-none" />
            </div>
          </figure>
          <figure className="rounded-2xl border bg-card p-4 elev-1">
            <figcaption className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">PixelSprite · {animation}</figcaption>
            <div className="grid place-items-center overflow-hidden rounded-lg p-2" style={{ background: CHECKER, minHeight: 240 }}>
              {composite && (
                <PixelSprite source={composite} pixelSize={pixelSize} colors={colors} gradient={gradient}
                  cell={cellPx} gap={gap} animation={animation} speed={speed} canvasRef={spriteRef} className="max-h-full max-w-full" />
              )}
            </div>
          </figure>
        </div>
      </div>
    </div>
  );
}

function Ctl({ label, v, min, max, step = 1, set, w, className }: { label: string; v: number; min: number; max: number; step?: number; set: (n: number) => void; w: string; className?: string }) {
  return (
    <label className={cn("flex items-center gap-2 text-[13px] text-muted-foreground", className)}>
      {label}
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(+e.target.value)} className={cn(w, "accent-[#5b9bff]")} />
      <span className="w-8 font-mono tabular-nums text-foreground">{v}</span>
    </label>
  );
}
