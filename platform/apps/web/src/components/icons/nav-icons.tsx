"use client";

import { motion } from "motion/react";

/**
 * The remaining animated nav icons (14-icons.md storyboard). All lucide
 * geometry, untouched at rest; all choreography smooth-eased (0.6–1s), with
 * exits that land on identical poses so nothing snaps.
 */
export type IconState = "idle" | "hover" | "active";

type Props = { state?: IconState; className?: string };

const SVG = (p: Props & { children: React.ReactNode }) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={p.className}
    initial="idle"
    animate={p.state ?? "idle"}
    aria-hidden
  >
    {p.children}
  </motion.svg>
);

const draw = (delay: number, duration = 0.35) => ({
  idle: { pathLength: 1, opacity: 1, transition: { duration: 0 } },
  hover: { pathLength: [0, 1], opacity: 1, transition: { delay, duration, ease: "easeOut" as const } },
  active: { pathLength: 1, opacity: 1, transition: { duration: 0 } },
});

/* Quotes — the document's lines write themselves in, top to bottom. */
export function QuotesIcon(p: Props) {
  return (
    <SVG {...p}>
      <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      <motion.path d="M10 9H8" variants={draw(0)} />
      <motion.path d="M16 13H8" variants={draw(0.14)} />
      <motion.path d="M16 17H8" variants={draw(0.28)} />
    </SVG>
  );
}

/* Invoices — the amount redraws itself on the receipt. */
export function InvoicesIcon(p: Props) {
  return (
    <SVG {...p}>
      <path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z" />
      <motion.path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8" variants={draw(0, 0.55)} />
      <motion.path d="M12 17V7" variants={draw(0.3, 0.3)} />
    </SVG>
  );
}

/* Follow-ups — the timer hand sweeps a full lap. */
export function FollowupsIcon(p: Props) {
  return (
    <SVG {...p}>
      <line x1="10" x2="14" y1="2" y2="2" />
      <circle cx="12" cy="14" r="8" />
      <motion.line
        x1="12"
        x2="15"
        y1="14"
        y2="11"
        style={{ transformBox: "view-box", transformOrigin: "12px 14px" }}
        variants={{
          idle: { rotate: 0, transition: { duration: 0 } },
          hover: { rotate: 360, transition: { duration: 0.9, ease: "easeInOut" } },
          active: { rotate: 0, transition: { duration: 0 } },
        }}
      />
    </SVG>
  );
}

/* Website — the meridian narrows and re-opens: the globe turning. */
export function WebsiteIcon(p: Props) {
  return (
    <SVG {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <motion.path
        d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"
        style={{ transformBox: "view-box", transformOrigin: "12px 12px" }}
        variants={{
          idle: { scaleX: 1, transition: { duration: 0.3, ease: "easeOut" } },
          hover: { scaleX: [1, 0.12, 1], transition: { duration: 0.9, times: [0, 0.5, 1], ease: "easeInOut" } },
          active: { scaleX: 1, transition: { duration: 0 } },
        }}
      />
    </SVG>
  );
}

/* Content — the pen tilts to write while its line draws out. */
export function ContentIcon(p: Props) {
  return (
    <SVG {...p}>
      <motion.path
        d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
        style={{ transformBox: "view-box", transformOrigin: "3px 21px" }}
        variants={{
          idle: { rotate: 0, transition: { duration: 0.3, ease: "easeOut" } },
          hover: { rotate: [0, -7, 0], transition: { duration: 0.7, times: [0, 0.45, 1], ease: "easeInOut" } },
          active: { rotate: 0, transition: { duration: 0 } },
        }}
      />
      <motion.path d="M13 21h8" variants={draw(0.18, 0.4)} />
    </SVG>
  );
}

/* Reviews — the star traces its own outline. */
export function ReviewsIcon(p: Props) {
  return (
    <SVG {...p}>
      <motion.path
        d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"
        variants={{
          idle: { pathLength: 1, transition: { duration: 0 } },
          hover: { pathLength: [0, 1], transition: { duration: 0.8, ease: "easeInOut" } },
          active: { pathLength: 1, transition: { duration: 0 } },
        }}
      />
    </SVG>
  );
}

/* Analytics — the bars dip to the baseline and regrow, staggered. */
export function AnalyticsIcon(p: Props) {
  const bar = (delay: number) => ({
    idle: { scaleY: 1, transition: { duration: 0.3, ease: "easeOut" as const } },
    hover: { scaleY: [1, 0.1, 1], transition: { delay, duration: 0.6, times: [0, 0.4, 1], ease: "easeInOut" as const } },
    active: { scaleY: 1, transition: { duration: 0 } },
  });
  const style = { transformBox: "fill-box", transformOrigin: "50% 100%" } as const;
  return (
    <SVG {...p}>
      <motion.path d="M5 21v-6" style={style} variants={bar(0)} />
      <motion.path d="M12 21V3" style={style} variants={bar(0.12)} />
      <motion.path d="M19 21V9" style={style} variants={bar(0.24)} />
    </SVG>
  );
}

/* Team — the person behind leans in while the pair bobs. */
export function TeamIcon(p: Props) {
  return (
    <SVG {...p}>
      <motion.g
        variants={{
          idle: { y: 0, transition: { duration: 0.3, ease: "easeOut" } },
          hover: { y: [0, -0.9, 0], transition: { duration: 0.6, delay: 0.15, ease: "easeInOut" } },
          active: { y: 0, transition: { duration: 0 } },
        }}
      >
        <path d="M18 21a8 8 0 0 0-16 0" />
        <circle cx="10" cy="8" r="5" />
      </motion.g>
      <motion.path
        d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"
        variants={{
          idle: { x: 0, transition: { duration: 0.3, ease: "easeOut" } },
          hover: { x: [0, 1.6, 0], transition: { duration: 0.7, ease: "easeInOut" } },
          active: { x: 0, transition: { duration: 0 } },
        }}
      />
    </SVG>
  );
}

/* Settings — the gear turns one tooth and settles (60° = identical pose). */
export function SettingsIcon(p: Props) {
  return (
    <SVG {...p}>
      <motion.path
        d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
        style={{ transformBox: "view-box", transformOrigin: "12px 12px" }}
        variants={{
          idle: { rotate: 0, transition: { duration: 0 } },
          hover: { rotate: 60, transition: { duration: 0.8, ease: "easeInOut" } },
          active: { rotate: 0, transition: { duration: 0 } },
        }}
      />
      <circle cx="12" cy="12" r="3" />
    </SVG>
  );
}

/* Sign out — the arrow leans toward the door. */
export function SignOutIcon(p: Props) {
  return (
    <SVG {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <motion.g
        variants={{
          idle: { x: 0, transition: { duration: 0.3, ease: "easeOut" } },
          hover: { x: [0, 2.2, 0], transition: { duration: 0.6, ease: "easeInOut" } },
          active: { x: 0, transition: { duration: 0 } },
        }}
      >
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
      </motion.g>
    </SVG>
  );
}
