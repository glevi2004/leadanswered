"use client";

import { motion } from "motion/react";

/**
 * KiwiIcons pilot (app-ui/14-icons.md §5): Home.
 * Geometry = lucide's house (same proportions, rounded joins, 2px stroke) so it
 * matches the rest of the set at rest; the motion is ours. Hover: springy pop,
 * the shell redraws, the door swings open and shuts. Active (/home): door ajar.
 */
export type IconState = "idle" | "hover" | "active";

const settle = { type: "spring", stiffness: 320, damping: 17 } as const;

export function HomeIcon({ state, className }: { state: IconState; className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      initial="idle"
      animate={state}
      variants={{
        idle: { scale: 1, rotate: 0, transition: settle },
        hover: {
          scale: [1, 1.15, 1],
          rotate: [0, -6, 0],
          transition: { duration: 0.55, times: [0, 0.35, 1], ease: "easeInOut" },
        },
        active: { scale: 1, rotate: 0, transition: settle },
      }}
      style={{ transformOrigin: "50% 100%" }}
      aria-hidden
    >
      {/* shell — lucide house geometry (rounded corners, full-bleed) */}
      <motion.path
        d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        variants={{
          idle: { pathLength: 1, transition: settle },
          hover: { pathLength: [0, 1], transition: { duration: 0.5, ease: "easeOut" } },
          active: { pathLength: 1 },
        }}
      />
      {/* door — lucide's, hinged on its left edge */}
      <motion.path
        d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"
        style={{ transformBox: "fill-box", transformOrigin: "0% 100%" }}
        variants={{
          idle: { rotate: 0, transition: settle },
          hover: {
            rotate: [0, -28, 0],
            transition: { delay: 0.18, duration: 0.6, times: [0, 0.45, 1], ease: "easeInOut" },
          },
          active: { rotate: -14, transition: settle },
        }}
      />
    </motion.svg>
  );
}
