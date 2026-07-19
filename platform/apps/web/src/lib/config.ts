import { z } from "zod";

/**
 * Onboarding config schema + helpers, self-contained in the web app (mirrors
 * packages/core/onboarding.ts but without the geo dependency, so it bundles
 * cleanly for Next). The resulting shape maps 1:1 onto what the agent consumes.
 */

/** The one fallback timezone (mirrors core DEFAULT_TIMEZONE; kept literal to keep this file dep-light). */
export const DEFAULT_TIMEZONE = "America/New_York";
/** IANA-zone check via native Intl — no library needed for the web schema. */
const isIanaZone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const NOTIFICATION_EVENT_TYPES = [
  "booking_confirmed",
  "booking_rescheduled",
  "booking_cancelled",
  "new_qualified_lead",
  "new_inquiry",
  "lead_unresponsive",
  "disqualified_lead",
] as const;
export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

/**
 * Curated project-type suggestions shown as one-click chips in onboarding/settings. These are just
 * generic, cross-trade starting points — organizations remove them and add their own free-text to
 * match their vertical. (Making this catalog per-vertical/admin-editable is a roadmap item — SCOPE §11.)
 */
export const DEFAULT_PROJECT_TYPES = [
  "Repair",
  "Installation",
  "Replacement",
  "Maintenance",
  "Inspection",
] as const;

const zip5 = z.string().regex(/^\d{5}$/, "must be a 5-digit ZIP");
const timeHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "must be a time like 09:00");

const recipientSchema = z
  .object({
    name: z.string().min(1, "name is required"),
    phone: z.string().trim().min(7).nullish(),
    email: z.string().email().nullish(),
    subscriptions: z
      .array(z.object({ eventType: z.enum(NOTIFICATION_EVENT_TYPES), channels: z.enum(["sms", "email", "both"]) }))
      .default([]),
  })
  .refine((r) => !!r.phone || !!r.email, { message: "a recipient needs a phone or an email" });

export const organizationConfigSchema = z.object({
  companyName: z.string().min(1, "company name is required"),
  sarahName: z.string().min(1).default("Lu"),
  personaNotes: z.string().nullish(),
  projectTypes: z.array(z.string().min(1)).min(1, "add at least one project type"),
  serviceArea: z.object({
    baseLocations: z
      .array(z.object({ zip: zip5, radiusMiles: z.number().positive().max(200) }))
      .min(1, "add at least one base location"),
    includeOverrides: z.array(zip5).default([]),
    excludeOverrides: z.array(zip5).default([]),
  }),
  qualificationRules: z.object({ requireDecisionMaker: z.boolean().default(true) }),
  standingAvailability: z.object({
    timezone: z
      .string()
      .default(DEFAULT_TIMEZONE)
      .refine(isIanaZone, { message: "must be a valid IANA timezone" }),
    windows: z
      .array(z.object({ dayOfWeek: z.number().int().min(0).max(6), start: timeHHMM, end: timeHHMM }))
      .min(1, "add at least one available time"),
  }),
  escalationTopics: z.array(z.string().min(1)).default([]),
  recipients: z.array(recipientSchema).default([]),
});

export type OrganizationConfigInput = z.infer<typeof organizationConfigSchema>;

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
