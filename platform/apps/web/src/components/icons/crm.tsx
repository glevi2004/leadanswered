"use client";

import { motion } from "motion/react";

/**
 * CRM — lucide's users glyph. Hover (14-icons storyboard): the person behind
 * slides in from behind while the front head gives a small bob. Gentle, eased.
 */
export type IconState = "idle" | "hover" | "active";

export function CrmIcon({ state = "idle", className }: { state?: IconState; className?: string }) {
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
      {/* front person */}
      <motion.g
        variants={{
          idle: { y: 0, transition: { duration: 0.3, ease: "easeOut" } },
          hover: { y: [0, -1, 0], transition: { duration: 0.6, delay: 0.15, ease: "easeInOut" } },
          active: { y: 0, transition: { duration: 0 } },
        }}
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </motion.g>
      {/* person behind — slides in */}
      <motion.g
        variants={{
          idle: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
          hover: { x: [0, 1.8, 0], opacity: 1, transition: { duration: 0.7, ease: "easeInOut" } },
          active: { x: 0, opacity: 1, transition: { duration: 0 } },
        }}
      >
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </motion.g>
    </motion.svg>
  );
}
