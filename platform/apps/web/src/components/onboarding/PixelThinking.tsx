"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * PixelThinking — the pixel "Lu is thinking" charging loader (ONBOARDING.md §2).
 *
 * A pixelated charging orb: chunky square pixels laid out as a disc that fill
 * ring-by-ring from the center outward, pulse, then POP — and loop. It's the ONE
 * "Lu is about to talk" touch (LOCKED: no voice-bars, no pixelate-in text — once
 * this is swapped out, her message renders in the normal font). Reusable so the
 * app dock can share it later. Tints to `currentColor`, so wrap it in a
 * `text-foreground` / `text-emerald-500` / etc. to recolor.
 */

const N = 7; // grid is N×N chunky pixels
const CENTER = (N - 1) / 2; // 3 — the single center pixel (ring 0)
const R = 3; // number of rings the charge fills (0..R)

// Precompute each cell's radial ring + whether it sits inside the disc (corners are dropped
// so the field reads round, not square). Pure data → computed once at module load.
type Cell = { i: number; j: number; ring: number; inside: boolean };
const CELLS: Cell[] = (() => {
  const out: Cell[] = [];
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const dx = i - CENTER;
      const dy = j - CENTER;
      const dist = Math.sqrt(dx * dx + dy * dy);
      out.push({ i, j, ring: Math.round(dist), inside: dist <= CENTER + 0.35 });
    }
  }
  return out;
})();

export function PixelThinking({
  size = 40,
  speed = 150,
  className,
}: {
  /** overall px size of the orb */
  size?: number;
  /** ms per charge step (lower = faster) */
  speed?: number;
  className?: string;
}) {
  // one cycle: fill rings 0..R (R+1 steps) → POP → REST, then repeat.
  const CYCLE = R + 3;
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick((n) => (n + 1) % CYCLE), speed);
    return () => clearInterval(t);
  }, [speed, CYCLE]);

  const pos = tick; // 0..R fill · R+1 pop · R+2 rest
  const popping = pos === R + 1;
  const resting = pos === R + 2;
  const filledTo = resting ? -1 : popping ? R : pos; // highest lit ring (-1 = empty)

  const gap = Math.max(1, Math.round((size / N) * 0.16));
  return (
    <motion.div
      role="status"
      aria-label="Lu is thinking"
      className={cn("relative inline-grid align-middle", className)}
      style={{
        width: size,
        height: size,
        gridTemplateColumns: `repeat(${N}, 1fr)`,
        gridTemplateRows: `repeat(${N}, 1fr)`,
        gap,
        imageRendering: "pixelated",
        filter: "drop-shadow(0 0 6px color-mix(in oklab, currentColor 45%, transparent))",
      }}
      animate={{ scale: popping ? 1.16 : 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 15 }}
    >
      {CELLS.map((c) => {
        if (!c.inside) return <span key={`${c.i}-${c.j}`} aria-hidden />;
        const lit = c.ring <= filledTo;
        const edge = lit && c.ring === filledTo && !popping; // the just-charged ring flares brightest
        return (
          <span
            key={`${c.i}-${c.j}`}
            aria-hidden
            style={{
              borderRadius: 1,
              background: "currentColor",
              opacity: lit ? (edge ? 1 : 0.85) : 0.12,
              transform: `scale(${lit ? (edge ? 1.06 : 1) : 0.6})`,
              boxShadow: popping ? "0 0 4px currentColor" : undefined,
              transition: "opacity 120ms ease, transform 120ms ease",
            }}
          />
        );
      })}
    </motion.div>
  );
}
