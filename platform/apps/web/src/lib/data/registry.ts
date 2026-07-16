import type { ModuleStatus, NavGroup, SurfaceKey } from "./shared";

/**
 * The one registry behind nav, gating, and the Sarah widget (00-foundation §5).
 * `group` is INTERNAL — it orders the unlabeled sidebar clusters and is never
 * rendered as text (the sales pillars are landing-page copy only).
 */
export interface SurfaceEntry {
  label: string;
  route: string;
  /** lucide icon name, resolved in AppSidebar (registry stays server-safe). */
  group?: NavGroup; // absent = core surface (Home, Sarah, Settings)
  defaultStatus?: ModuleStatus; // absent = always live (core surfaces)
  /** Widget suggestion chips for this surface. */
  sarahChips: string[];
  /** Coming-soon teaser line — the module's sales promise, verbatim (REBRAND §3.4). */
  promise?: string;
}

export const MODULES: Record<SurfaceKey, SurfaceEntry> = {
  home: {
    label: "Dashboard",
    route: "/home",
    sarahChips: ["Anything waiting on me?", "What's today look like?", "How are we doing this week?"],
  },
  sarah: {
    label: "AI Assistant",
    route: "/sarah",
    sarahChips: ["Anything waiting on me?", "What's Thursday look like?", "Who's gone quiet?"],
  },
  canvas: {
    label: "Workspace",
    route: "/canvas",
    sarahChips: ["What's each department working on?", "Show me what needs approval", "What's Lu doing right now?"],
  },
  crm: {
    label: "Customers",
    route: "/customers",
    group: "pipeline",
    defaultStatus: "live",
    sarahChips: ["Who needs a follow-up?", "What do you know about this lead?"],
    promise: "Every lead and customer, organized and worked automatically.",
  },
  schedule: {
    label: "Schedule",
    route: "/schedule",
    group: "pipeline",
    defaultStatus: "live",
    sarahChips: ["What does Thursday look like?", "Move my 2pm", "Any gaps this week?"],
    promise: "Jobs and estimates on one calendar, routed to cut your drive time.",
  },
  money: {
    label: "Money",
    route: "/money",
    sarahChips: ["Who owes me money?", "What's still unpaid?", "Send an invoice"],
  },
  agents: {
    label: "Agents",
    route: "/agents",
    sarahChips: ["What are my agents doing?", "Turn on review requests", "Draft a post"],
  },
  sites: {
    label: "Sites",
    route: "/sites",
    sarahChips: ["How's my site doing?", "Add a page", "Connect my domain"],
  },
  quotes: {
    label: "Quotes",
    route: "/quotes",
    group: "pipeline",
    defaultStatus: "coming_soon",
    sarahChips: ["Draft a quote", "What's still unanswered?"],
    promise: "Draft and send quotes by text. “Quote the Miller job.”",
  },
  invoices: {
    label: "Invoices",
    route: "/invoices",
    group: "pipeline",
    defaultStatus: "coming_soon",
    sarahChips: ["Invoice the Miller job", "Who owes me money?"],
    promise: "Send and track invoices by text.",
  },
  followups: {
    label: "Follow-ups",
    route: "/followups",
    group: "pipeline",
    defaultStatus: "coming_soon",
    sarahChips: ["Who's gone quiet?", "Why haven't you texted Jorge?"],
    promise: "She chases the leads and quotes that go quiet, so nothing slips.",
  },
  website: {
    label: "Website",
    route: "/website",
    group: "marketing",
    defaultStatus: "coming_soon",
    sarahChips: ["Add a page", "Change the hours", "How do I look on Google?"],
    promise: "A fast, modern site, built fresh. Every lead flows straight to Sarah.",
  },
  content: {
    label: "Content",
    route: "/content",
    group: "marketing",
    defaultStatus: "coming_soon",
    sarahChips: ["Draft a post from my last job's photos", "What's going out this week?", "Change something in the Miller draft"],
    promise: "Finished a job? Text Sarah the photos and she writes a post about it.",
  },
  reviews: {
    label: "Reviews",
    route: "/reviews",
    group: "marketing",
    defaultStatus: "coming_soon",
    sarahChips: ["How's the review campaign going?", "Ask the Millers for a review"],
    promise: "Sarah texts every past customer who never left one. Your first win, day one.",
  },
  analytics: {
    label: "Analytics",
    route: "/analytics",
    group: "business",
    defaultStatus: "coming_soon",
    sarahChips: ["How's this month vs. last?", "What's my best lead source?", "Am I still answering in under 60 seconds?"],
    promise: "Every visit, call, and lead in one place.",
  },
  team: {
    label: "Team",
    route: "/team",
    group: "business",
    defaultStatus: "coming_soon",
    sarahChips: ["Add someone to the team", "What can Danny ask you?", "Who gets booking texts?"],
    promise: "Your crew can text Sarah too, with the permissions you set.",
  },
  settings: {
    label: "Settings",
    route: "/settings",
    sarahChips: ["Change my hours", "Who gets booking texts?", "Update my service area"],
  },
};

export const MODULE_KEYS = [
  "crm",
  "schedule",
  "money",
  "quotes",
  "invoices",
  "followups",
  "website",
  "content",
  "reviews",
  "analytics",
  "team",
  "agents",
  "sites",
] as const;

/**
 * The FIXED sidebar clusters — UNLABELED, separated by spacing. The app collapsed to
 * five surfaces: Dashboard · AI Assistant · Workspace, then Schedule · Team. Everything
 * else (Customers/crm, Money, Agents, Sites, quotes/invoices/followups/content/reviews/
 * analytics/website) is still a ModuleKey with a live route, but it no longer appears in
 * the sidebar — it folds INTO a department on the Workspace canvas (Customers→Sales,
 * Money→Finance, Agents→the canvas itself, Sites→each dept's Space). Settings stays
 * pinned in the sidebar footer.
 */
export const NAV_CLUSTERS: ReadonlyArray<ReadonlyArray<SurfaceKey>> = [
  ["home", "sarah", "canvas"],
  ["team"],
];

/** Longest-prefix match of a pathname to a registry surface (widget page context). */
export function surfaceForPath(pathname: string): SurfaceKey | null {
  let best: SurfaceKey | null = null;
  let bestLen = 0;
  for (const key of Object.keys(MODULES) as SurfaceKey[]) {
    const route = MODULES[key].route;
    if ((pathname === route || pathname.startsWith(route + "/")) && route.length > bestLen) {
      best = key;
      bestLen = route.length;
    }
  }
  return best;
}
