import { describe, it, expect } from "vitest";
import { extractionToFields } from "./schema.js";

describe("extractionToFields", () => {
  it("maps strings to typed fields, '' → null, decision-maker enum → boolean|null", () => {
    expect(
      extractionToFields({
        project_type: "roof repair",
        service_town: "",
        service_zip: "75093",
        full_address: "",
        is_decision_maker: "yes",
        chosen_slot: "",
      }),
    ).toEqual({
      projectType: "roof repair",
      serviceTown: null,
      serviceZip: "75093",
      fullAddress: null,
      isDecisionMaker: true,
      chosenSlot: null,
    });
  });

  it("'unknown' decision-maker → null, 'no' → false", () => {
    expect(extractionToFields({ project_type: "", service_town: "", service_zip: "", full_address: "", is_decision_maker: "unknown", chosen_slot: "" }).isDecisionMaker).toBeNull();
    expect(extractionToFields({ project_type: "", service_town: "", service_zip: "", full_address: "", is_decision_maker: "no", chosen_slot: "" }).isDecisionMaker).toBe(false);
  });
});
