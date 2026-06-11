import { describe, it, expect } from "vitest";
import {
  qualify,
  isInServiceArea,
  isDisqualified,
  normalizeProjectType,
} from "./qualification.js";
import type { ContractorConfig, Geocoder } from "./index.js";

const contractor: ContractorConfig = {
  id: "c1",
  name: "Owner",
  companyName: "Apex Roofing",
  sarahName: "Sarah",
  projectTypes: ["roof_repair", "roof_replacement"],
  serviceArea: {
    baseLocations: [{ zip: "75024", radiusMiles: 25 }],
    includeOverrides: ["76102"], // Fort Worth — always serve (outside radius)
    excludeOverrides: ["75201"], // Dallas — never serve (inside radius)
  },
  qualificationRules: { requireDecisionMaker: true },
  standingAvailability: { timezone: "UTC", slots: [] },
};

describe("service area (SCOPE §5.1)", () => {
  const area = contractor.serviceArea;
  it("zip inside radius, not excluded → in", () => {
    expect(isInServiceArea("75093", area)).toBe(true);
    expect(isInServiceArea("75070", area)).toBe(true);
  });
  it("zip in exclude_overrides → out, even though inside radius", () => {
    expect(isInServiceArea("75201", area)).toBe(false);
  });
  it("zip in include_overrides → in, even though outside radius", () => {
    expect(isInServiceArea("76102", area)).toBe(true);
  });
  it("zip outside radius, not included → out", () => {
    expect(isInServiceArea("73301", area)).toBe(false);
    expect(isInServiceArea("77002", area)).toBe(false);
  });
  it("exclude beats include (zip in both) → out", () => {
    const both = { ...area, includeOverrides: ["76102"], excludeOverrides: ["76102"] };
    expect(isInServiceArea("76102", both)).toBe(false);
  });
  it("no/unknown zip → null (not enough info)", () => {
    expect(isInServiceArea(null, area)).toBeNull();
    expect(isInServiceArea("99999", area)).toBeNull(); // not geocodable
  });
  it("decision logic is independent of the geocoding source (injected mock)", () => {
    const mock: Geocoder = (zip) =>
      zip === "00001" ? { lat: 33.078, lng: -96.747 } : null; // same as base
    const area2 = {
      baseLocations: [{ zip: "00001", radiusMiles: 25 }],
      includeOverrides: [],
      excludeOverrides: [],
    };
    expect(isInServiceArea("00001", area2, mock)).toBe(true);
  });
});

describe("project-type normalization + synonym map", () => {
  it("'new roof' → roof_replacement", () => {
    expect(normalizeProjectType("new roof")).toBe("roof_replacement");
  });
  it("'I think I have a leak' → roof_repair (substring)", () => {
    expect(normalizeProjectType("I think I have a leak")).toBe("roof_repair");
  });
  it("'gutters' → gutters", () => {
    expect(normalizeProjectType("gutters")).toBe("gutters");
  });
  it("empty → null", () => {
    expect(normalizeProjectType(null)).toBeNull();
  });
});

describe("qualify() matrix", () => {
  it("happy path → qualified", () => {
    const r = qualify(
      { serviceZip: "75093", projectType: "roof repair", isDecisionMaker: true },
      contractor,
    );
    expect(r).toMatchObject({
      inArea: true,
      projectOffered: true,
      isDecisionMaker: true,
      qualified: true,
    });
    expect(r.missing).toEqual([]);
  });

  it("out of area → disqualified", () => {
    const r = qualify(
      { serviceZip: "73301", projectType: "roof repair", isDecisionMaker: true },
      contractor,
    );
    expect(r.inArea).toBe(false);
    expect(r.qualified).toBe(false);
    expect(isDisqualified(r)).toBe(true);
  });

  it("project not offered → disqualified", () => {
    const r = qualify(
      { serviceZip: "75093", projectType: "gutters", isDecisionMaker: true },
      contractor,
    );
    expect(r.projectOffered).toBe(false);
    expect(isDisqualified(r)).toBe(true);
  });

  it("not the decision-maker → not qualified", () => {
    const r = qualify(
      { serviceZip: "75093", projectType: "roof repair", isDecisionMaker: false },
      contractor,
    );
    expect(r.qualified).toBe(false);
    expect(isDisqualified(r)).toBe(false); // not disqualified, just not yet qualified
  });

  it("missing info → reports what's missing", () => {
    const r = qualify({ projectType: "roof repair" }, contractor);
    expect(r.missing).toContain("location");
    expect(r.missing).toContain("decision_maker");
    expect(r.qualified).toBe(false);
  });

  it("requireDecisionMaker=false relaxes the rule", () => {
    const relaxed = {
      ...contractor,
      qualificationRules: { requireDecisionMaker: false },
    };
    const r = qualify({ serviceZip: "75093", projectType: "roof repair" }, relaxed);
    expect(r.qualified).toBe(true);
  });
});
