import { AGENTS, type DeptId } from "./graph";

/**
 * Mock "what the agent is working on" data — feeds each agent's Workplace page
 * (/embed/{dept}-work), the task badges above agent pills, and the activity-particle
 * spokes on the canvas. Pure fixtures for the /canvas experiment; a real task/artifact
 * store replaces this later.
 */

export interface AgentWork {
  /** the task the agent is on RIGHT NOW (drives the particle stream + "◔ n" badge) */
  current?: { title: string; detail: string; progress: number; startedAgo: string };
  /** queued/needs-approval items (drives the "● n" badge) */
  pending: { title: string; status: "queued" | "needs_approval"; ago: string }[];
  /** recent activity feed, newest first */
  activity: { at: string; line: string }[];
  /** a draft artifact sitting on the desk */
  draft?: { kind: string; title: string; preview: string };
}

export const AGENT_WORK: Record<DeptId, AgentWork> = {
  sales: {
    current: { title: "Chase the Alvarez quote", detail: "Third nudge on the $8,400 roof quote — she viewed it twice yesterday.", progress: 0.62, startedAgo: "23m" },
    pending: [],
    activity: [
      { at: "9:41 AM", line: "Texted Maria Alvarez a gentle nudge about the open quote." },
      { at: "9:12 AM", line: "Moved Dan Okafor to Qualified — he confirmed the budget." },
      { at: "8:55 AM", line: "Logged a new lead from the marketing site form." },
    ],
    draft: { kind: "Message draft", title: "Nudge — Alvarez quote", preview: "Hi Maria — just checking you saw the quote. Happy to walk through it, or tweak anything that doesn't fit." },
  },
  operations: {
    pending: [{ title: "Re-route Thursday around the Kim estimate", status: "queued", ago: "1h" }],
    activity: [
      { at: "8:30 AM", line: "Booked the Kim estimate for Thursday 2pm." },
      { at: "8:02 AM", line: "Shifted the Harper job 30min to cut drive time." },
    ],
  },
  finance: {
    pending: [{ title: "Invoice the finished Harper job", status: "needs_approval", ago: "2h" }],
    activity: [
      { at: "Yesterday", line: "Marked invoice #0041 paid — $2,150 via card." },
      { at: "Yesterday", line: "Second reminder sent on the overdue Delgado invoice." },
    ],
    draft: { kind: "Invoice draft", title: "#0042 — Harper job", preview: "Roof repair — $3,200 · Materials — $640 · Due on receipt." },
  },
  legal: { pending: [], activity: [] },
  engineering: {
    pending: [{ title: "Connect the booking form to the CRM", status: "queued", ago: "3h" }],
    activity: [{ at: "Mon", line: "Published the new booking page to production." }],
  },
  design: { pending: [], activity: [] },
  marketing: {
    current: { title: "Draft this week's project post", detail: "Turning the Harper before/after photos into a Facebook post.", progress: 0.35, startedAgo: "8m" },
    pending: [{ title: "Review wave for 12 past customers", status: "needs_approval", ago: "1d" }],
    activity: [
      { at: "10:02 AM", line: "Collected a new 5★ Google review from D. Okafor." },
      { at: "Yesterday", line: "Scheduled Thursday's post — 'How we spot hail damage'." },
    ],
    draft: { kind: "Post draft", title: "Harper roof — before & after", preview: "Swipe to see what 3 days of work looks like. Another roof ready for winter ❄️" },
  },
  support: {
    current: { title: "Answering the line", detail: "2 conversations open — booking one, answering a warranty question.", progress: 0.8, startedAgo: "live" },
    pending: [],
    activity: [
      { at: "10:15 AM", line: "Answered a new caller in 40s — booked an estimate." },
      { at: "9:58 AM", line: "Escalated a warranty question to you (Needs you)." },
    ],
  },
};

/** Badge shown above the agent pill: in-progress beats pending. */
export function agentBadge(dept: DeptId): { kind: "working" | "pending"; count: number } | null {
  const w = AGENT_WORK[dept];
  if (w.current) return { kind: "working", count: 1 + w.pending.length };
  if (w.pending.length) return { kind: "pending", count: w.pending.length };
  return null;
}

/** Departments with an agent actively working — these spokes get the particle stream. */
export const workingDepts = (): DeptId[] =>
  (Object.keys(AGENT_WORK) as DeptId[]).filter((d) => AGENT_WORK[d].current);

/* ============================ Needs-you rollup ============================ */
/**
 * The Dashboard's Zone A ("Needs you") is a cross-agent compilation of every
 * department agent's workplace: what each agent is doing RIGHT NOW (read straight
 * from AGENT_WORK.current — unchanged) plus the owner-facing items waiting on a
 * decision. The waiting items live in their own additive seed below so the badge
 * selectors above keep working off AGENT_WORK untouched. Purely additive — nothing
 * here mutates the exports the canvas already imports.
 */

export type NeedsYouKind = "approval" | "question" | "blocked";

export interface NeedsYouItem {
  id: string;
  dept: DeptId;
  kind: NeedsYouKind;
  /** one-line ask, owner-voice */
  title: string;
  /** the context that lets the owner decide without opening anything */
  detail: string;
  /** relative age, e.g. "12m" · "1h" · "1d" */
  ago: string;
}

/** What an agent is on right now (a read-only mirror of AGENT_WORK.current). */
export interface AgentWorking {
  title: string;
  detail: string;
  progress: number;
  startedAgo: string;
}

/** One agent's slice of the rollup: its live task + everything waiting on you. */
export interface AgentRollup {
  dept: DeptId;
  label: string;
  agentName: string;
  accent: string; // "r,g,b" — matches the agent's canvas accent
  working: AgentWorking | null;
  waiting: NeedsYouItem[];
}

/**
 * Realistic owner-facing items per active department (sales · operations · finance ·
 * marketing · support). Seeded here rather than on AGENT_WORK so the existing
 * `agentBadge`/`workingDepts` selectors are left exactly as they were.
 */
const NEEDS_YOU_SEED: Partial<Record<DeptId, Omit<NeedsYouItem, "id" | "dept">[]>> = {
  sales: [
    { kind: "approval", title: "Send the follow-up to Maria Alvarez", detail: "Third nudge on the $8,400 roof quote is drafted — she viewed it twice yesterday.", ago: "12m" },
    { kind: "question", title: "Promise Dan Okafor a Saturday install?", detail: "Budget's confirmed and he's asking for a weekend crew — OK to commit to Saturday?", ago: "1h" },
  ],
  operations: [
    { kind: "blocked", title: "Crew double-booked Thursday 2pm", detail: "The Kim estimate and the Harper job both landed at 2pm — pick which one moves.", ago: "35m" },
    { kind: "approval", title: "Re-route Thursday around the Kim estimate", detail: "New order trims 22 min of drive time but pushes Harper to 3pm.", ago: "1h" },
  ],
  finance: [
    { kind: "approval", title: "Approve invoice #0042 — Harper job", detail: "Roof repair $3,200 + materials $640. It sends the moment you OK it.", ago: "2h" },
    { kind: "question", title: "Let Delgado pay in two installments?", detail: "The overdue $2,150 invoice — he's asked to split it across two months.", ago: "3h" },
  ],
  marketing: [
    { kind: "approval", title: "Send the review wave to 12 past customers", detail: "One-tap review asks for every job closed in the last 30 days.", ago: "1d" },
    { kind: "approval", title: "Publish the Harper before/after post", detail: "Facebook post with the before/after photos is drafted and queued.", ago: "1d" },
  ],
  support: [
    { kind: "question", title: "Warranty question needs your call", detail: "A caller's 15-year shingles are cupping — covered under the workmanship warranty?", ago: "18m" },
    { kind: "blocked", title: "Same-day estimate — no crew free", detail: "Caller wants someone out today; nobody's open. Offer tomorrow morning instead?", ago: "45m" },
  ],
};

/**
 * Flatten every active agent's workplace into the Dashboard rollup. Each entry
 * carries the agent's live task (or null) and its waiting items; agents with items
 * waiting sort first, then agents that are merely working (so you can see they're
 * on track). Inactive departments (no built surface) are omitted.
 */
export function needsYou(): AgentRollup[] {
  return AGENTS.filter((a) => a.active)
    .map((a): AgentRollup => {
      const work = AGENT_WORK[a.id];
      const waiting: NeedsYouItem[] = (NEEDS_YOU_SEED[a.id] ?? []).map((it, i) => ({
        ...it,
        dept: a.id,
        id: `${a.id}-need-${i}`,
      }));
      return {
        dept: a.id,
        label: a.label,
        agentName: a.agentName,
        accent: a.accent,
        working: work.current ? { ...work.current } : null,
        waiting,
      };
    })
    .filter((r) => r.working || r.waiting.length > 0)
    .sort((a, b) => Number(b.waiting.length > 0) - Number(a.waiting.length > 0));
}

/** Total owner-facing items across every agent — the Zone-A header count. */
export function needsYouCount(): number {
  return needsYou().reduce((n, r) => n + r.waiting.length, 0);
}
