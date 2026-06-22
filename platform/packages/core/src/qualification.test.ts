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
    baseLocations: [{ zip: "02458", radiusMiles: 25 }], // Newton, MA
    includeOverrides: ["01601"], // Worcester — always serve (outside radius)
    excludeOverrides: ["02101"], // Boston proper — never serve (inside radius)
  },
  qualificationRules: { requireDecisionMaker: true },
  standingAvailability: { timezone: "UTC", slots: [] },
};

describe("service area (SCOPE §5.1)", () => {
  const area = contractor.serviceArea;
  it("zip inside radius, not excluded → in", () => {
    expect(isInServiceArea("02459", area)).toBe(true);
    expect(isInServiceArea("02465", area)).toBe(true);
  });
  it("zip in exclude_overrides → out, even though inside radius", () => {
    expect(isInServiceArea("02101", area)).toBe(false);
  });
  it("zip in include_overrides → in, even though outside radius", () => {
    expect(isInServiceArea("01601", area)).toBe(true);
  });
  it("zip outside radius, not included → out", () => {
    expect(isInServiceArea("02601", area)).toBe(false);
    expect(isInServiceArea("01060", area)).toBe(false);
  });
  it("exclude beats include (zip in both) → out", () => {
    const both = { ...area, includeOverrides: ["01601"], excludeOverrides: ["01601"] };
    expect(isInServiceArea("01601", both)).toBe(false);
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
      { serviceZip: "02459", projectType: "roof repair", isDecisionMaker: true },
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
      { serviceZip: "02601", projectType: "roof repair", isDecisionMaker: true },
      contractor,
    );
    expect(r.inArea).toBe(false);
    expect(r.qualified).toBe(false);
    expect(isDisqualified(r)).toBe(true);
  });

  it("project not offered → disqualified", () => {
    const r = qualify(
      { serviceZip: "02459", projectType: "gutters", isDecisionMaker: true },
      contractor,
    );
    expect(r.projectOffered).toBe(false);
    expect(isDisqualified(r)).toBe(true);
  });

  it("not the decision-maker → not qualified", () => {
    const r = qualify(
      { serviceZip: "02459", projectType: "roof repair", isDecisionMaker: false },
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
    const r = qualify({ serviceZip: "02459", projectType: "roof repair" }, relaxed);
    expect(r.qualified).toBe(true);
  });
});
