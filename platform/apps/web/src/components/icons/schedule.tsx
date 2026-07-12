"use client";

import { motion } from "motion/react";

/**
 * Schedule — lucide's calendar-days glyph, untouched at rest. Hover: the day
 * grid folds up over the header crease and unfolds; frame, crease, and
 * binding posts stay still.
 */
export type IconState = "idle" | "hover" | "active";

export function ScheduleIcon({ state = "idle", className }: { state?: IconState; className?: string }) {
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
      aria-hidden
    >
      {/* fixed: posts, frame, header crease */}
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      {/* the day grid folds over the crease and back */}
      <motion.g
        style={{ transformBox: "view-box", transformOrigin: "12px 10px" }}
        variants={{
          idle: { scaleY: 1, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
          hover: {
            scaleY: [1, 0.04, 1],
            opacity: [1, 0.35, 1],
            transition: { duration: 0.8, times: [0, 0.5, 1], ease: "easeInOut" },
          },
          active: { scaleY: 1, opacity: 1, transition: { duration: 0 } },
        }}
      >
        <path d="M8 14h.01" />
        <path d="M12 14h.01" />
        <path d="M16 14h.01" />
        <path d="M8 18h.01" />
        <path d="M12 18h.01" />
        <path d="M16 18h.01" />
      </motion.g>
    </motion.svg>
  );
}
