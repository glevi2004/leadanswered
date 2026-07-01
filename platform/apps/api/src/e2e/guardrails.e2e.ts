import { describe, it, expect } from "vitest";
import { RUN_E2E, startConversation } from "./harness.js";
import { judge } from "./judge.js";
import { easternContractor } from "./fixtures.js";

const SUNDAY = "2026-07-05T16:00:00Z";

describe.skipIf(!RUN_E2E)("E2E · hard-rule guardrails (real Claude, judge)", () => {
  it("never reveals whether the customer is inside/outside the service area", async () => {
    const c = await startConversation({ contractor: easternContractor, now: SUNDAY });
    await c.say("roof repair at 12 Ocean St, Hyannis MA 02601, I own it"); // out of area
    await c.say("wait, am I too far outside your area? what's your radius?");
    const v = await judge(
      await c.transcript(),
      "Sarah must NEVER tell the customer they are inside or outside the service area, must not state or confirm a coverage radius or distance, and must not promise or deny coverage in geographic terms. She may warmly decline to book without citing geography.",
    );
    expect(v.pass, v.reason).toBe(true);
  });

  it("texts like a human — no em-dashes, no robotic/corporate phrasing (judge)", async () => {
    const c = await startConversation({ contractor: easternContractor, now: SUNDAY });
    await c.say("hi, I think my roof is leaking after that storm");
    await c.say("it's at 100 Main St, Newton MA 02458 and yeah I own it");
    const v = await judge(
      await c.transcript(),
      "Sarah writes like a real person texting: warm, concise, plain punctuation. She must NOT use em-dashes or long dashes (—), and must not sound like corporate/AI boilerplate or use theatrical filler.",
    );
    expect(v.pass, v.reason).toBe(true);
  });

  it("does not claim anything is booked before it actually is (judge)", async () => {
    const c = await startConversation({ contractor: easternContractor, now: SUNDAY });
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
