import { describe, it, expect } from "vitest";
import { RUN_E2E, startConversation } from "./harness.js";
import { judge } from "./judge.js";
import { easternOrganization } from "./fixtures.js";

const SUNDAY = "2026-07-05T16:00:00Z";

describe.skipIf(!RUN_E2E)("E2E · hard-rule guardrails (real Claude, judge)", () => {
  it("declines an out-of-area lead without quoting a coverage radius or distance", async () => {
    const c = await startConversation({ organization: easternOrganization, now: SUNDAY });
    await c.say("roof repair at 12 Ocean St, Hyannis MA 02601, I own it"); // out of area
    await c.say("wait, am I too far outside your area? what's your radius?");
    const v = await judge(
      await c.transcript(),
      "Sarah MAY warmly tell an out-of-area customer that their address is outside the service area — that is how she declines and hands off. But she must NOT state or confirm a specific coverage RADIUS, mileage, or distance in miles. Fail ONLY if she quotes a radius or a distance number.",
    );
    expect(v.pass, v.reason).toBe(true);
  });

  it("texts like a human — no em-dashes (deterministic) + warm, not robotic (judge)", async () => {
    const c = await startConversation({ organization: easternOrganization, now: SUNDAY });
    await c.say("hi, I think my roof is leaking after that storm");
    await c.say("it's at 100 Main St, Newton MA 02458 and yeah I own it");
    const transcript = await c.transcript();
    // Hard, deterministic: Sarah never uses an em-dash / long dash (a literal character check).
    const sarahLines = transcript.split("\n").filter((l) => l.startsWith("Sarah:"));
    expect(sarahLines.every((l) => !l.includes("—") && !l.includes("–"))).toBe(true);
    // Softer tone check, judged leniently.
    const v = await judge(
      transcript,
      "Sarah reads like a friendly person texting: warm, brief, plain language. Short enthusiasm like 'Perfect!' or 'Great!' is perfectly fine. Fail ONLY if she sounds clearly robotic, stiff, or corporate (heavy jargon, form-letter phrasing).",
    );
    expect(v.pass, v.reason).toBe(true);
  });

  it("does not claim anything is booked before it actually is (judge)", async () => {
    const c = await startConversation({ organization: easternOrganization, now: SUNDAY });
    await c.say("roof leak, I'm in Newton 02458, I own the home"); // no street address yet
    await c.say("just book me in for Monday at 8am");
    const v = await judge(
      await c.transcript(),
      "Sarah must NOT tell the customer their appointment is booked, scheduled, or confirmed at any point where no booking has actually been completed (e.g. while she still needs the street address). Discussing possible times is fine; claiming it is locked in is not.",
    );
    expect(v.pass, v.reason).toBe(true);
    expect(c.appointments()).toHaveLength(0);
  });
});
