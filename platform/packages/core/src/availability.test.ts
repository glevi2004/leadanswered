import { describe, it, expect } from "vitest";
import {
  computeOpenWindows,
  nextWeekStart,
  isWithinStandingWindow,
  formatWeeklyAvailability,
} from "./availability.js";
import type { AvailabilityWindow, TimeRange } from "./index.js";

// 2026-06-15 is a Monday (1); 2026-06-17 a Wednesday (3).
const windows: AvailabilityWindow[] = [
  { dayOfWeek: 1, start: "09:00", end: "11:00" },
  { dayOfWeek: 3, start: "13:00", end: "17:00" },
];
const now = new Date("2026-06-15T08:00:00Z");
const week = { fromIso: now.toISOString(), toIso: "2026-06-22T00:00:00Z" };

describe("computeOpenWindows", () => {
  it("returns the standing windows in range (no busy)", () => {
    const w = computeOpenWindows(windows, week, [], now);
    expect(w.map((x) => [x.startIso, x.endIso])).toEqual([
      ["2026-06-15T09:00:00.000Z", "2026-06-15T11:00:00.000Z"],
      ["2026-06-17T13:00:00.000Z", "2026-06-17T17:00:00.000Z"],
    ]);
  });

  it("subtracts a booking, splitting the window", () => {
    const busy: TimeRange[] = [
      { startAt: new Date("2026-06-17T14:00:00Z"), endAt: new Date("2026-06-17T15:00:00Z") },
    ];
    const wed = computeOpenWindows(windows, { ...week, dayOfWeek: 3 }, busy, now);
    expect(wed.map((x) => [x.startIso, x.endIso])).toEqual([
      ["2026-06-17T13:00:00.000Z", "2026-06-17T14:00:00.000Z"],
      ["2026-06-17T15:00:00.000Z", "2026-06-17T17:00:00.000Z"],
    ]);
  });

  it("honors a dayOfWeek filter", () => {
    const w = computeOpenWindows(windows, { ...week, dayOfWeek: 1 }, [], now);
    expect(w).toHaveLength(1);
    expect(w[0].startIso).toBe("2026-06-15T09:00:00.000Z");
  });

  it("honors partOfDay (morning drops the Wed afternoon window)", () => {
    const w = computeOpenWindows(windows, { ...week, partOfDay: "morning" }, [], now);
    expect(w.map((x) => x.startIso)).toEqual(["2026-06-15T09:00:00.000Z"]);
  });

  it("drops a free segment too short for a 60-min visit", () => {
    const busy: TimeRange[] = [
      { startAt: new Date("2026-06-15T09:30:00Z"), endAt: new Date("2026-06-15T11:00:00Z") },
    ];
    const w = computeOpenWindows(windows, { ...week, dayOfWeek: 1 }, busy, now);
    expect(w).toHaveLength(0); // only 09:00-09:30 (30 min) remained
  });
});

describe("nextWeekStart", () => {
  it("from a Wednesday → the next Monday 00:00 UTC", () => {
    expect(nextWeekStart(new Date("2026-07-01T15:00:00Z")).toISOString()).toBe("2026-07-06T00:00:00.000Z");
  });
  it("from a Monday → the following Monday", () => {
    expect(nextWeekStart(now).toISOString()).toBe("2026-06-22T00:00:00.000Z");
  });
});

describe("isWithinStandingWindow", () => {
  it("a 60-min start that fits inside a window → true", () => {
    expect(isWithinStandingWindow(windows, "2026-06-15T09:00:00Z")).toBe(true);
    expect(isWithinStandingWindow(windows, "2026-06-15T10:00:00Z")).toBe(true);
  });
  it("a start that would overrun the window end → false", () => {
    expect(isWithinStandingWindow(windows, "2026-06-15T10:30:00Z")).toBe(false);
  });
  it("wrong day → false", () => {
    expect(isWithinStandingWindow(windows, "2026-06-16T09:00:00Z")).toBe(false);
  });
});

describe("formatWeeklyAvailability", () => {
  it("reads like a human summary, ordered Mon→Sun", () => {
    expect(formatWeeklyAvailability(windows)).toBe("Mon 9am-11am, Wed 1pm-5pm");
  });
});
