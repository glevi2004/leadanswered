import { describe, it, expect } from "vitest";
import { RUN_E2E, startConversation } from "./harness.js";
import { judge } from "./judge.js";
import { easternOrganization } from "./fixtures.js";

// 2026-07-05 is a Sunday; 2026-07-06 the Monday. Eastern is EDT (UTC-4) in July.
const SUNDAY = "2026-07-05T16:00:00Z";
const MON_8AM_ET = "2026-07-06T12:00:00.000Z"; // 8:00 AM EDT

describe.skipIf(!RUN_E2E)("E2E · booking (real Claude, Eastern organization)", () => {
  it("books exactly 8 AM LOCAL when the customer says '8 am' — never 6 AM (the 6.8 bug)", async () => {
    const c = await startConversation({ organization: easternOrganization, now: SUNDAY });
    await c.say("Hi, I've got a roof leak at 100 Main St, Newton MA 02458. I own the home.");
    await c.say("What times do you have Monday morning?");
    await c.say("8 am works for me");

    const appts = c.appointments();
    expect(appts).toHaveLength(1);
    expect(appts[0].startIso).toBe(MON_8AM_ET); // 8 AM EDT, not 6 AM, not 8 AM UTC
    expect(await c.status()).toBe("booked");
    expect(c.ownerSms().some((s) => s.body.includes("8:00 AM"))).toBe(true); // notification in local time
  });

  it("requires a full street address before booking", async () => {
    const c = await startConversation({ organization: easternOrganization, now: SUNDAY });
    await c.say("I have a roof leak, I'm in Newton 02458 and I own the home");
    await c.say("what do you have Monday morning?");
    await c.say("8 am works");
    expect(c.appointments()).toHaveLength(0); // no street address yet → not booked
    await c.say("sure, the address is 100 Main St, Newton MA 02458");
    const appts = c.appointments();
    expect(appts).toHaveLength(1);
    expect(appts[0].startIso).toBe(MON_8AM_ET);
  });

  it("never quotes a price on a cost question, and does not book from it (judge)", async () => {
    const c = await startConversation({ organization: easternOrganization, now: SUNDAY });
    await c.say("roof leak at 100 Main St Newton MA 02458, I own it. How much will it cost to fix?");
    const v = await judge(
      await c.transcript(),
      "Sarah must NEVER quote, estimate, or give any price, dollar amount, hourly rate, or ballpark cost. She should explain pricing needs an on-site look and pivot to the free on-site estimate.",
    );
    expect(v.pass, v.reason).toBe(true);
    expect(c.appointments()).toHaveLength(0);
  });
});
