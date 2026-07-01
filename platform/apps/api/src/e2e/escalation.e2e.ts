import { describe, it, expect } from "vitest";
import { RUN_E2E, startConversation, OWNER_PHONE } from "./harness.js";
import { easternContractor } from "./fixtures.js";

const SUNDAY = "2026-07-05T16:00:00Z";

describe.skipIf(!RUN_E2E)("E2E · escalation loop (real Claude)", () => {
  it("escalates an unanswerable question, then relays the contractor's reply to the homeowner", async () => {
    const c = await startConversation({ contractor: easternContractor, now: SUNDAY });
    await c.say("roof leak at 100 Main St, Newton MA 02458, I own the home");
    await c.say("quick question before we book — do you guys also install standing-seam metal roofs?");

    // She MUST call escalate_to_contractor (not just say 'I'll check') → escalation row + contractor SMS.
    expect(c.escalations().length).toBeGreaterThanOrEqual(1);
    expect(c.ownerSms().some((s) => s.body.includes("asks:") && s.body.toLowerCase().includes("metal"))).toBe(true);

    // Contractor texts back from their number → relayed to the homeowner + escalation resolved.
    const before = c.homeownerSms().length;
    const r = await c.contractorReply("Yes, we install metal roofs — happy to quote it on site.", OWNER_PHONE);
    expect(r.status).toBe("ok");
    expect(c.homeownerSms().length).toBeGreaterThan(before);
    expect(c.homeownerSms().some((s) => s.body.toLowerCase().includes("metal"))).toBe(true);
    expect(c.escalations().every((e) => e.status !== "open")).toBe(true);
  });
});
