import { describe, it, expect } from "vitest";
import { MemoryStore } from "../store/memoryStore.js";
import { CapturingEmail, CapturingSms } from "../testkit.js";
import { testContractor, testRecipients, TEST_CONTRACTOR_ID } from "../seed.js";
import { runNudgeJob } from "./nudge.js";

const NOW = new Date("2026-06-15T08:00:00Z");

function setup() {
  const store = new MemoryStore();
  store.seedContractor(testContractor, testRecipients);
  return { store, sms: new CapturingSms(), email: new CapturingEmail() };
}

describe("runNudgeJob (quiet-lead follow-up)", () => {
  it("nudges a lead who went quiet after Sarah's message, once", async () => {
    const { store, sms, email } = setup();
    const ctx = await store.createLeadWithConversation({ contractorId: TEST_CONTRACTOR_ID, contactName: "Levi", contactPhone: "+19788105602", source: "manual" });
    await store.appendMessage(ctx.conversation.id, { direction: "outbound", body: "What's the property address?" });
    await store.updateLeadFields(ctx.lead.id, { status: "contacted" });

    const r = await runNudgeJob({ store, sms, email, now: NOW }, ctx.lead.id);
    expect(r).toBe("nudged");
    expect(sms.sent.some((s) => s.to === "+19788105602" && /checking in/i.test(s.body))).toBe(true);

    // a second run is a no-op (status now no_response)
    expect(await runNudgeJob({ store, sms, email, now: NOW }, ctx.lead.id)).toBe("skipped");
  });

  it("does NOT nudge a lead who already replied (last message is inbound)", async () => {
    const { store, sms, email } = setup();
    const ctx = await store.createLeadWithConversation({ contractorId: TEST_CONTRACTOR_ID, contactName: "Levi", contactPhone: "+19788105602", source: "manual" });
    await store.appendMessage(ctx.conversation.id, { direction: "outbound", body: "What's the address?" });
    await store.appendMessage(ctx.conversation.id, { direction: "inbound", body: "100 Linden St" });

    expect(await runNudgeJob({ store, sms, email, now: NOW }, ctx.lead.id)).toBe("skipped");
    expect(sms.sent).toHaveLength(0);
  });

  it("does NOT nudge a booked lead", async () => {
    const { store, sms, email } = setup();
    const ctx = await store.createLeadWithConversation({ contractorId: TEST_CONTRACTOR_ID, contactName: "Levi", contactPhone: "+19788105602", source: "manual" });
    await store.appendMessage(ctx.conversation.id, { direction: "outbound", body: "Booked!" });
    await store.updateLeadFields(ctx.lead.id, { status: "booked" });
    expect(await runNudgeJob({ store, sms, email, now: NOW }, ctx.lead.id)).toBe("skipped");
  });
});
