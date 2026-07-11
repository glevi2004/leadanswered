import { describe, it, expect } from "vitest";
import {
  computeOpenWindows,
  nextWeekStart,
  isWithinStandingWindow,
  formatWeeklyAvailability,
  formatSlot,
} from "./availability.js";
import type { AvailabilityWindow, TimeRange } from "./index.js";

// 2026-06-15 is a Monday (1); 2026-06-17 a Wednesday (3).
const windows: AvailabilityWindow[] = [
  { dayOfWeek: 1, start: "09:00", end: "11:00" },
  { dayOfWeek: 3, start: "13:00", end: "17:00" },
];
const now = new Date("2026-06-15T08:00:00Z");
const week = { fromIso: now.toISOString(), toIso: "2026-06-22T00:00:00Z" };

// A UTC organization is the identity case: local wall-time == UTC, so these mirror the pre-tz behavior.
describe("computeOpenWindows (UTC organization = identity)", () => {
  it("returns the standing windows in range (no busy)", () => {
    const w = computeOpenWindows(windows, week, [], now, "UTC");
    expect(w.map((x) => [x.startIso, x.endIso])).toEqual([
      ["2026-06-15T09:00:00.000Z", "2026-06-15T11:00:00.000Z"],
      ["2026-06-17T13:00:00.000Z", "2026-06-17T17:00:00.000Z"],
    ]);
  });

  it("subtracts a booking, splitting the window", () => {
    const busy: TimeRange[] = [
      { startAt: new Date("2026-06-17T14:00:00Z"), endAt: new Date("2026-06-17T15:00:00Z") },
    ];
    const wed = computeOpenWindows(windows, { ...week, dayOfWeek: 3 }, busy, now, "UTC");
    expect(wed.map((x) => [x.startIso, x.endIso])).toEqual([
      ["2026-06-17T13:00:00.000Z", "2026-06-17T14:00:00.000Z"],
      ["2026-06-17T15:00:00.000Z", "2026-06-17T17:00:00.000Z"],
    ]);
  });

  it("honors a dayOfWeek filter", () => {
    const w = computeOpenWindows(windows, { ...week, dayOfWeek: 1 }, [], now, "UTC");
    expect(w).toHaveLength(1);
    expect(w[0].startIso).toBe("2026-06-15T09:00:00.000Z");
  });

  it("honors partOfDay (morning drops the Wed afternoon window)", () => {
    const w = computeOpenWindows(windows, { ...week, partOfDay: "morning" }, [], now, "UTC");
    expect(w.map((x) => x.startIso)).toEqual(["2026-06-15T09:00:00.000Z"]);
  });

  it("drops a free segment too short for a 60-min visit", () => {
    const busy: TimeRange[] = [
      { startAt: new Date("2026-06-15T09:30:00Z"), endAt: new Date("2026-06-15T11:00:00Z") },
    ];
    const w = computeOpenWindows(windows, { ...week, dayOfWeek: 1 }, busy, now, "UTC");
    expect(w).toHaveLength(0); // only 09:00-09:30 (30 min) remained
  });
});

// The real feature: windows are LOCAL wall-time and convert to the correct UTC instant, DST-aware.
describe("computeOpenWindows (America/New_York, DST-aware)", () => {
  const nyWin: AvailabilityWindow[] = [{ dayOfWeek: 1, start: "09:00", end: "17:00" }]; // Mon 9-5 local

  it("summer (EDT, UTC-4): Mon 9-5 local → 13:00Z-21:00Z", () => {
    const n = new Date("2026-07-06T00:00:00Z"); // around a summer Monday
    const w = computeOpenWindows(nyWin, { fromIso: "2026-07-06T00:00:00Z", toIso: "2026-07-07T00:00:00Z" }, [], n, "America/New_York");
    expect(w.map((x) => [x.startIso, x.endIso])).toEqual([
      ["2026-07-06T13:00:00.000Z", "2026-07-06T21:00:00.000Z"],
    ]);
  });

  it("winter (EST, UTC-5): Mon 9-5 local → 14:00Z-22:00Z (the SAME window, different offset)", () => {
    const n = new Date("2026-01-05T00:00:00Z"); // a winter Monday
    const w = computeOpenWindows(nyWin, { fromIso: "2026-01-05T00:00:00Z", toIso: "2026-01-06T00:00:00Z" }, [], n, "America/New_York");
    expect(w.map((x) => [x.startIso, x.endIso])).toEqual([
      ["2026-01-05T14:00:00.000Z", "2026-01-05T22:00:00.000Z"],
    ]);
  });
});

describe("nextWeekStart", () => {
  it("UTC: from a Wednesday → the next Monday 00:00 UTC", () => {
    expect(nextWeekStart(new Date("2026-07-01T15:00:00Z"), "UTC").toISOString()).toBe("2026-07-06T00:00:00.000Z");
  });
  it("UTC: from a Monday → the following Monday", () => {
    expect(nextWeekStart(now, "UTC").toISOString()).toBe("2026-06-22T00:00:00.000Z");
  });
  it("America/New_York: next local Monday 00:00 ET = 04:00Z in summer", () => {
    expect(nextWeekStart(new Date("2026-07-01T15:00:00Z"), "America/New_York").toISOString()).toBe("2026-07-06T04:00:00.000Z");
  });
});

describe("isWithinStandingWindow", () => {
  it("UTC: a 60-min start that fits inside a window → true", () => {
    expect(isWithinStandingWindow(windows, "2026-06-15T09:00:00Z", "UTC")).toBe(true);
    expect(isWithinStandingWindow(windows, "2026-06-15T10:00:00Z", "UTC")).toBe(true);
  });
  it("UTC: a start that would overrun the window end → false", () => {
    expect(isWithinStandingWindow(windows, "2026-06-15T10:30:00Z", "UTC")).toBe(false);
  });
  it("UTC: wrong day → false", () => {
    expect(isWithinStandingWindow(windows, "2026-06-16T09:00:00Z", "UTC")).toBe(false);
  });
  it("America/New_York: 8 AM ET (12:00Z) fits a 6-11 local window; 6:00Z (2 AM ET) does NOT", () => {
    const nyMorning: AvailabilityWindow[] = [{ dayOfWeek: 1, start: "06:00", end: "11:00" }];
    expect(isWithinStandingWindow(nyMorning, "2026-07-06T12:00:00Z", "America/New_York")).toBe(true); // 8 AM ET
    expect(isWithinStandingWindow(nyMorning, "2026-07-06T06:00:00Z", "America/New_York")).toBe(false); // 2 AM ET
  });
});

describe("formatSlot / formatWeeklyAvailability", () => {
  it("formatSlot renders in the given timezone", () => {
    // 13:00Z == 9:00 AM Eastern (EDT).
    expect(formatSlot("2026-07-06T13:00:00Z", "America/New_York")).toContain("9:00 AM");
    expect(formatSlot("2026-07-06T13:00:00Z", "UTC")).toContain("1:00 PM");
  });
  it("weekly summary reads like a human summary, ordered Mon→Sun", () => {
    expect(formatWeeklyAvailability(windows)).toBe("Mon 9am-11am, Wed 1pm-5pm");
  });
});
