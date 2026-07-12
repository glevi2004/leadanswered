"use client";

import { motion } from "motion/react";

/**
 * KiwiIcons pilot (app-ui/14-icons.md §5): Home.
 * Hover: the icon springs up, the house redraws itself, the door swings open
 * and slams back. Active (/home): door sits ajar. Reduced-motion handling
 * arrives shell-wide via MotionConfig when the full set ships.
 */
export type IconState = "idle" | "hover" | "active";

const settle = { type: "spring", stiffness: 320, damping: 17 } as const;

export function HomeIcon({ state, className }: { state: IconState; className?: string }) {
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
      animate={state}
      variants={{
        idle: { scale: 1, rotate: 0, transition: settle },
        hover: {
          scale: [1, 1.22, 1],
          rotate: [0, -8, 0],
          transition: { duration: 0.55, times: [0, 0.35, 1], ease: "easeInOut" },
        },
        active: { scale: 1, rotate: 0, transition: settle },
      }}
      style={{ transformOrigin: "50% 100%" }}
      aria-hidden
    >
      {/* house shell: roof sweep + walls */}
      <motion.path
        d="M5.5 9.6 12 4l6.5 5.6M5.5 9.6V20h13V9.6"
        variants={{
          idle: { pathLength: 1, transition: settle },
          hover: { pathLength: [0, 1], transition: { duration: 0.5, ease: "easeOut" } },
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
            rotate: [0, -35, 0],
            transition: { delay: 0.2, duration: 0.6, times: [0, 0.45, 1], ease: "easeInOut" },
          },
          active: { rotate: -18, transition: settle },
        }}
      />
    </motion.svg>
  );
}
