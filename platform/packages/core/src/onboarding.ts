import { z } from "zod";
import { geocodeZip } from "./geo.js";
import type { AvailabilitySlot, NotificationEventType } from "./types.js";

/**
 * Validation + mapping for the self-serve onboarding form (SCOPE §10, Phase 3).
 * Pure so the web form and any future caller validate identically; the resulting
 * shape maps 1:1 onto what the agent/`qualify` already consume.
 */

/** The notification events a contractor can subscribe a recipient to (for the form UI). */
export const NOTIFICATION_EVENT_TYPES: NotificationEventType[] = [
  "booking_confirmed",
  "booking_rescheduled",
  "booking_cancelled",
  "new_qualified_lead",
  "new_inquiry",
  "lead_unresponsive",
  "disqualified_lead",
];

const zip5 = z.string().regex(/^\d{5}$/, "must be a 5-digit ZIP");
const timeHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "must be a time like 09:00");

const recipientSchema = z
  .object({
    name: z.string().min(1, "name is required"),
    phone: z.string().trim().min(7).nullish(),
    email: z.string().email().nullish(),
    subscriptions: z
      .array(
        z.object({
          eventType: z.enum(NOTIFICATION_EVENT_TYPES as [NotificationEventType, ...NotificationEventType[]]),
          channels: z.enum(["sms", "email", "both"]),
        }),
      )
      .default([]),
  })
  .refine((r) => !!r.phone || !!r.email, { message: "a recipient needs a phone or an email" });

export const contractorConfigSchema = z.object({
  companyName: z.string().min(1, "company name is required"),
  sarahName: z.string().min(1).default("Sarah"),
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
    timezone: z.string().min(1).default("America/New_York"),
    slots: z
      .array(z.object({ dayOfWeek: z.number().int().min(0).max(6), time: timeHHMM }))
      .min(1, "add at least one available time"),
  }),
  escalationTopics: z.array(z.string().min(1)).default([]),
  recipients: z.array(recipientSchema).default([]),
});

export type ContractorConfigInput = z.infer<typeof contractorConfigSchema>;

/**
 * Semantic checks beyond shape: base ZIPs must geocode (qualification computes
 * distance from them). Override ZIPs may be un-geocodable — they're explicit
 * decisions. Returns human-readable errors (empty = ok).
 */
export function validateServiceAreaZips(area: {
  baseLocations: { zip: string }[];
}): string[] {
  const errors: string[] = [];
  for (const b of area.baseLocations) {
    if (!geocodeZip(b.zip)) errors.push(`We couldn't locate base ZIP ${b.zip} — double-check it.`);
  }
  return errors;
}

// --- weekly availability grid <-> standing-availability slots ---

/** A weekly grid keyed by day-of-week (0=Sun … 6=Sat) → list of "HH:MM" times. */
export type WeeklyGrid = Record<number, string[]>;

/** Group flat slots into a grid for editing in the UI. */
export function slotsToGrid(slots: AvailabilitySlot[]): WeeklyGrid {
  const grid: WeeklyGrid = {};
  for (const s of slots) (grid[s.dayOfWeek] ??= []).push(s.time);
  for (const day of Object.keys(grid)) grid[Number(day)].sort();
  return grid;
}

/** Flatten the grid back to sorted, de-duplicated slots for `standingAvailability`. */
export function gridToSlots(grid: WeeklyGrid): AvailabilitySlot[] {
  const seen = new Set<string>();
  const slots: AvailabilitySlot[] = [];
  for (const [day, times] of Object.entries(grid)) {
    for (const time of times) {
      const key = `${day}:${time}`;
      if (seen.has(key)) continue;
      seen.add(key);
      slots.push({ dayOfWeek: Number(day), time });
    }
  }
  return slots.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time));
}
