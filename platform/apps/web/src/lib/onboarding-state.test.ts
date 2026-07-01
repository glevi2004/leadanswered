import { describe, it, expect } from "vitest";
import { stateFromInitial, buildConfig } from "./onboarding-state";
import { DEFAULT_TIMEZONE } from "./config";

describe("onboarding timezone roundtrip", () => {
  it("preserves a saved timezone through state → config", () => {
    const s = stateFromInitial({
      companyName: "X",
      timezone: "America/Los_Angeles",
      windows: [{ dayOfWeek: 1, start: "09:00", end: "17:00" }],
    });
    expect(s.timezone).toBe("America/Los_Angeles");
    expect(buildConfig(s).standingAvailability.timezone).toBe("America/Los_Angeles");
  });

  it("defaults timezone when none is saved", () => {
    const s = stateFromInitial({ companyName: "X" });
    expect(s.timezone).toBe(DEFAULT_TIMEZONE);
    expect(buildConfig(s).standingAvailability.timezone).toBe(DEFAULT_TIMEZONE);
  });
});
