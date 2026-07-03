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
  standingAvailability: { timezone: "UTC", windows: [{ dayOfWeek: 1, start: "09:00", end: "17:00" }] },
};
const now = new Date("2026-07-01T12:00:00Z"); // a Wednesday

describe("assembleAgentSystemPrompt (tool-using agent)", () => {
  it("frames the job + tools, date + weekly availability, and keeps the hard guardrails", () => {
    const p = assembleAgentSystemPrompt({ contractor, leadName: "Jane", gathered: { projectType: "roof leak" }, now });
    expect(p).toContain("Apex Roofing");
    expect(p).toContain("roof_repair"); // offered services
    expect(p).toContain("qualify_lead");
    expect(p).toContain("check_availability");
    expect(p).toContain("book_appointment");
    expect(p).toMatch(/Today is Wednesday, July 1, 2026/); // date awareness
    expect(p).toContain("Mon 9am-5pm"); // weekly availability summary
    expect(p).toMatch(/homeowner/i); // ownership-based decision-maker question
    expect(p).toContain("NEVER quote"); // pricing hard rule survives
    expect(p).toMatch(/never state whether the customer is inside or outside/i);
    expect(p).toMatch(/unless a tool RESULT told you so/i);
  });

  it("lists the contractor's escalation topics in the escalate guidance", () => {
    const p = assembleAgentSystemPrompt({ contractor, leadName: "Jane", gathered: {}, now });
    expect(p).toContain("escalate_to_contractor");
    expect(p).toMatch(/financing or payment plans/i);
  });

  it("switches to reschedule/cancel guidance once the lead has a booking", () => {
    const p = assembleAgentSystemPrompt({ contractor, leadName: "Jane", gathered: { projectType: "roof leak" }, now, hasBooking: true });
    expect(p).toContain("reschedule_appointment");
    expect(p).toContain("cancel_appointment");
  });

  it("adds disqualified handling when the lead is already disqualified", () => {
    const p = assembleAgentSystemPrompt({ contractor, leadName: "Jane", gathered: {}, now, leadStatus: "disqualified" });
    expect(p).toMatch(/already DISQUALIFIED/);
    expect(p).toMatch(/referral or recommendation/i);
  });

  it("keeps the website + estimate framing for a normal (web) lead", () => {
    const p = assembleAgentSystemPrompt({ contractor, leadName: "Jane", gathered: {}, now });
    expect(p).toMatch(/reached out through .*website/i);
    expect(p).toContain("book a free on-site estimate");
    expect(p).not.toMatch(/just CALLED/);
  });

  it("uses intent-triage framing for a missed call (does not assume an estimate)", () => {
    const p = assembleAgentSystemPrompt({ contractor, leadName: "Caller", gathered: {}, now, channel: "missed_call" });
    expect(p).toMatch(/just CALLED/); // acknowledges they phoned, unknown intent
    expect(p).toMatch(/first find out what they need/i); // triage, not the estimate funnel
    expect(p).toMatch(/escalate_to_contractor to loop in the team/i); // non-estimate route
    expect(p).not.toMatch(/reached out through/i); // no website assumption
    expect(p).not.toContain("hold a short SMS conversation to learn what they need and where the property is"); // not the default JOB
  });
});
