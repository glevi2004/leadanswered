/**
 * Cross-module types — the shared vocabulary from platform/app-ui/00-foundation.md §6.
 * Module-local types live next to their provider (lib/data/<module>/).
 */

export type ModuleKey =
  | "crm" // labeled "Customers" in the fixed nav
  | "schedule"
  | "money" // fixed nav
  | "quotes"
  | "invoices"
  | "followups"
  | "website"
  | "content"
  | "reviews"
  | "analytics"
  | "team"
  | "agents" // fixed nav
  | "sites"; // fixed nav

/** Core surfaces are never gated but still need registry entries (chips, routes). */
export type SurfaceKey = ModuleKey | "home" | "sarah" | "canvas" | "settings";

export type ModuleStatus = "live" | "preview" | "coming_soon" | "hidden";

export type NavGroup = "pipeline" | "marketing" | "business";

/** One row of "what Sarah did" — emitted on tool success (mock-only until the api emits them). */
export interface SarahAction {
  id: string;
  at: string; // ISO
  module: ModuleKey | "core";
  summary: string; // "Booked Sam & Priya Patel — Thu 9:00"
  contactId?: string;
  href?: string; // deep link to the record
}

export type ApprovalKind =
  | "customer_message"
  | "quote"
  | "invoice"
  | "review_ask"
  | "post"
  | "social_post"
  | "site_edit";

/** A hard-gate draft awaiting the owner's explicit yes — code sends, never the model. */
export interface Approval {
  id: string;
  kind: ApprovalKind;
  createdAt: string;
  summary: string; // "Review ask → Mike O'Brien"
  preview: string; // the exact draft content
  contactId?: string;
  entityId?: string; // the module record it belongs to (postId, quoteId…)
  status: "pending" | "approved" | "declined" | "expired";
}

/** One message in THE owner conversation (SMS + widget + /sarah are one thread). */
export interface SarahMessage {
  id: string;
  at: string; // ISO
  role: "owner" | "sarah";
  body: string;
  via: "sms" | "app";
}

import type { PipelineStage } from "./crm/types";

/** A person the business talks to — lead early, customer later (00 §6). */
export interface Contact {
  id: string;
  kind: "lead" | "customer"; // 'customer' is new (CRM entity)
  name: string; // maps from: Lead.contactName
  phone: string; // maps from: Lead.contactPhone
  email?: string; // maps from: none (new)
  address?: string; // maps from: Lead.fullAddress
  town?: string; // maps from: Lead.serviceTown
  zip?: string; // maps from: Lead.serviceZip
  stage: PipelineStage; // maps from: Lead.status (superset; owned by 05-crm)
  source: string; // maps from: Lead.source, + 'import'
  tags: string[]; // maps from: none (new)
  lastActivityAt: string; // ISO; derived
  createdAt: string;
}

/** One entry on a contact's unified timeline (00 §6). */
export type TimelineEvent = { id: string; at: string; contactId: string } & (
  | { type: "message"; direction: "inbound" | "outbound"; body: string; via: "sms" | "app" }
  | { type: "appointment"; appointmentId: string; startAt: string; status: string }
  | { type: "escalation"; question: string; status: "open" | "resolved" | "expired" }
  | { type: "quote"; quoteId: string; label: string; totalCents: number; status: string }
  | { type: "invoice"; invoiceId: string; label: string; totalCents: number; status: string }
  | { type: "review"; rating: 1 | 2 | 3 | 4 | 5; excerpt?: string }
  | { type: "note"; body: string; author: string }
  | { type: "import"; source: string }
);
