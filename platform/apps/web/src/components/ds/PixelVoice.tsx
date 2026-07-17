"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * PixelVoice — Lu's voice as a MONOCHROME dot-matrix field (the floating pixel
 * field + a voice waveform, combined). A grid of ink pixels: every cell is a faint
 * dot (the field), and each column lights from the bottom up to a height driven by
 * a traveling waveform (the voice). Brighter at the base, dimmer at the tip, like a
 * dot-matrix VU/LED display. Monochrome (uses --foreground) so it sits inside the
 * app's editorial palette — no colour ramp, no arcade screen. Three states set
 * amplitude + tempo.
 *
 * Pass a live `analyser` (AnalyserNode from a mic or TTS audio) and the columns are
 * driven by the REAL sound — it moves with the person's voice. Without one, it
 * animates a synthetic waveform by `state` (for previews).
 *
 * Technique refs: dot-matrix LED audio visualizers + Web Audio waveform bars.
 */
type VoiceState = "idle" | "listening" | "speaking";
const AMP: Record<VoiceState, number> = { idle: 0.32, listening: 0.62, speaking: 1 };
const SPEED: Record<VoiceState, number> = { idle: 1.0, listening: 1.9, speaking: 3.1 };

export function PixelVoice({
  cols = 26,
  rows = 7,
  state = "speaking",
  analyser = null,
  className,
}: {
  cols?: number;
  rows?: number;
  state?: VoiceState;
  /** Live Web Audio analyser (mic / TTS). When set, columns follow the real sound. */
  analyser?: AnalyserNode | null;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const context = cv.getContext("2d");
    if (!context) return;
    const ctx = context; // non-null binding kept inside the frame() closure

    const CELL = 6;
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
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.floor(Wpx * dpr);
      cv.height = Math.floor(Hpx * dpr);
      cv.style.width = `${Wpx}px`;
      cv.style.height = `${Hpx}px`;
    };
    readFg();
    size();

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const amp = AMP[state];
    const speed = reduce ? 0 : SPEED[state];
    // live audio buffer + smoothed per-column levels (so the bars glide, not jitter)
    const freq = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const levels = new Float32Array(cols);

    let raf = 0;
    function frame(tms: number) {
      raf = requestAnimationFrame(frame);
      const t = tms / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, Wpx, Hpx);
      if (analyser && freq) analyser.getByteFrequencyData(freq);
      for (let c = 0; c < cols; c++) {
        let target: number;
        if (analyser && freq) {
          // map the voice band across the columns (skip the very lowest bins)
          const use = Math.floor(freq.length * 0.62);
          const idx = 2 + Math.floor((c / cols) * (use - 2));
          target = Math.min(1, (freq[idx] / 255) * 1.5);
        } else {
          // synthetic traveling waveform (two harmonics)
          const w = 0.5 + 0.35 * Math.sin(c * 0.55 - t * speed) + 0.15 * Math.sin(c * 0.23 - t * speed * 0.6);
          target = 0.08 + amp * w;
        }
        // ease toward the target so bars glide
        levels[c] += (target - levels[c]) * 0.35;
        const h = Math.max(0.12, Math.min(1, levels[c]));
        const lit = Math.max(1, Math.round(h * rows));
        for (let r = 0; r < rows; r++) {
          const on = r < lit; // r = rows from the bottom
          const x = c * PITCH;
          const y = (rows - 1 - r) * PITCH;
          ctx.globalAlpha = on ? 0.9 - 0.5 * (r / Math.max(1, lit - 1)) : 0.07;
          ctx.fillStyle = fg;
          ctx.fillRect(x, y, CELL, CELL);
        }
      }
      ctx.globalAlpha = 1;
    }
    raf = requestAnimationFrame(frame);

    const onResize = () => {
      readFg();
      size();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [cols, rows, state, analyser]);

  const label = state === "speaking" ? "Lu is speaking" : state === "listening" ? "Lu is listening" : "Lu is ready";
  return <canvas ref={ref} className={cn("block", className)} style={{ imageRendering: "pixelated" }} role="img" aria-label={label} />;
}
