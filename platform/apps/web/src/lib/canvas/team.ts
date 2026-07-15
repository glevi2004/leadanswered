/**
 * Human teammates — richer profile behind the game-like graph nodes (see graph.ts
 * TEAMMATES for the canvas meta). A teammate works alongside a department's agent
 * (a CFO with Finance, an engineer with Engineering). Mock, no auth yet.
 */

import { TEAMMATES, type DeptId, type TeammateMeta } from "./graph";

export interface TeammateProfile extends TeammateMeta {
  tint: string; // "r,g,b" avatar tint
  handsOff: string; // what they own / can be handed
}

const TINTS: Record<DeptId, string> = {
  finance: "52,211,153", engineering: "96,165,250", design: "232,121,249",
  sales: "163,230,53", marketing: "244,114,182", operations: "251,146,60",
  support: "56,189,248", legal: "167,139,250",
};

const HANDS_OFF: Record<string, string> = {
  "tm-cfo": "Owns the numbers — reviews the books, approves spend, works the Finance agent's collections.",
  "tm-eng": "Ships product — picks up build tasks the Engineering agent scopes.",
  "tm-design": "Keeps it on-brand — takes design work the Design agent drafts.",
};

export const teamProfiles: TeammateProfile[] = TEAMMATES.map((t) => ({
  ...t,
  tint: TINTS[t.dept],
  handsOff: HANDS_OFF[t.id] ?? `Works with the ${t.dept} agent.`,
}));

export const teamProfile = (id: string): TeammateProfile | undefined => teamProfiles.find((t) => t.id === id);
