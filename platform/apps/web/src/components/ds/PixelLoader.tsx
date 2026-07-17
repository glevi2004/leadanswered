"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * PixelLoader — a flowing MONOCHROME GRAYSCALE pixel field (loading / "Lu is
 * working"). Not binary on/off: every pixel continuously varies its gray shade as
 * a smooth wave travels through, so a gradient of grays flows across — the same
 * grayscale language as Lu's voice. `rows = 1` is a single flowing line; more rows
 * make the "booting up your company" field. Indeterminate.
 */
export function PixelLoader({
  cols = 22,
  rows = 1,
  speed = 1.6,
  size = "md",
  className,
}: {
  cols?: number;
  rows?: number;
  speed?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const context = cv.getContext("2d");
    if (!context) return;
    const ctx = context;

    const CELL = size === "sm" ? 5 : 7;
    const GAP = 2;
    const PITCH = CELL + GAP;
    const Wpx = cols * PITCH - GAP;
    const Hpx = rows * PITCH - GAP;

    let fg = "#2b2b2b";
    const readFg = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim();
      if (v) fg = v;
    };
    let dpr = 1;
    const size2 = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.floor(Wpx * dpr);
      cv.height = Math.floor(Hpx * dpr);
      cv.style.width = `${Wpx}px`;
      cv.style.height = `${Hpx}px`;
    };
    readFg();
    size2();

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    let raf = 0;
    function frame(tms: number) {
      raf = requestAnimationFrame(frame);
      const t = reduce ? 0 : tms / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, Wpx, Hpx);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // smooth traveling grayscale wave (two harmonics + slight row skew)
          const p = x * 0.5 + y * 0.65;
          const s = 0.5 + 0.32 * Math.sin(p - t * speed) + 0.18 * Math.sin(x * 0.21 - t * speed * 0.6);
          ctx.globalAlpha = 0.1 + 0.82 * Math.max(0, Math.min(1, s));
          ctx.fillStyle = fg;
          ctx.fillRect(x * PITCH, y * PITCH, CELL, CELL);
        }
      }
      ctx.globalAlpha = 1;
    }
    raf = requestAnimationFrame(frame);

    const onResize = () => {
      readFg();
      size2();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [cols, rows, speed, size]);

  return <canvas ref={ref} className={cn("block", className)} style={{ imageRendering: "pixelated" }} role="status" aria-label="Loading" />;
}
