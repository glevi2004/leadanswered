// Domain types shared across the platform (SCOPE §4, §5).
// Vertical-neutral by design — only Sarah's conversation copy is homeowner-flavored.

export interface LatLng {
  lat: number;
  lng: number;
}

export interface BaseLocation {
  zip: string;
  radiusMiles: number;
}

/** Structured service area — qualification is computed against this, never judged by the AI (SCOPE §5.1). */
export interface ServiceArea {
  baseLocations: BaseLocation[];
  includeOverrides: string[]; // zips always in-area
  excludeOverrides: string[]; // zips never served (wins over everything)
}

export interface QualificationRules {
  /** Require the contact to be the decision-maker to qualify (default true). */
  requireDecisionMaker?: boolean;
}

/** 0 = Sunday … 6 = Saturday; time is "HH:MM" (24h). */
export interface AvailabilitySlot {
  dayOfWeek: number;
  time: string;
}

export interface StandingAvailability {
  timezone: string;
  slots: AvailabilitySlot[];
}

export interface ContractorConfig {
  id: string;
  name: string;
  companyName: string;
  sarahName: string;
  personaNotes?: string | null;
  projectTypes: string[];
  serviceArea: ServiceArea;
  qualificationRules: QualificationRules;
  standingAvailability: StandingAvailability;
  twilioNumber?: string | null;
}

/** Everything we've gathered about a lead so far (accumulated across turns). */
export interface GatheredInfo {
  projectType?: string | null;
  serviceTown?: string | null;
  serviceZip?: string | null;
  fullAddress?: string | null;
  isDecisionMaker?: boolean | null;
  /** ISO datetime of a slot the lead has agreed to, if any. */
  chosenSlot?: string | null;
}

export type MissingField = "location" | "project" | "decision_maker";

export interface QualificationResult {
  inArea: boolean | null; // null = unknown (not enough info yet)
  projectOffered: boolean | null;
  isDecisionMaker: boolean | null;
  qualified: boolean;
  missing: MissingField[];
}

export type Stage =
  | "greeting"
  | "qualifying"
  | "proposing_slots"
  | "confirming"
  | "done";

export type ProposedAction =
  | "none"
  | "qualify"
  | "propose_slots"
  | "book"
  | "disqualify";

export type NotificationEventType =
  | "booking_confirmed"
  | "new_qualified_lead"
  | "new_inquiry"
  | "lead_unresponsive"
  | "disqualified_lead";

export type NotificationChannel = "sms" | "email" | "both";
