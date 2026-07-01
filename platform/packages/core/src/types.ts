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

/** A weekly availability window. 0 = Sunday … 6 = Saturday; start/end are "HH:MM" (24h), start < end. */
export interface AvailabilityWindow {
  dayOfWeek: number;
  start: string;
  end: string;
}

export interface StandingAvailability {
  timezone: string;
  windows: AvailabilityWindow[];
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
  /** Email-routing key — lead emails arrive at leads+{slug}@<domain> (SCOPE §9). */
  slug?: string | null;
  /**
   * Customer-question topics the contractor wants looped in on (escalated) rather
   * than deflected. Editable per-contractor in the dashboard later; falls back to a
   * sensible default when unset.
   */
  escalationTopics?: string[] | null;
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
  /** Map of short id → ISO for the times last offered, so the agent books with a
   *  reliable short id ("1") instead of echoing an error-prone full ISO string. */
  offeredSlots?: Record<string, string> | null;
}

export type MissingField = "location" | "project" | "decision_maker";

/**
 * How far we got resolving the lead's location (SCOPE §5.1):
 * - `resolved`     — we placed them on the map (via zip or city)
 * - `need_location`— no town/zip given yet → ask for it
 * - `need_address` — a zip/town was given but couldn't be located → ask for the
 *                    full street address + city, then geocode the city
 */
export type LocationStatus = "resolved" | "need_location" | "need_address";

export interface QualificationResult {
  inArea: boolean | null; // null = unknown (not enough info yet)
  projectOffered: boolean | null;
  isDecisionMaker: boolean | null;
  qualified: boolean;
  missing: MissingField[];
  locationStatus: LocationStatus;
  /** True when a ZIP was given but we couldn't place it (resolved via town instead).
   *  Signals a likely typo to confirm with the customer before booking (SCOPE §5.1). */
  zipUnverified: boolean;
}

export type Stage =
  | "greeting"
  | "qualifying"
  | "proposing_slots"
  | "confirming"
  | "booked"
  | "done";

export type NotificationEventType =
  | "booking_confirmed"
  | "booking_rescheduled"
  | "booking_cancelled"
  | "new_qualified_lead"
  | "new_inquiry"
  | "lead_unresponsive"
  | "disqualified_lead";

export type NotificationChannel = "sms" | "email" | "both";
