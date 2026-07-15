import type { ModuleKey } from "@/lib/data/shared";

/**
 * WORKSPACE-ASSEMBLY §7 — the capability registry. The single source of metadata
 * behind the dynamic nav, the composed Home (each capability's `widgets`), the
 * Library catalog, and discovery. "Installed" for a New org = the capability's
 * module is flipped live in the profile (we reuse the `modules` map as the
 * install store). Capabilities align to today's module keys for now; the registry
 * is where new ones (notes, files, payments…) get added later.
 */

export type CapabilityKey = ModuleKey;

/** The pillar/primitive a capability belongs to — groups the Library + nav. */
export type Primitive = "pipeline" | "growth" | "business";

/** A tile a capability contributes to the composed Home (§6.1). */
export interface WidgetSpec {
  id: string;
  title: string;
  size: "sm" | "md";
  href: string;
  /** honest-empty body shown until the capability has data (New orgs are empty) */
  empty: string;
  priority: number; // lower = earlier on Home
}

export interface Capability {
  key: CapabilityKey;
  label: string;
  blurb: string; // what it does — the Library card line
  primitive: Primitive;
  tier: "base" | "module";
  /** "native" or connector keys — the native/connect/off choice (§3). */
  providers: string[];
  surface: "page" | "agent";
  widgets: WidgetSpec[];
  /** helps Lu/the Library surface it from a phrase ("I need to send invoices"). */
  keywords: string[];
}

export const CAPABILITIES: Record<CapabilityKey, Capability> = {
  crm: {
    key: "crm",
    label: "CRM",
    blurb: "Every lead and customer, organized and worked automatically.",
    primitive: "pipeline",
    tier: "base",
    providers: ["native", "hubspot"],
    surface: "page",
    widgets: [{ id: "leads", title: "New leads this week", size: "sm", href: "/customers", empty: "0 — new leads land here the moment they text or fill your form.", priority: 10 }],
    keywords: ["crm", "leads", "customers", "contacts", "clients", "pipeline"],
  },
  schedule: {
    key: "schedule",
    label: "Schedule",
    blurb: "Jobs and estimates on one calendar, routed to cut your drive time.",
    primitive: "pipeline",
    tier: "base",
    providers: ["native", "google", "calendly"],
    surface: "page",
    widgets: [{ id: "today", title: "Schedule", size: "sm", href: "/schedule", empty: "Nothing booked yet — Lu books estimates straight into it.", priority: 20 }],
    keywords: ["schedule", "calendar", "appointments", "booking", "estimates"],
  },
  money: {
    key: "money",
    label: "Money",
    blurb: "Quotes, invoices, and payments — in one place.",
    primitive: "pipeline",
    tier: "base",
    providers: ["native", "stripe", "quickbooks"],
    surface: "page",
    widgets: [{ id: "money", title: "Money", size: "sm", href: "/money", empty: "$0 in play — quotes and invoices land here.", priority: 35 }],
    keywords: ["money", "quotes", "invoices", "payments", "billing", "get paid"],
  },
  agents: {
    key: "agents",
    label: "Agents",
    blurb: "Your AI coworkers — reviews, content, and follow-ups.",
    primitive: "growth",
    tier: "base",
    providers: ["native"],
    surface: "agent",
    widgets: [{ id: "agents", title: "Agents", size: "sm", href: "/agents", empty: "Your agents show up here as you switch them on.", priority: 65 }],
    keywords: ["agents", "reviews", "content", "follow-ups", "automation", "coworkers"],
  },
  sites: {
    key: "sites",
    label: "Sites",
    blurb: "A fast, modern site — every lead flows straight to Lu.",
    primitive: "growth",
    tier: "base",
    providers: ["native", "connect-existing"],
    surface: "page",
    widgets: [{ id: "sites", title: "Sites", size: "sm", href: "/sites", empty: "A blank canvas — tell Lu what you want and she builds it.", priority: 72 }],
    keywords: ["sites", "website", "web", "landing page"],
  },
  quotes: {
    key: "quotes",
    label: "Quotes",
    blurb: "Draft and send quotes by text. “Quote the Miller job.”",
    primitive: "pipeline",
    tier: "module",
    providers: ["native", "docusign"],
    surface: "page",
    widgets: [{ id: "quotes_out", title: "Quotes out", size: "sm", href: "/quotes", empty: "$0 waiting on a yes.", priority: 30 }],
    keywords: ["quote", "quotes", "proposal", "estimate", "sow", "agreement", "engagement letter"],
  },
  invoices: {
    key: "invoices",
    label: "Invoices",
    blurb: "Send and track invoices by text — or connect Stripe.",
    primitive: "pipeline",
    tier: "module",
    providers: ["native", "stripe", "quickbooks"],
    surface: "page",
    widgets: [{ id: "owed", title: "Awaiting payment", size: "sm", href: "/invoices", empty: "$0 — invoices you send show up here.", priority: 40 }],
    keywords: ["invoice", "invoices", "billing", "payment", "pay", "get paid", "stripe", "deposit"],
  },
  followups: {
    key: "followups",
    label: "Follow-ups",
    blurb: "She chases the leads and quotes that go quiet, so nothing slips.",
    primitive: "pipeline",
    tier: "module",
    providers: ["native"],
    surface: "agent",
    widgets: [{ id: "chasing", title: "Being chased", size: "sm", href: "/followups", empty: "0 — quiet leads and quotes get nudged automatically.", priority: 50 }],
    keywords: ["follow up", "follow-ups", "chase", "nudge", "quiet", "reminders"],
  },
  website: {
    key: "website",
    label: "Website",
    blurb: "A fast, modern site — every lead flows straight to Lu.",
    primitive: "growth",
    tier: "module",
    providers: ["native", "connect-existing"],
    surface: "page",
    widgets: [{ id: "site", title: "Your site", size: "sm", href: "/website", empty: "A blank canvas — tell Lu what you want and she builds it.", priority: 70 }],
    keywords: ["website", "site", "web", "landing page"],
  },
  content: {
    key: "content",
    label: "Content",
    blurb: "Finished a job? Text Lu the photos and she writes the post.",
    primitive: "growth",
    tier: "module",
    providers: ["native"],
    surface: "agent",
    widgets: [{ id: "content", title: "Content", size: "sm", href: "/content", empty: "Nothing drafted yet — text Lu photos from a job.", priority: 75 }],
    keywords: ["content", "posts", "social", "marketing", "facebook", "instagram"],
  },
  reviews: {
    key: "reviews",
    label: "Reviews",
    blurb: "Lu texts every past customer who never left one. Your first win, day one.",
    primitive: "growth",
    tier: "module",
    providers: ["native"],
    surface: "agent",
    widgets: [{ id: "reputation", title: "Reputation", size: "sm", href: "/reviews", empty: "No reviews yet — launch a wave and they land here.", priority: 60 }],
    keywords: ["review", "reviews", "reputation", "google reviews", "referrals"],
  },
  analytics: {
    key: "analytics",
    label: "Analytics",
    blurb: "Every visit, call, and lead in one place — your report card.",
    primitive: "business",
    tier: "module",
    providers: ["native"],
    surface: "page",
    widgets: [{ id: "numbers", title: "Your numbers", size: "sm", href: "/analytics", empty: "No numbers yet — they fill in as Lu works.", priority: 90 }],
    keywords: ["analytics", "numbers", "reports", "metrics", "roi", "funnel"],
  },
  team: {
    key: "team",
    label: "Team",
    blurb: "Your crew can text Lu too, with the permissions you set — she builds an org chart.",
    primitive: "business",
    tier: "module",
    providers: ["native"],
    surface: "page",
    widgets: [{ id: "team", title: "Team", size: "sm", href: "/team", empty: "Just you — add your crew and Lu maps them.", priority: 80 }],
    keywords: ["team", "crew", "staff", "employees", "org chart", "members"],
  },
};

export const CAPABILITY_KEYS = Object.keys(CAPABILITIES) as CapabilityKey[];

export const PRIMITIVE_LABEL: Record<Primitive, string> = {
  pipeline: "Win work",
  growth: "Get found",
  business: "Run the business",
};

/** Installed = the capability's module is flipped live in the profile's modules map. */
export function isInstalled(modules: Partial<Record<CapabilityKey, string>> | undefined, key: CapabilityKey): boolean {
  return modules?.[key] === "live";
}

/** The installed capabilities, in registry order. */
export function installedCapabilities(modules: Partial<Record<CapabilityKey, string>> | undefined): Capability[] {
  return CAPABILITY_KEYS.filter((k) => isInstalled(modules, k)).map((k) => CAPABILITIES[k]);
}

/** All Home widgets from the installed capabilities, ordered. */
export function composedWidgets(modules: Partial<Record<CapabilityKey, string>> | undefined): WidgetSpec[] {
  return installedCapabilities(modules)
    .flatMap((c) => c.widgets)
    .sort((a, b) => a.priority - b.priority);
}
