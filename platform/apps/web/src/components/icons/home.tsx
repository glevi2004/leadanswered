"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * KiwiIcons pilot (app-ui/14-icons.md §5): Home.
 * Choreography: house outline draws in → the door swings open and settles.
 * `active` = the settled end-pose (door ajar). Controlled by the parent row
 * (hover comes from the whole nav row, not just the icon).
 */
export type IconState = "idle" | "hover" | "active";

const settle = { type: "spring", stiffness: 320, damping: 17 } as const;

export function HomeIcon({ state, className }: { state: IconState; className?: string }) {
  const reduced = useReducedMotion();
  const s: IconState = reduced ? (state === "hover" ? "idle" : state) : state;

  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      initial="idle"
      animate={s}
      aria-hidden
    >
      {/* house shell: roof sweep + walls */}
      <motion.path
        d="M5.5 9.6 12 4l6.5 5.6M5.5 9.6V20h13V9.6"
        variants={{
          idle: { pathLength: 1, transition: settle },
          hover: { pathLength: [0.2, 1], transition: { duration: 0.38, ease: "easeOut" } },
          active: { pathLength: 1 },
        }}
      />
      {/* door — hinged on its left edge */}
      <motion.path
        d="M10.2 20v-4.9a1.1 1.1 0 0 1 1.1-1.1h1.4a1.1 1.1 0 0 1 1.1 1.1V20"
        style={{ transformBox: "fill-box", transformOrigin: "0% 100%" }}
        variants={{
          idle: { rotate: 0, transition: settle },
          hover: {
            rotate: [0, -16, 0],
            transition: { delay: 0.16, duration: 0.55, times: [0, 0.45, 1], ease: "easeInOut" },
          },
          active: { rotate: -12, transition: settle },
        }}
      />
    </motion.svg>
  );
}
