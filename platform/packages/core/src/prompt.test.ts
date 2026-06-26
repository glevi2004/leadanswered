import { describe, it, expect } from "vitest";
import { assembleAgentSystemPrompt } from "./prompt.js";
import type { ContractorConfig } from "./index.js";

const contractor: ContractorConfig = {
  id: "c1",
  name: "Owner",
  companyName: "Apex Roofing",
  sarahName: "Sarah",
  personaNotes: "Texas-friendly, mentions free estimates.",
  projectTypes: ["roof_repair", "roof_replacement"],
  serviceArea: { baseLocations: [], includeOverrides: [], excludeOverrides: [] },
  qualificationRules: { requireDecisionMaker: true },
  standingAvailability: { timezone: "UTC", slots: [] },
};

describe("assembleAgentSystemPrompt (tool-using agent)", () => {
  it("frames the job + tools and keeps the hard guardrails", () => {
    const p = assembleAgentSystemPrompt({
      contractor,
      leadName: "Jane",
      gathered: { projectType: "roof leak" },
    });
    expect(p).toContain("Apex Roofing");
    expect(p).toContain("roof_repair"); // offered services
    expect(p).toContain("qualify_lead"); // tool guidance
    expect(p).toContain("get_availability");
    expect(p).toContain("book_appointment");
    expect(p).toContain("NEVER quote"); // pricing hard rule survives
    expect(p).toMatch(/never state whether the customer is inside or outside/i); // no area leak
    expect(p).toMatch(/unless a tool RESULT told you so/i); // determinism boundary
  });

  it("lists the contractor's escalation topics in the escalate guidance", () => {
    const p = assembleAgentSystemPrompt({
      contractor,
      leadName: "Jane",
      gathered: {},
    });
    expect(p).toContain("escalate_to_contractor");
    expect(p).toMatch(/financing or payment plans/i); // a default escalation topic
  });

  it("switches to reschedule/cancel guidance once the lead has a booking", () => {
    const p = assembleAgentSystemPrompt({
      contractor,
      leadName: "Jane",
      gathered: { projectType: "roof leak" },
      hasBooking: true,
    });
    expect(p).toContain("reschedule_appointment");
    expect(p).toContain("cancel_appointment");
  });
});
