/** Team-owned types (12-team §4). References ModuleKey from 00 §4. */
import type { ModuleKey } from "../shared";

export type RoleKey = "owner" | "office" | "crew"; // v1: three presets, no custom roles

export type ModuleAccess = "none" | "view" | "act"; // see it / act in it

/** What texting (or asking in-app) gets you — Lu consults this per inbound. */
export interface LuCapabilities {
  askSchedule: "none" | "own" | "all"; // "what's my Thursday?" → own route vs whole board
  moveJobs: "none" | "own" | "all"; // reschedule/cancel via Lu
  askCrm: "none" | "own" | "all"; // look up contacts/jobs ('own' = assigned jobs)
  requestQuotes: boolean; // may ask Lu to DRAFT a quote
  sendInvoices: boolean; // may tell Lu to send/track an invoice
  changePricing: boolean; // edit quote amounts/line items
  approveHardGates: boolean; // Owner-only, enforced in code
}

export interface Role {
  key: RoleKey;
  name: string; // "Owner" | "Office" | "Crew"
  blurb: string; // one plain-trades sentence
  modules: Record<ModuleKey, ModuleAccess>; // app-side access per module
  sarah: LuCapabilities; // text-side access
}

/** What Lu has learned about a teammate (mirrors the onboarding "what Lu knows about you"). */
export interface MemberLearned {
  title?: string; // "CFO", "Lead installer"
  skills?: string[]; // ["metal roofing", "gutters"]
  coverage?: string; // towns/days they cover
  summary?: string; // Lu's one-liner
  canHandle?: string[]; // what Lu routes to them
  source?: "told" | "inferred";
}

export interface Member {
  id: string; // 'mem_marcus' | 'mem_danny' | 'mem_kayla'
  name: string; // maps from: NotificationRecipient.name
  phone: string; // the number Lu recognizes them by
  email?: string; // present ⇒ app access possible
  roleKey: RoleKey;
  /** manager's member id — builds the hierarchy tree (root owner has none) */
  reportsTo?: string;
  /** what Lu has learned about this teammate (mirrors the onboarding "what Lu knows about you") */
  learned?: MemberLearned;
  overrides?: {
    modules?: Partial<Record<ModuleKey, ModuleAccess>>;
    sarah?: Partial<LuCapabilities>;
  };
  smsStatus: "pending_hello" | "active" | "opted_out"; // Lu's side of the relationship
  appAccess: "none" | "invited" | "active"; // Supabase auth side
  notifications: Array<{ eventType: string; channels: "sms" | "email" | "both" }>;
  lastActiveAt?: string; // ISO; latest text-to-Lu or app session
  createdAt: string;
}
