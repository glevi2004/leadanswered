import type { OrganizationConfig } from "@leadanswered/core";
import { testOrganization } from "../seed.js";

/**
 * Organization fixtures for E2E scenarios. All share the seed's id/twilioNumber/service-area so the
 * harness + notifications work unchanged; they differ in timezone + windows to exercise tz behavior.
 */

/** UTC organization (identity case) — the seed as-is (Mon-Fri 9-17 UTC). */
export const utcOrganization: OrganizationConfig = testOrganization;

/** Eastern organization: mornings 6-11 (Mon/Tue/Fri) + afternoons 11-16 (Wed/Thu). America/New_York. */
export const easternOrganization: OrganizationConfig = {
  ...testOrganization,
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

/** Pacific organization: Mon-Fri 9-17 local (America/Los_Angeles). */
export const pacificOrganization: OrganizationConfig = {
  ...testOrganization,
  standingAvailability: {
    timezone: "America/Los_Angeles",
    windows: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, start: "09:00", end: "17:00" })),
  },
};

/** No standing availability at all (for the "we're closed" / empty-availability rule). */
export const noAvailabilityOrganization: OrganizationConfig = {
  ...testOrganization,
  standingAvailability: { timezone: "America/New_York", windows: [] },
};
