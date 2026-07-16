"use client";

import * as React from "react";

/**
 * Freehand DRAW layer (CANVAS-TOOLS.md §9) — pure presentation. It renders every committed
 * stroke plus the one in progress as a smoothed SVG path, in WORLD coordinates, so it lives
 * inside the RZPP transformed layer and pans/zooms with the plane. Stroke width is a world
 * value (no non-scaling-stroke) so a line gets thicker as you zoom in, like real ink.
 *
 * The pointer capture (start/extend/commit a stroke) lives in CompanyCanvas alongside the
 * transform math + pan-exclusion — this component is `pointer-events:none` (the `lu-frame`
 * class) so it never blocks clicks/drags on the nodes underneath it.
 */

export interface Stroke {
  id: string;
  color: string;
  width: number; // world units
  points: { x: number; y: number }[];
}

/** Quadratic-through-midpoints smoothing — the control point is each raw sample, the curve
 *  passes through the midpoints, giving a soft continuous path (tldraw-style, dependency-free). */
export function strokePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    // a single sample → a tiny dot so it still paints
    const p = points[0];
    return `M ${p.x} ${p.y} l 0.1 0`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function DrawLayer({ strokes, live }: { strokes: Stroke[]; live: Stroke | null }) {
  const all = live ? [...strokes, live] : strokes;
  return (
    <svg
      width={1}
      height={1}
      className="lu-frame"
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
    >
      {all.map((s) => (
        <path
          key={s.id}
          d={strokePath(s.points)}
          fill="none"
          stroke={s.color}
          strokeWidth={s.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
