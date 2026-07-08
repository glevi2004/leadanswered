import { describe, it, expect } from "vitest";
import { RUN_E2E, startConversation } from "./harness.js";
import { easternContractor } from "./fixtures.js";

const SUNDAY = "2026-07-05T16:00:00Z";
const MON_8AM_ET = "2026-07-06T12:00:00.000Z";
const TUE_8AM_ET = "2026-07-07T12:00:00.000Z";

/** Get a lead to a confirmed Monday-8AM booking (shared setup for reschedule/cancel). */
async function bookedMonday8am() {
  const c = await startConversation({ contractor: easternContractor, now: SUNDAY });
  await c.say("Hi, I've got a roof leak at 100 Main St, Newton MA 02458. I own the home.");
  await c.say("What times do you have Monday morning?");
  await c.say("8 am works for me");
  expect(c.appointments()[0]?.startIso).toBe(MON_8AM_ET);
  return c;
}

describe.skipIf(!RUN_E2E)("E2E · booking lifecycle (real Claude, Eastern contractor)", () => {
  it("reschedules to a new LOCAL time (Tuesday 8 am → 8 AM ET, not 6 AM)", async () => {
    const c = await bookedMonday8am();
    await c.say("actually, can we move it to Tuesday at 8am instead?");
    await c.say("yes, Tuesday 8am is perfect");
    const appt = c.appointments()[0];
    expect(appt.startIso).toBe(TUE_8AM_ET);
    expect(appt.rescheduledFromIso).toBe(MON_8AM_ET);
    expect(c.ownerSms().some((s) => s.body.includes("Rescheduled"))).toBe(true);
  });

  it("cancels the booking and re-opens the lead", async () => {
    const c = await bookedMonday8am();
    await c.say("something came up, I need to cancel the appointment");
    expect(c.appointments()[0].status).toBe("cancelled");
    expect(await c.status()).toBe("contacted");
    expect(c.ownerSms().some((s) => s.body.toLowerCase().includes("cancelled"))).toBe(true);
  });

  it("is idempotent — a duplicate webhook (same providerSid) yields exactly one reply", async () => {
    const c = await startConversation({ contractor: easternContractor, now: SUNDAY });
    const before = c.homeownerSms().length;
    const first = await c.sayRaw("do you fix roof leaks?", "DUP-SID-1");
    const dup = await c.sayRaw("do you fix roof leaks?", "DUP-SID-1");
    expect(first.status).toBe("ok");
    expect(dup.status).toBe("skipped");
    expect(c.homeownerSms().length).toBe(before + 1); // one reply, not two
  });

  it("a disqualified lead still gets answered on a follow-up (not silent)", async () => {
    const c = await startConversation({ contractor: easternContractor, now: SUNDAY });
    await c.say("roof repair at 12 Ocean St, Hyannis MA 02601, I own it"); // out of area → disqualified
    expect(await c.status()).toBe("disqualified");
    const before = c.homeownerSms().length;
    const reply = await c.say("ok, thanks anyway — appreciate the quick response!");
    expect(reply.length).toBeGreaterThan(0); // she replies
    expect(c.homeownerSms().length).toBeGreaterThan(before);
  });
});
