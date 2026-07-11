/**
 * Cross-module types — the shared vocabulary from platform/app-ui/00-foundation.md §6.
 * Module-local types live next to their provider (lib/data/<module>/).
 */

export type ModuleKey =
  | "crm"
  | "schedule"
  | "quotes"
  | "invoices"
  | "followups" // nav cluster: pipeline
  | "website"
  | "content"
  | "reviews" // nav cluster: marketing
  | "analytics"
  | "team"; // nav cluster: business

/** Core surfaces are never gated but still need registry entries (chips, routes). */
export type SurfaceKey = ModuleKey | "home" | "sarah" | "settings";

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
