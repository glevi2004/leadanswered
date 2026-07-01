import { describe, it, expect } from "vitest";
import { RUN_E2E, startConversation } from "./harness.js";
import { judge } from "./judge.js";
import { easternContractor } from "./fixtures.js";

const SUNDAY = "2026-07-05T16:00:00Z";
const MON_6AM_ET = "2026-07-06T10:00:00.000Z"; // 6:00 AM EDT — the earliest local slot

describe.skipIf(!RUN_E2E)("E2E · availability + timezone (real Claude, Eastern contractor)", () => {
  it("a general availability question is answered with WINDOWS, not a slot dump (judge)", async () => {
    const c = await startConversation({ contractor: easternContractor, now: SUNDAY });
    await c.say("roof leak at 100 Main St, Newton MA 02458, I own the home");
    await c.say("what's your availability next week?");
    const v = await judge(
      await c.transcript(),
      "When asked generally about availability, Sarah describes open WINDOWS (a day plus a time range, e.g. 'Tuesday and Friday mornings'). She must NOT dump a long list of individual clock times (like '6:00, 7:00, 8:00, 9:00, 10:00').",
    );
    expect(v.pass, v.reason).toBe(true);
  });

  it("a focused day offers concrete times in LOCAL time, starting at 6 AM (not 2 AM, not dropped)", async () => {
    const c = await startConversation({ contractor: easternContractor, now: SUNDAY });
    await c.say("roof leak at 100 Main St, Newton MA 02458, I own the home");
    await c.say("what do you have Monday morning?");
    const slots = Object.values(await c.offeredSlots());
    expect(slots.length).toBeGreaterThan(0);
    // The Eastern 6-11 AM window → earliest offered start is 6 AM EDT = 10:00Z (never 2 AM ET / 06:00Z).
    expect(slots).toContain(MON_6AM_ET);
    expect(slots.every((iso) => iso >= MON_6AM_ET)).toBe(true);
  });
});
