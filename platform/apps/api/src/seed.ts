import type { ContractorConfig } from "@leadanswered/core";
import type { RecipientRecord } from "./store/types.js";

/** The single hardcoded test contractor for Phase 1 (SCOPE §6). */
export const TEST_CONTRACTOR_ID = "contractor_apex";
/** Email-routing slug — lead emails arrive at leads+apex@<LEAD_EMAIL_DOMAIN>. */
export const TEST_CONTRACTOR_SLUG = "apex";

export const testContractor: ContractorConfig = {
  id: TEST_CONTRACTOR_ID,
  name: "Marcus Reyes",
  companyName: "Apex Roofing",
  slug: TEST_CONTRACTOR_SLUG,
  sarahName: "Sarah",
  personaNotes:
    "Warm and reassuring, with a local New England touch. Always mentions the on-site estimate is free.",
  projectTypes: ["Roof repair", "Roof replacement"],
  serviceArea: {
    baseLocations: [{ zip: "02458", radiusMiles: 25 }], // Newton, MA
    includeOverrides: ["01601"], // Worcester — always serve (outside radius)
    excludeOverrides: ["02101"], // Boston proper — never serve (inside radius)
  },
  qualificationRules: { requireDecisionMaker: true },
  standingAvailability: {
    timezone: "UTC",
    slots: [
      { dayOfWeek: 1, time: "09:00" },
      { dayOfWeek: 1, time: "14:00" },
      { dayOfWeek: 2, time: "11:00" },
      { dayOfWeek: 2, time: "14:00" },
      { dayOfWeek: 3, time: "10:00" },
      { dayOfWeek: 4, time: "15:00" },
    ],
  },
  twilioNumber: "+18444157642",
};

/** The owner, subscribed to booking + qualified-lead alerts on both channels (SCOPE §5.2 defaults). */
export const testRecipients: RecipientRecord[] = [
  {
    id: "recip_owner",
    name: "Marcus (owner)",
    phone: "+18335559999",
    email: "marcus@apexroofing.example",
    subscriptions: [
      { eventType: "booking_confirmed", channels: "both" },
      { eventType: "booking_rescheduled", channels: "both" },
      { eventType: "booking_cancelled", channels: "both" },
      { eventType: "new_qualified_lead", channels: "both" },
    ],
  },
];
