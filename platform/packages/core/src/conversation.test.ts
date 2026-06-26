import { describe, it, expect } from "vitest";
import { mergeGathered, slotMatches } from "./conversation.js";
import type { SlotOption } from "./index.js";

const slots: SlotOption[] = [
  { iso: "2026-06-15T09:00:00.000Z", label: "Mon 9am" },
  { iso: "2026-06-15T14:00:00.000Z", label: "Mon 2pm" },
];

describe("mergeGathered", () => {
  it("keeps prior values and overlays new non-null ones", () => {
    const merged = mergeGathered(
      { projectType: "roof repair", serviceZip: null },
      { serviceZip: "02459", isDecisionMaker: true },
    );
    expect(merged.projectType).toBe("roof repair");
    expect(merged.serviceZip).toBe("02459");
    expect(merged.isDecisionMaker).toBe(true);
  });

  it("carries offeredSlots through (written by get_availability, not by extraction)", () => {
    const merged = mergeGathered({ offeredSlots: { "1": slots[0].iso } }, {});
    expect(merged.offeredSlots).toEqual({ "1": slots[0].iso });
  });
});

describe("slotMatches", () => {
  it("matches by id (iso)", () => {
    expect(slotMatches(slots[1], slots[1].iso)).toBe(true);
  });
  it("matches by human label (model echoes the label, not the id)", () => {
    expect(slotMatches(slots[1], "Mon 2pm")).toBe(true);
  });
  it("matches by parsed instant (different iso formatting)", () => {
    expect(slotMatches(slots[0], "2026-06-15T09:00:00Z")).toBe(true);
  });
  it("does NOT match a value that refers to no offered time", () => {
    expect(slotMatches(slots[0], "sometime next week maybe")).toBe(false);
  });
});
