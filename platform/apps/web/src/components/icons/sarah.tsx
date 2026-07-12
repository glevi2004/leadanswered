"use client";

import { motion } from "motion/react";

/**
 * Sarah's mark — the aperture (Levi's pick, 2026-07-11), lucide geometry.
 * strokeWidth 1.7: the glyph is denser than its siblings, so full 2px reads
 * optically heavier. Hover (nav): a slow half-turn — the blades twist and
 * settle (180° on a 6-blade glyph lands on an identical pose, so the exit
 * reset is invisible). Static everywhere no `state` is passed.
 */
export type IconState = "idle" | "hover" | "active";

export function SarahIcon({ state = "idle", className }: { state?: IconState; className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      initial="idle"
      animate={state}
      variants={{
        idle: { rotate: 0, transition: { duration: 0 } },
        hover: { rotate: 180, transition: { duration: 1, ease: "easeInOut" } },
        active: { rotate: 0, transition: { duration: 0 } },
      }}
      style={{ transformOrigin: "50% 50%" }}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m14.31 8 5.74 9.94" />
      <path d="M9.69 8h11.48" />
      <path d="m7.38 12 5.74-9.94" />
      <path d="M9.69 16 3.95 6.06" />
      <path d="M14.31 16H2.83" />
      <path d="m16.62 12-5.74 9.94" />
    </motion.svg>
  );
}
