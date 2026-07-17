"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Mac-plastic palette — brown shadow → tan → beige highlight (evokes the 128K case). */
const MAC_STOPS: [number, number, number][] = [
  [95, 74, 45],
  [150, 122, 74],
  [196, 172, 120],
  [223, 205, 160],
];
function macColor(s: number) {
  const p = Math.max(0, Math.min(1, s)) * (MAC_STOPS.length - 1);
  const i = Math.min(MAC_STOPS.length - 2, Math.floor(p));
  const f = p - i;
  const a = MAC_STOPS[i];
  const b = MAC_STOPS[i + 1];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
}

/** Pixel computer (monitor + stand + base), 11×9. Scaled to the wordmark height. */
const COMPUTER = [
  "01111111110",
  "01000000010",
  "01011111010",
  "01011111010",
  "01011111010",
  "01000000010",
  "01111111110",
  "00001110000",
  "00111111100",
];

/**
 * PixelWordmark — the logo experiment: the flowing grayscale pixel field
 * ("booting up your company") shaped into the letters "lu.computer". The text is
 * rasterized to a tiny pixel-height mask (the "." drawn as a crisp 2×2 block, not
 * the font's 1px dot); a traveling grayscale wave flows through the pixels.
 *
 * Variations:
 *   plain                    — letters only, grayscale flow
 *   field                    — + a faint grayscale flowing field behind
 *   field emphasis="field"   — the field carries the bright flow; letters are dark gray
 *   animated={false}         — static, no shimmer (frozen)
 */
export function PixelWordmark({
  text = "lu.computer",
  rows = 9,
  cell = 6,
  gap = 1,
  speed = 1.6,
  field = false,
  emphasis = "letters",
  animated = true,
  icon = true,
  script = false,
  deslant = 0.24,
  palette = "mono",
  color,
  className,
}: {
  text?: string;
  rows?: number;
  cell?: number;
  gap?: number;
  speed?: number;
  /** Render a flowing field behind the letters. */
  field?: boolean;
  /** "letters" = letters flow, field faint · "field" = field flows bright, letters dark gray. */
  emphasis?: "letters" | "field";
  /** false = static (no shimmer). */
  animated?: boolean;
  /** Show the pixel computer glyph at the start. */
  icon?: boolean;
  /** Cursive calligraphy (Mac "hello." script) instead of the mono pixel font. */
  script?: boolean;
  /** How much to un-slant the script so it reads upright (0 = leave italic). */
  deslant?: number;
  /** "mono" = grayscale ink · "mac" = cream/beige/brown Mac-plastic tones. */
  palette?: "mono" | "mac";
  /** Force the ink colour (e.g. "#ffffff") instead of the theme --foreground. */
  color?: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const context = cv.getContext("2d");
    if (!context) return;
    const ctx = context;

    let raf = 0;
    let stopped = false;
    let cleanup = () => {};

    const fontSpec = script
      ? `600 ${rows}px "Snell Roundhand", "Apple Chancery", "Brush Script MT", cursive`
      : `700 ${rows}px "IBM Plex Mono", ui-monospace, monospace`;

    // rasterize one substring to a rows-tall on/off mask
    function raster(str: string) {
      const off = document.createElement("canvas");
      const octx = off.getContext("2d");
      if (!octx) return { cols: 0, mask: new Uint8Array(0) };
      octx.font = fontSpec;
      // script fonts overflow the em box (ascenders/tails) + the de-slant shear pushes
      // the bottom right — pad the width for both
      const shearPad = script ? Math.ceil(deslant * rows) + Math.round(rows * 0.4) : 0;
      const w = Math.max(1, Math.ceil(octx.measureText(str).width) + shearPad);
      off.width = w;
      off.height = rows;
      octx.font = fontSpec; // context state resets on resize
      octx.textBaseline = "top";
      octx.fillStyle = "#000";
      if (script && deslant) {
        // un-slant: x' = x + deslant*y shifts the bottom right, cancelling the italic lean
        octx.setTransform(1, 0, deslant, 1, 0, 0);
        octx.fillText(str, 0, 0);
        octx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        octx.fillText(str, 0, 0);
      }
      const data = octx.getImageData(0, 0, w, rows).data;
      const mask = new Uint8Array(w * rows);
      for (let i = 0; i < w * rows; i++) mask[i] = data[i * 4 + 3] > 110 ? 1 : 0;
      return { cols: w, mask };
    }

    // compose "lu" + [2×2 dot] + "computer" (the dot is 4 pixels, at the baseline)
    // lowest inked row of a part = its baseline (parts have no descenders here)
    function baselineOf(p: { cols: number; mask: Uint8Array }) {
      for (let y = rows - 1; y >= 0; y--) {
        for (let x = 0; x < p.cols; x++) if (p.mask[y * p.cols + x]) return y;
      }
      return rows - 1;
    }

    // the pixel computer glyph, nearest-neighbor scaled to `rows` tall
    function iconMask() {
      const BH = COMPUTER.length;
      const BW = COMPUTER[0].length;
      const targetW = Math.max(1, Math.round((BW * rows) / BH));
      const mask = new Uint8Array(targetW * rows);
      for (let ty = 0; ty < rows; ty++) {
        for (let tx = 0; tx < targetW; tx++) {
          const sy = Math.min(BH - 1, Math.floor((ty * BH) / rows));
          const sx = Math.min(BW - 1, Math.floor((tx * BW) / targetW));
          mask[ty * targetW + tx] = COMPUTER[sy][sx] === "1" ? 1 : 0;
        }
      }
      return { cols: targetW, mask };
    }

    function buildMask() {
      // script: let the cursive font render the whole string (incl. its own period)
      if (script) {
        const p = raster(text);
        return { cols: p.cols, mask: p.mask };
      }
      const parts = text.split(".").map(raster);
      const DOT = 2;
      const DOTGAP = 1;
      const ICONGAP = 2;
      const ico = icon ? iconMask() : null;
      let total = ico ? ico.cols + ICONGAP : 0;
      parts.forEach((p, i) => {
        total += p.cols;
        if (i < parts.length - 1) total += DOTGAP + DOT + DOTGAP;
      });
      const mask = new Uint8Array(total * rows);
      let xoff = 0;
      if (ico) {
        for (let y = 0; y < rows; y++) for (let x = 0; x < ico.cols; x++) if (ico.mask[y * ico.cols + x]) mask[y * total + (xoff + x)] = 1;
        xoff += ico.cols + ICONGAP;
      }
      parts.forEach((p, i) => {
        for (let y = 0; y < rows; y++) for (let x = 0; x < p.cols; x++) if (p.mask[y * p.cols + x]) mask[y * total + (xoff + x)] = 1;
        xoff += p.cols;
        if (i < parts.length - 1) {
          xoff += DOTGAP;
          // 2×2 dot with its BOTTOM on the letter baseline (sits with the letters, not below)
          const base = baselineOf(parts[i]);
          for (let dy = 0; dy < DOT; dy++) for (let dx = 0; dx < DOT; dx++) mask[(base - dy) * total + (xoff + dx)] = 1;
          xoff += DOT + DOTGAP;
        }
      });
      return { cols: total, mask };
    }

    function start() {
      const el = ref.current;
      if (!el || stopped) return;
      const { cols, mask } = buildMask();
      const R = rows;
      const PITCH = cell + gap;
      const Wpx = cols * PITCH - gap;
      const Hpx = R * PITCH - gap;

      let fg = "#2b2b2b";
      const readFg = () => {
        const v = getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim();
        if (v) fg = v;
      };
      let dpr = 1;
      const size = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        el.width = Math.floor(Wpx * dpr);
        el.height = Math.floor(Hpx * dpr);
        // responsive: never overflow the container — scale down proportionally
        el.style.width = `${Wpx}px`;
        el.style.maxWidth = "100%";
        el.style.height = "auto";
      };
      readFg();
      size();

      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const moving = animated && !reduce;
      const fieldFlows = field && emphasis === "field";

      const draw = (tms: number) => {
        const t = moving ? tms / 1000 : 0;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, Wpx, Hpx);
        for (let y = 0; y < R; y++) {
          for (let x = 0; x < cols; x++) {
            const on = mask[y * cols + x];
            if (!on && !field) continue;
            const p = x * 0.5 + y * 0.65;
            const s = Math.max(0, Math.min(1, 0.5 + 0.32 * Math.sin(p - t * speed) + 0.18 * Math.sin(x * 0.21 - t * speed * 0.6)));
            if (on) {
              if (palette === "mac") {
                // Mac-plastic tones: the shade rides the flow through the beige/brown ramp
                ctx.fillStyle = macColor(moving ? s : 0.62);
                ctx.globalAlpha = 1;
              } else {
                ctx.fillStyle = color ?? fg;
                ctx.globalAlpha = color ? 1 : fieldFlows ? 0.95 : moving ? 0.2 + 0.78 * s : 0.85;
              }
            } else {
              // field: bright flow (capped so letters stay darker) in emphasis="field"; else faint
              ctx.fillStyle = palette === "mac" ? macColor(s) : color ?? fg;
              ctx.globalAlpha = fieldFlows ? 0.16 + 0.6 * s : 0.03 + 0.07 * s;
            }
            ctx.fillRect(x * PITCH, y * PITCH, cell, cell);
          }
        }
        ctx.globalAlpha = 1;
      };

      if (moving) {
        const frame = (tms: number) => {
          raf = requestAnimationFrame(frame);
          draw(tms);
        };
        raf = requestAnimationFrame(frame);
      } else {
        draw(0);
      }

      const onResize = () => {
        readFg();
        size();
        if (!moving) draw(0);
      };
      window.addEventListener("resize", onResize);
      cleanup = () => window.removeEventListener("resize", onResize);
    }

    if (document.fonts?.ready) document.fonts.ready.then(start).catch(start);
    else start();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, [text, rows, cell, gap, speed, field, emphasis, animated, icon, script, deslant, palette, color]);

  return <canvas ref={ref} className={cn("block", className)} style={{ imageRendering: "pixelated" }} role="img" aria-label={text} />;
}
