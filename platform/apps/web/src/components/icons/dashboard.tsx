"use client";

import { motion } from "motion/react";

/**
 * KiwiIcons (app-ui/14-icons.md): Dashboard — lucide's layout-dashboard glyph.
 * Hover: the whole icon spins a full turn with a springy overshoot and settles.
 */
export type IconState = "idle" | "hover" | "active";

const settle = { type: "spring", stiffness: 320, damping: 17 } as const;

export function DashboardIcon({ state = "idle", className }: { state?: IconState; className?: string }) {
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
        // exit resets instantly — 360° ≡ 0°, so a completed spin resets invisibly
        idle: { rotate: 0, scale: 1, transition: { duration: 0 } },
        hover: {
          rotate: 360,
          scale: 1,
          transition: { duration: 1.2, ease: "easeInOut" },
        },
        active: { rotate: 0, scale: 1, transition: { duration: 0 } },
      }}
      style={{ transformOrigin: "50% 50%" }}
      aria-hidden
    >
      {/* lucide layout-grid — four equal squares */}
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </motion.svg>
  );
}
