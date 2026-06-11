import { describe, it, expect } from "vitest";
import { assembleSystemPrompt } from "./prompt.js";
import type { ContractorConfig, QualificationResult } from "./index.js";

const contractor: ContractorConfig = {
  id: "c1",
  name: "Owner",
  companyName: "Apex Roofing",
  sarahName: "Sarah",
  personaNotes: "Texas-friendly, mentions free estimates.",
  projectTypes: ["roof_repair", "roof_replacement"],
  serviceArea: { baseLocations: [], includeOverrides: [], excludeOverrides: [] },
  qualificationRules: { requireDecisionMaker: true },
  standingAvailability: { timezone: "UTC", slots: [] },
};

const qualified: QualificationResult = {
  inArea: true,
  projectOffered: true,
  isDecisionMaker: true,
  qualified: true,
  missing: [],
};

describe("assembleSystemPrompt", () => {
  it("includes company, persona, services, and the no-pricing hard rule", () => {
    const p = assembleSystemPrompt({
      contractor,
      leadName: "Jane",
      gathered: {},
      qualification: { inArea: null, projectOffered: null, isDecisionMaker: null, qualified: false, missing: ["location", "project", "decision_maker"] },
      slots: [],
      stage: "qualifying",
    });
    expect(p).toContain("Apex Roofing");
    expect(p).toContain("Sarah");
    expect(p).toContain("roof_repair");
    expect(p).toContain("NEVER quote"); // the pricing hard rule must be present
    expect(p).toContain("Texas-friendly"); // persona notes injected
  });

  it("when not qualified, directs Sarah to ask for missing info and not propose times", () => {
    const p = assembleSystemPrompt({
      contractor,
      leadName: "Jane",
      gathered: { projectType: "roof repair" },
      qualification: { inArea: null, projectOffered: true, isDecisionMaker: null, qualified: false, missing: ["location", "decision_maker"] },
      slots: [],
      stage: "qualifying",
    });
    expect(p).toMatch(/town or ZIP/i);
    expect(p).toMatch(/do not propose appointment times yet/i);
  });

  it("when qualified, offers the provided slots", () => {
    const p = assembleSystemPrompt({
      contractor,
      leadName: "Jane",
      gathered: { projectType: "roof repair", serviceZip: "75093", isDecisionMaker: true },
      qualification: qualified,
      slots: [
        { iso: "2026-06-15T09:00:00.000Z", label: "Monday, June 15 at 9:00 AM" },
        { iso: "2026-06-15T14:00:00.000Z", label: "Monday, June 15 at 2:00 PM" },
      ],
      stage: "proposing_slots",
    });
    expect(p).toContain("Monday, June 15 at 9:00 AM");
    expect(p).toMatch(/free on-site estimate/i);
  });

  it("when out of area, directs a polite decline with no booking", () => {
    const p = assembleSystemPrompt({
      contractor,
      leadName: "Jane",
      gathered: { serviceZip: "73301" },
      qualification: { inArea: false, projectOffered: null, isDecisionMaker: null, qualified: false, missing: [] },
      slots: [],
      stage: "qualifying",
    });
    expect(p).toMatch(/outside our service area/i);
    expect(p).toMatch(/do not book/i);
  });
});
