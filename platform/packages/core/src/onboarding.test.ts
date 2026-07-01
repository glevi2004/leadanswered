import { describe, it, expect } from "vitest";
import { contractorConfigSchema, validateServiceAreaZips } from "./onboarding.js";

const validInput = {
  companyName: "Apex Roofing",
  sarahName: "Sarah",
  projectTypes: ["roof_repair"],
  serviceArea: {
    baseLocations: [{ zip: "02458", radiusMiles: 25 }],
    includeOverrides: [],
    excludeOverrides: [],
  },
  qualificationRules: { requireDecisionMaker: true },
  standingAvailability: { timezone: "America/New_York", windows: [{ dayOfWeek: 1, start: "09:00", end: "17:00" }] },
  recipients: [
    { name: "Marcus", phone: "+18335559999", subscriptions: [{ eventType: "booking_confirmed", channels: "both" }] },
  ],
};

describe("contractorConfigSchema", () => {
  it("accepts a well-formed config", () => {
    expect(contractorConfigSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects an empty project list", () => {
    const r = contractorConfigSchema.safeParse({ ...validInput, projectTypes: [] });
    expect(r.success).toBe(false);
  });

  it("rejects a bad ZIP and a bad time", () => {
    expect(
      contractorConfigSchema.safeParse({
        ...validInput,
        serviceArea: { ...validInput.serviceArea, baseLocations: [{ zip: "abc", radiusMiles: 25 }] },
      }).success,
    ).toBe(false);
    expect(
      contractorConfigSchema.safeParse({
        ...validInput,
        standingAvailability: { timezone: "UTC", windows: [{ dayOfWeek: 1, start: "9am", end: "17:00" }] },
      }).success,
    ).toBe(false);
  });

  it("requires a recipient to have a phone or email", () => {
    const r = contractorConfigSchema.safeParse({
      ...validInput,
      recipients: [{ name: "Nobody", subscriptions: [] }],
    });
    expect(r.success).toBe(false);
  });
});

describe("validateServiceAreaZips", () => {
  it("passes a real base ZIP", () => {
    expect(validateServiceAreaZips({ baseLocations: [{ zip: "02458" }] })).toEqual([]);
  });
  it("flags a base ZIP that can't be located", () => {
    expect(validateServiceAreaZips({ baseLocations: [{ zip: "99999" }] }).length).toBe(1);
  });
});
