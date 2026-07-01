import { describe, it, expect } from "vitest";
import {
  DEFAULT_TIMEZONE,
  isValidZone,
  safeZone,
  localWallToUtc,
  zonedParts,
  nextLocalMondayStartUtc,
} from "./timezone.js";
import { resolveChosenSlot } from "./conversation.js";

describe("timezone primitives", () => {
  it("isValidZone / safeZone", () => {
    expect(isValidZone("America/New_York")).toBe(true);
    expect(isValidZone("Not/AZone")).toBe(false);
    expect(isValidZone(undefined)).toBe(false);
    expect(safeZone("Not/AZone")).toBe(DEFAULT_TIMEZONE);
    expect(safeZone("America/Los_Angeles")).toBe("America/Los_Angeles");
  });

  it("localWallToUtc is DST-correct (EDT vs EST)", () => {
    // 9:00 AM Eastern in July is EDT (UTC-4) → 13:00Z; in January is EST (UTC-5) → 14:00Z.
    expect(localWallToUtc("America/New_York", 2026, 7, 6, 9, 0).toISOString()).toBe("2026-07-06T13:00:00.000Z");
    expect(localWallToUtc("America/New_York", 2026, 1, 5, 9, 0).toISOString()).toBe("2026-01-05T14:00:00.000Z");
  });

  it("zonedParts expresses a UTC instant in the zone", () => {
    const p = zonedParts("2026-07-06T13:00:00Z", "America/New_York"); // 9 AM ET, Monday
    expect(p.hh).toBe(9);
    expect(p.mm).toBe(0);
    expect(p.dow).toBe(1); // Monday
  });

  it("nextLocalMondayStartUtc → next local Monday 00:00 ET (04:00Z summer)", () => {
    expect(nextLocalMondayStartUtc("America/New_York", new Date("2026-07-01T15:00:00Z")).toISOString()).toBe(
      "2026-07-06T04:00:00.000Z",
    );
  });
});

describe("resolveChosenSlot (deterministic — the 6.8 bug fix)", () => {
  // Offered Monday morning slots in America/New_York (EDT): 6/7/8 AM local = 10/11/12 Z.
  const offered = {
    "1": "2026-07-06T10:00:00.000Z", // 6 AM ET
    "2": "2026-07-06T11:00:00.000Z", // 7 AM ET
    "3": "2026-07-06T12:00:00.000Z", // 8 AM ET
  };
  const tz = "America/New_York";

  it("'8 am' resolves to the 8-AM-LOCAL slot, never the first offered id", () => {
    expect(resolveChosenSlot(offered, "8 am", tz)).toBe("2026-07-06T12:00:00.000Z");
    expect(resolveChosenSlot(offered, "8am", tz)).toBe("2026-07-06T12:00:00.000Z");
    expect(resolveChosenSlot(offered, "8:00", tz)).toBe("2026-07-06T12:00:00.000Z");
  });

  it("still honors an exact short id, a raw ISO, and the label", () => {
    expect(resolveChosenSlot(offered, "1", tz)).toBe("2026-07-06T10:00:00.000Z");
    expect(resolveChosenSlot(offered, "2026-07-06T11:00:00.000Z", tz)).toBe("2026-07-06T11:00:00.000Z");
  });

  it("returns null when nothing matches (caller re-offers)", () => {
    expect(resolveChosenSlot(offered, "3 pm", tz)).toBeNull();
    expect(resolveChosenSlot(offered, "", tz)).toBeNull();
    expect(resolveChosenSlot(null, "8 am", tz)).toBeNull();
  });
});
