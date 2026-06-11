import { describe, it, expect } from "vitest";
import { proposeSlots, formatSlot } from "./availability.js";
import type { StandingAvailability } from "./index.js";

// 2026-06-15 is a Monday (dayOfWeek 1); 2026-06-17 is a Wednesday (3).
const availability: StandingAvailability = {
  timezone: "UTC",
  slots: [
    { dayOfWeek: 1, time: "09:00" },
    { dayOfWeek: 1, time: "14:00" },
    { dayOfWeek: 3, time: "10:00" },
  ],
};

describe("proposeSlots", () => {
  it("returns the next N concrete upcoming slots, in order", () => {
    const now = new Date("2026-06-15T08:00:00Z"); // Monday 08:00
    const slots = proposeSlots(availability, 3, now);
    expect(slots.map((s) => s.iso)).toEqual([
      "2026-06-15T09:00:00.000Z",
      "2026-06-15T14:00:00.000Z",
      "2026-06-17T10:00:00.000Z",
    ]);
  });

  it("excludes slots at or before `now`", () => {
    const now = new Date("2026-06-15T09:00:00Z"); // exactly the first slot
    const slots = proposeSlots(availability, 2, now);
    expect(slots[0].iso).toBe("2026-06-15T14:00:00.000Z");
  });

  it("formatSlot produces a human label", () => {
    expect(formatSlot("2026-06-15T09:00:00.000Z")).toContain("Monday");
    expect(formatSlot("2026-06-15T09:00:00.000Z")).toContain("9:00");
  });
});
