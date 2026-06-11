import { describe, it, expect } from "vitest";
import { decideTurn, mergeGathered } from "./conversation.js";
import type { QualificationResult, SlotOption } from "./index.js";

const slots: SlotOption[] = [
  { iso: "2026-06-15T09:00:00.000Z", label: "Mon 9am" },
  { iso: "2026-06-15T14:00:00.000Z", label: "Mon 2pm" },
];

const qualified: QualificationResult = {
  inArea: true, projectOffered: true, isDecisionMaker: true, qualified: true, missing: [],
};
const notQualified: QualificationResult = {
  inArea: null, projectOffered: true, isDecisionMaker: null, qualified: false, missing: ["location", "decision_maker"],
};
const disqualified: QualificationResult = {
  inArea: false, projectOffered: true, isDecisionMaker: true, qualified: false, missing: [],
};

describe("mergeGathered", () => {
  it("keeps prior values and overlays new non-null ones", () => {
    const merged = mergeGathered(
      { projectType: "roof repair", serviceZip: null },
      { serviceZip: "75093", isDecisionMaker: true },
    );
    expect(merged.projectType).toBe("roof repair");
    expect(merged.serviceZip).toBe("75093");
    expect(merged.isDecisionMaker).toBe(true);
  });
});

describe("decideTurn (CODE decides — SCOPE §5.1)", () => {
  it("disqualified → disqualify/done", () => {
    const d = decideTurn({ gathered: {}, qualification: disqualified, slots, alreadyQualified: false });
    expect(d).toMatchObject({ action: "disqualify", nextStage: "done" });
  });

  it("not enough info → continue/qualifying", () => {
    const d = decideTurn({ gathered: { projectType: "roof repair" }, qualification: notQualified, slots, alreadyQualified: false });
    expect(d).toMatchObject({ action: "continue", nextStage: "qualifying" });
  });

  it("newly qualified → mark_qualified/proposing_slots", () => {
    const d = decideTurn({ gathered: { serviceZip: "75093", projectType: "roof repair", isDecisionMaker: true }, qualification: qualified, slots, alreadyQualified: false });
    expect(d).toMatchObject({ action: "mark_qualified", nextStage: "proposing_slots" });
  });

  it("qualified + slot chosen but no address → continue/confirming", () => {
    const d = decideTurn({ gathered: { chosenSlot: slots[0].iso }, qualification: qualified, slots, alreadyQualified: true });
    expect(d).toMatchObject({ action: "continue", nextStage: "confirming" });
  });

  it("qualified + chosen slot + full address → book/done with the matched slot", () => {
    const d = decideTurn({ gathered: { chosenSlot: slots[1].iso, fullAddress: "123 Oak St, Plano, TX 75093" }, qualification: qualified, slots, alreadyQualified: true });
    expect(d.action).toBe("book");
    expect(d.nextStage).toBe("done");
    expect(d.bookingSlotIso).toBe(slots[1].iso);
  });

  it("books when the chosen slot is given as the human label (model echoes the label, not the id)", () => {
    const d = decideTurn({ gathered: { chosenSlot: "Mon 2pm", fullAddress: "123 Oak St" }, qualification: qualified, slots, alreadyQualified: true });
    expect(d.action).toBe("book");
    expect(d.bookingSlotIso).toBe(slots[1].iso); // resolved to the real slot id
  });

  it("regression: does NOT book on a chosen-slot value that matches no offered time", () => {
    const d = decideTurn({ gathered: { chosenSlot: "sometime next week maybe", fullAddress: "123 Oak St" }, qualification: qualified, slots, alreadyQualified: true });
    expect(d.action).toBe("continue");
    expect(d.nextStage).toBe("confirming");
    expect(d.bookingSlotIso).toBeUndefined();
  });
});
