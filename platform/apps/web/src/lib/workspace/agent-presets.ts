/**
 * The Agents surface — AI-worker presets you "hire". Each preset drives the
 * container grid (icon + label + blurb + hire/manage), the Lu-guided hire flow
 * (leash + voice are the two things she settles), and links to its detail
 * surface. Server-safe (plain data + types only, no React) so the hire chat
 * route can import it. Icons are string keys the UI maps to components — that
 * keeps this module out of the client "use client" graph.
 *
 * Receptionist is Lu answering the line — always on your team. Follow-ups,
 * Reviews, and Content are hireable coworkers; their detail surfaces reuse the
 * existing module homes under /agents/[id].
 */

export type AgentId = "receptionist" | "followups" | "reviews" | "content";

/** Icon token — resolved to a component in the client UI (icons are "use client"). */
export type AgentIconKey = AgentId;

export interface AgentPreset {
  id: AgentId;
  label: string;
  blurb: string;
  /** icon token; the grid + hire panel map it to the actual glyph */
  icon: AgentIconKey;
  /** how much rope she has — the first thing Lu settles when you hire */
  leashOptions: { value: string; label: string }[];
  /** a short nudge for the voice/tone she'll write in — the second thing she settles */
  voiceHint: string;
  /** where "Manage"/"Open" lands */
  detailHref: string;
}

export const AGENT_PRESETS: AgentPreset[] = [
  {
    id: "receptionist",
    label: "Receptionist",
    blurb: "Lu answers your line, books jobs, and never lets a lead go cold.",
    icon: "receptionist",
    leashOptions: [
      { value: "auto", label: "Answer & book on her own" },
      { value: "draft", label: "Draft replies for your ok" },
    ],
    voiceHint: "warm, professional, gets to the point",
    detailHref: "/agents/receptionist",
  },
  {
    id: "reviews",
    label: "Reviews",
    blurb: "Lu texts every past customer who never left one. Your first win, day one.",
    icon: "reviews",
    leashOptions: [
      { value: "draft", label: "Draft each ask for your ok" },
      { value: "auto", label: "Send asks on her own" },
    ],
    voiceHint: "grateful and brief — one tap to leave a Google review",
    detailHref: "/agents/reviews",
  },
  {
    id: "content",
    label: "Content",
    blurb: "Finished a job? Text Lu the photos and she writes the post.",
    icon: "content",
    leashOptions: [
      { value: "draft", label: "Draft posts for your ok" },
      { value: "auto", label: "Post on her own" },
    ],
    voiceHint: "upbeat and local, on-brand for the trade",
    detailHref: "/agents/content",
  },
  {
    id: "followups",
    label: "Follow-ups",
    blurb: "She chases the leads and quotes that go quiet, so nothing slips.",
    icon: "followups",
    leashOptions: [
      { value: "gentle", label: "Nudge gently" },
      { value: "standard", label: "Stay on it until they reply" },
    ],
    voiceHint: "friendly and low-pressure, never pushy",
    detailHref: "/agents/followups",
  },
];

export const AGENT_IDS = AGENT_PRESETS.map((a) => a.id);

/** Receptionist = Lu on the line; she's always on the team and can't be un-hired. */
export const ALWAYS_HIRED: AgentId = "receptionist";

export function getAgentPreset(id: string): AgentPreset | undefined {
  return AGENT_PRESETS.find((a) => a.id === id);
}
