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
  icon: string;
  group?: NavGroup; // absent = core surface (Home, Sarah, Settings)
  defaultStatus?: ModuleStatus; // absent = always live (core surfaces)
  /** Widget suggestion chips for this surface. */
  sarahChips: string[];
  /** Coming-soon teaser line — the module's sales promise, verbatim (REBRAND §3.4). */
  promise?: string;
}

export const MODULES: Record<SurfaceKey, SurfaceEntry> = {
  home: {
    label: "Home",
    route: "/home",
    icon: "House",
    sarahChips: ["Anything waiting on me?", "What's today look like?", "How are we doing this week?"],
  },
  sarah: {
    label: "Sarah",
    route: "/sarah",
    icon: "Sparkles",
    sarahChips: ["Anything waiting on me?", "What's Thursday look like?", "Who's gone quiet?"],
  },
  crm: {
    label: "CRM",
    route: "/crm",
    icon: "Users",
    group: "pipeline",
    defaultStatus: "live",
    sarahChips: ["Who needs a follow-up?", "What do you know about this lead?"],
    promise: "Every lead and customer, organized and worked automatically.",
  },
  schedule: {
    label: "Schedule",
    route: "/schedule",
    icon: "CalendarDays",
    group: "pipeline",
    defaultStatus: "live",
    sarahChips: ["What does Thursday look like?", "Move my 2pm", "Any gaps this week?"],
    promise: "Jobs and estimates on one calendar, routed to cut your drive time.",
  },
  quotes: {
    label: "Quotes",
    route: "/quotes",
    icon: "FileText",
    group: "pipeline",
    defaultStatus: "coming_soon",
    sarahChips: ["Draft a quote", "What's still unanswered?"],
    promise: "Draft and send quotes by text. “Quote the Miller job.”",
  },
  invoices: {
    label: "Invoices",
    route: "/invoices",
    icon: "Receipt",
    group: "pipeline",
    defaultStatus: "coming_soon",
    sarahChips: ["Invoice the Miller job", "Who owes me money?"],
    promise: "Send and track invoices by text.",
  },
  followups: {
    label: "Follow-ups",
    route: "/followups",
    icon: "Timer",
    group: "pipeline",
    defaultStatus: "coming_soon",
    sarahChips: ["Who's gone quiet?", "Why haven't you texted Jorge?"],
    promise: "She chases the leads and quotes that go quiet, so nothing slips.",
  },
  website: {
    label: "Website",
    route: "/website",
    icon: "Globe",
    group: "marketing",
    defaultStatus: "coming_soon",
    sarahChips: ["Add a page", "Change the hours", "How do I look on Google?"],
    promise: "A fast, modern site, built fresh. Every lead flows straight to Sarah.",
  },
  content: {
    label: "Content",
    route: "/content",
    icon: "PenLine",
    group: "marketing",
    defaultStatus: "coming_soon",
    sarahChips: ["Write a post about my last job", "What's drafted?"],
    promise: "Finished a job? Text Sarah the photos and she writes a post about it.",
  },
  reviews: {
    label: "Reviews",
    route: "/reviews",
    icon: "Star",
    group: "marketing",
    defaultStatus: "coming_soon",
    sarahChips: ["How's the review campaign going?", "Ask the Millers for a review"],
    promise: "Sarah texts every past customer who never left one. Your first win, day one.",
  },
  analytics: {
    label: "Analytics",
    route: "/analytics",
    icon: "ChartNoAxesColumn",
    group: "business",
    defaultStatus: "coming_soon",
    sarahChips: ["How's this month vs. last?", "Where do my leads come from?"],
    promise: "Every visit, call, and lead in one place.",
  },
  team: {
    label: "Team",
    route: "/team",
    icon: "UsersRound",
    group: "business",
    defaultStatus: "coming_soon",
    sarahChips: ["Add Danny to the team", "What can my crew see?"],
    promise: "Your crew can text Sarah too, with the permissions you set.",
  },
  settings: {
    label: "Settings",
    route: "/settings",
    icon: "Settings",
    sarahChips: ["Change my hours", "Who gets booking texts?", "Update my service area"],
  },
};

export const MODULE_KEYS = [
  "crm",
  "schedule",
  "quotes",
  "invoices",
  "followups",
  "website",
  "content",
  "reviews",
  "analytics",
  "team",
] as const;

export const NAV_CLUSTERS: ReadonlyArray<ReadonlyArray<SurfaceKey>> = [
  ["home", "sarah"],
  ["crm", "schedule", "quotes", "invoices", "followups"],
  ["website", "content", "reviews"],
  ["analytics", "team"],
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
