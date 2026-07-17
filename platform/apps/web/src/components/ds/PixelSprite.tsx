"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { pixelateToGrid } from "@/lib/pixelate";

/**
 * PixelSprite — turn ANY image into an animated pixel-art component.
 * Loads `src`, pixelates + recolors it (lib/pixelate), renders it as a real pixel
 * grid on a <canvas>, and plays a reveal ANIMATION — dissolve / wipe / rise /
 * radial / twinkle. Drop it in for loading screens, empty states, hero marks, etc.
 *
 * The animation loops as a triangle (appear pixel-by-pixel, then disappear), so it
 * reads as a "booting…" loader out of the box.
 */
export type PixelAnim =
  | "none"
  | "dissolve"
  | "wipe"
  | "rise"
  | "radial"
  | "twinkle"
  | "type"
  | "spiral"
  | "scan"
  | "wave"
  | "pulse"
  | "rain"
  | "gather"
  | "glitch";

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function hash(k: number) {
  const h = Math.sin(k * 12.9898) * 43758.5453;
  return h - Math.floor(h);
}

export function PixelSprite({
  src,
  source,
  pixelSize = 10,
  colors = 0,
  gradient,
  cell = 10,
  gap = 1,
  animation = "none",
  speed = 1,
  className,
  canvasRef,
}: {
  /** Image URL to load (same-origin). */
  src?: string;
  /** OR a pre-composed ImageData (e.g. a multi-layer composition). */
  source?: ImageData;
  pixelSize?: number;
  colors?: number;
  gradient?: string[];
  cell?: number;
  gap?: number;
  animation?: PixelAnim;
  speed?: number;
  className?: string;
  /** Optional external ref to the canvas (e.g. for exporting a frame). */
  canvasRef?: { current: HTMLCanvasElement | null };
}) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const gradKey = gradient ? gradient.join(",") : "";

  useEffect(() => {
    const cv = localRef.current;
    if (!cv) return;
    const context = cv.getContext("2d");
    if (!context) return;
    const ctx = context;

    let raf = 0;
    let stopped = false;
    let grid: Uint8ClampedArray | null = null;
    let cols = 0, rows = 0;
    let thr: Float32Array | null = null;
    let ph: Float32Array | null = null;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);

    const setup = (data: ImageData) => {
      if (stopped) return;
      const g = pixelateToGrid(data, { pixelSize, colors: colors || undefined, gradient });
      cols = g.width;
      rows = g.height;
      grid = g.data;

      // per-cell reveal threshold + a stable random phase (for twinkle)
      thr = new Float32Array(cols * rows);
      ph = new Float32Array(cols * rows);
      const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
      const maxR = Math.hypot(cx, cy) || 1;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const k = y * cols + x;
          let t = 0;
          if (animation === "dissolve" || animation === "rain" || animation === "gather") t = hash(k);
          else if (animation === "wipe") t = cols > 1 ? x / (cols - 1) : 0;
          else if (animation === "rise") t = rows > 1 ? (rows - 1 - y) / (rows - 1) : 0;
          else if (animation === "radial") t = Math.hypot(x - cx, y - cy) / maxR;
          else if (animation === "type") t = cols * rows > 1 ? k / (cols * rows - 1) : 0;
          else if (animation === "spiral") {
            const ang = (Math.atan2(y - cy, x - cx) + Math.PI) / (2 * Math.PI);
            const rad = Math.hypot(x - cx, y - cy) / maxR;
            t = rad * 0.55 + ang * 0.45;
          }
          thr[k] = t * 0.85; // leave headroom so the last cells land before the peak
          ph[k] = hash(k * 2 + 1);
        }
      }

      const W = cols * cell, H = rows * cell;
      cv.width = Math.floor(W * dpr);
      cv.height = Math.floor(H * dpr);
      // responsive: scale down to fit the container, keep aspect ratio (no squish)
      cv.style.width = `${W}px`;
      cv.style.maxWidth = "100%";
      cv.style.height = "auto";

      raf = requestAnimationFrame(frame);
    };

    function frame(tms: number) {
      raf = requestAnimationFrame(frame);
      if (!grid || !thr || !ph) return;
      const t = (tms / 1000) * speed;
      // triangle 0→1→0 over a ~2.4s period (at speed 1)
      const cyc = (t * 0.42) % 1;
      const gph = cyc < 0.5 ? cyc * 2 : (1 - cyc) * 2;

      const scanPos = (t * 0.4) % 1; // for scan
      const glitchBucket = Math.floor(t * 10); // for glitch
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cols * cell, rows * cell);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const k = y * cols + x;
          const i = k * 4;
          if (grid[i + 3] === 0) continue;
          let a = 1, ox = 0, oy = 0;
          switch (animation) {
            case "none":
              break;
            case "twinkle":
              a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 3 + ph[k] * 6.283));
              break;
            case "wave":
              a = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin((x + y) * 0.45 - t * 4));
              break;
            case "pulse":
              a = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(t * 2.6));
              break;
            case "scan": {
              const cp = cols > 1 ? x / (cols - 1) : 0;
              const d = (cp - scanPos) / 0.1;
              a = 0.2 + 0.8 * Math.exp(-d * d);
              break;
            }
            case "glitch": {
              const rs = hash(y * 13 + glitchBucket * 7);
              if (rs > 0.8) {
                ox = (hash(y + glitchBucket * 3) - 0.5) * cell * 5;
                a = 0.55;
              }
              break;
            }
            case "rain": {
              const rp = clamp01((gph - thr[k]) / 0.3);
              a = rp;
              oy = -(1 - rp) * cell * 7;
              break;
            }
            case "gather": {
              const rp = clamp01((gph - thr[k]) / 0.32);
              a = rp;
              const dir = ph[k] * 6.283;
              const amp = (1 - rp) * cell * 9;
              ox = Math.cos(dir) * amp;
              oy = Math.sin(dir) * amp;
              break;
            }
            default:
              // reveal family: dissolve, wipe, rise, radial, type, spiral
              a = clamp01((gph - thr[k]) / 0.14);
          }
          if (a <= 0.003) continue;
          ctx.globalAlpha = a;
          ctx.fillStyle = `rgb(${grid[i]},${grid[i + 1]},${grid[i + 2]})`;
          ctx.fillRect(x * cell + ox, y * cell + oy, cell - gap, cell - gap);
        }
      }
      ctx.globalAlpha = 1;
    }

    // source: a pre-composed ImageData wins; otherwise load the image URL
    if (source) {
      setup(source);
    } else if (src) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      img.onload = () => {
        const off = document.createElement("canvas");
        off.width = img.naturalWidth;
        off.height = img.naturalHeight;
        const octx = off.getContext("2d");
        if (!octx) return;
        octx.drawImage(img, 0, 0);
        try {
          setup(octx.getImageData(0, 0, off.width, off.height));
        } catch {
          /* tainted */
        }
      };
    }

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [src, source, pixelSize, colors, gradKey, cell, gap, animation, speed]); // eslint-disable-line react-hooks/exhaustive-deps

  const setRef = (el: HTMLCanvasElement | null) => {
    localRef.current = el;
    if (canvasRef) canvasRef.current = el;
  };
  return <canvas ref={setRef} className={cn("block", className)} style={{ imageRendering: "pixelated" }} />;
}
