"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The shared device mockup (04 §6). Built like a device simulator: the phone
 * renders at FIXED true-iPhone dimensions (iPhone 15 — 393×852pt screen,
 * 71.6×147.6mm body → 430×886 design px) and the whole thing transform-scales
 * to fit the caller's height (className, e.g. "h-[min(80vh,840px)]" or
 * "h-full"). Bezel, corner radius, status bar, and content stay proportional
 * at every size — the frame can never render squat or slab-thin again.
 */

// True iPhone-15 body is ~0.485 w:h, but at mockup scale that reads slab-thin
// (verified by screenshot, 2026-07-12) — 1:2 is the stance that LOOKS like a
// phone in-app, so 1:2 it is. Screen stays ~phone-logical width (412px).
const BODY_W = 440;
const BODY_H = 880;

export function PhoneFrame({
  children,
  screenClassName,
  className,
}: {
  children: React.ReactNode;
  /** Scroll behavior for the screen area, e.g. "overflow-y-auto" | "overflow-hidden". */
  screenClassName?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState<number | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight;
      const maxW = el.parentElement?.clientWidth ?? BODY_W;
      if (h > 0) setScale(Math.min(h / BODY_H, maxW / BODY_W));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative shrink-0", className)} style={scale ? { width: BODY_W * scale } : undefined}>
      {scale !== null && (
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `scale(${scale})`, width: BODY_W, height: BODY_H }}
        >
          <div className="h-full w-full rounded-[64px] bg-zinc-900 p-[14px] shadow-[0_24px_60px_-16px_rgba(16,24,40,0.5)]">
            <div className="flex h-full flex-col overflow-hidden rounded-[50px] bg-white">
              {/* status bar + dynamic island — true-size, scales with the body */}
              <div className="relative flex h-[46px] shrink-0 items-center justify-between bg-white px-8">
                <span className="text-[15px] font-semibold text-zinc-900">9:41</span>
                <span
                  aria-hidden
                  className="absolute left-1/2 top-[13px] h-[30px] w-[112px] -translate-x-1/2 rounded-full bg-zinc-900"
                />
                <span className="flex items-center gap-1.5" aria-hidden>
                  <span className="text-[11px] font-bold text-zinc-900">5G</span>
                  <span className="relative h-[13px] w-[26px] rounded-[4px] border-[1.5px] border-zinc-900/80">
                    <span className="absolute inset-[2.5px] right-[5px] rounded-[1.5px] bg-zinc-900" />
                  </span>
                </span>
              </div>
              <div className={cn("min-h-0 flex-1 bg-white", screenClassName)}>{children}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
