import { describe, it, expect } from "vitest";
import { RUN_E2E, startConversation } from "./harness.js";
import { judge } from "./judge.js";
import { easternOrganization } from "./fixtures.js";

const SUNDAY = "2026-07-05T16:00:00Z";

describe.skipIf(!RUN_E2E)("E2E · qualification + customer hand-off (real Claude)", () => {
  it("in-area customer → qualified + owner gets a 'Qualified lead' ping", async () => {
    const c = await startConversation({ organization: easternOrganization, now: SUNDAY });
    await c.say("roof leak at 100 Main St, Newton MA 02458, and yes I own the home");
    expect(["qualifying", "booked"]).toContain(await c.status());
    expect(c.ownerSms().some((s) => s.body.includes("Qualified lead"))).toBe(true);
  });

  it("out-of-area → disqualified, never books, owner gets a turn-away ping", async () => {
    const c = await startConversation({ organization: easternOrganization, now: SUNDAY });
    await c.say("I need a roof repair at 12 Ocean St, Hyannis MA 02601, I own the home");
    expect(await c.status()).toBe("disqualified");
    expect(c.appointments()).toHaveLength(0);
    expect(c.ownerSms().some((s) => s.body.includes("turned away"))).toBe(true);
  });

  it("out-of-area + referral request → escalates (never invents a recommendation)", async () => {
    const c = await startConversation({ organization: easternOrganization, now: SUNDAY });
    await c.say("roof repair at 12 Ocean St, Hyannis MA 02601, I own it");
    await c.say("ok no worries — can you recommend someone else who covers my area?");
    expect(c.escalations().length).toBeGreaterThanOrEqual(1);
    expect(c.ownerSms().some((s) => s.body.includes("asks:"))).toBe(true);
  });

  it("tenant → asks for the owner's phone, then CODE pings the organization with it (no booking)", async () => {
    const c = await startConversation({ organization: easternOrganization, now: SUNDAY });
    await c.say("roof leak at 100 Main St, Newton MA 02458");
    await c.say("no, I rent here — I'm not the owner");
    await c.say("the owner is Jane, her number is 617-555-9090");
    expect(
      c.ownerSms().some(
        (s) => s.body.includes("isn't the decision-maker") && s.body.replace(/\D/g, "").includes("6175559090"),
      ),
    ).toBe(true);
    expect(c.appointments()).toHaveLength(0);
  });

  it("asks at most one question per message while gathering info (judge)", async () => {
    const c = await startConversation({ organization: easternOrganization, now: SUNDAY });
    await c.say("hi, my roof is leaking");
    await c.say("it's at 100 Main St, Newton MA 02458");
    await c.say("yes, I own the home");
    const v = await judge(
      await c.transcript(),
      "In each individual message, Sarah asks AT MOST ONE question. (Listing 2-3 appointment time options in a single message is allowed and does NOT count as multiple questions.)",
    );
    expect(v.pass, v.reason).toBe(true);
  });
});
