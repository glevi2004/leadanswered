import type { ContractorConfig } from "@leadanswered/core";
import { testContractor } from "../seed.js";

/**
 * Contractor fixtures for E2E scenarios. All share the seed's id/twilioNumber/service-area so the
 * harness + notifications work unchanged; they differ in timezone + windows to exercise tz behavior.
 */

/** UTC contractor (identity case) — the seed as-is (Mon-Fri 9-17 UTC). */
export const utcContractor: ContractorConfig = testContractor;

/** Eastern contractor: mornings 6-11 (Mon/Tue/Fri) + afternoons 11-16 (Wed/Thu). America/New_York. */
export const easternContractor: ContractorConfig = {
  ...testContractor,
  standingAvailability: {
    timezone: "America/New_York",
    windows: [
      { dayOfWeek: 1, start: "06:00", end: "11:00" },
      { dayOfWeek: 2, start: "06:00", end: "11:00" },
      { dayOfWeek: 3, start: "11:00", end: "16:00" },
      { dayOfWeek: 4, start: "11:00", end: "16:00" },
      { dayOfWeek: 5, start: "06:00", end: "11:00" },
    ],
  },
};

/** Pacific contractor: Mon-Fri 9-17 local (America/Los_Angeles). */
export const pacificContractor: ContractorConfig = {
  ...testContractor,
  standingAvailability: {
    timezone: "America/Los_Angeles",
    windows: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, start: "09:00", end: "17:00" })),
  },
};

/** No standing availability at all (for the "we're closed" / empty-availability rule). */
export const noAvailabilityContractor: ContractorConfig = {
  ...testContractor,
  standingAvailability: { timezone: "America/New_York", windows: [] },
};
