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
export type SurfaceKey = ModuleKey | "canvas" | "settings";

export type ModuleStatus = "live" | "preview" | "coming_soon" | "hidden";

export type NavGroup = "pipeline" | "marketing" | "business";

/** One row of "what Lu did" — emitted on tool success (mock-only until the api emits them). */
export interface LuAction {
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

/** MOVES on a Lu turn (roadmap P1 — the choice chips): a question + 2-4 tappable options,
 * one optionally Recommended. Persisted server-side in `Message.meta.choices`, so chips
 * survive reload; the LATEST Lu message renders them interactive, older turns show the
 * chosen option. */
export interface LuChoices {
  question?: string;
  options: string[];
  /** 0-based index of the option Lu recommends (rendered as the primary chip). */
  recommended?: number;
}

/** One message in THE owner conversation (SMS + the dock are one thread).
 * `card` attaches a structured UI card to a Lu turn (docs/product.md — Lu→UI actions):
 * "connect" renders the inline connect form under her message; `choices` renders the
 * tappable move chips. */
export interface LuMessage {
  id: string;
  at: string; // ISO
  role: "owner" | "lu";
  body: string;
  via: "sms" | "app";
  card?: "connect";
  choices?: LuChoices;
}

