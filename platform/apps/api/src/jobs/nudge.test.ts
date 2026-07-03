import { describe, it, expect } from "vitest";
import { MemoryStore } from "../store/memoryStore.js";
import { CapturingEmail, CapturingSms, scriptedModel } from "../testkit.js";
import { testContractor, testRecipients, TEST_CONTRACTOR_ID } from "../seed.js";
import { runNudgeJob } from "./nudge.js";

const NOW = new Date("2026-06-15T08:00:00Z");
const PHONE = "+19788105602";

function setup(modelText = "Hey Levi, still happy to help whenever you're ready!") {
  const store = new MemoryStore();
  store.seedContractor(testContractor, testRecipients);
  return {
    store,
    sms: new CapturingSms(),
    email: new CapturingEmail(),
    model: scriptedModel([{ text: modelText }]),
  };
}

async function quietLead(store: MemoryStore) {
  const ctx = await store.createLeadWithConversation({
    contractorId: TEST_CONTRACTOR_ID, contactName: "Levi", contactPhone: PHONE, source: "manual",
  });
  await store.appendMessage(ctx.conversation.id, { direction: "outbound", body: "What's the property address?" });
  await store.updateLeadFields(ctx.lead.id, { status: "contacted" });
  return ctx;
}

describe("runNudgeJob (context-aware quiet-lead follow-up)", () => {
  it("sends ONE context-aware follow-up to a quiet lead, then no more (one per interaction)", async () => {
    const { store, sms, email, model } = setup();
    const ctx = await quietLead(store);

    const r = await runNudgeJob({ store, sms, email, model, now: NOW }, ctx.lead.id);
    expect(r).toBe("nudged");
    expect(sms.sent.some((s) => s.to === PHONE)).toBe(true); // a real (model-written) message went out

    // second run is a no-op — already nudged this interaction
    expect(await runNudgeJob({ store, sms, email, model, now: NOW }, ctx.lead.id)).toBe("skipped");
    expect(sms.sent.filter((s) => s.to === PHONE)).toHaveLength(1);
  });

  it("does NOT nudge while an escalation is OPEN (they're waiting on the contractor)", async () => {
    const { store, sms, email, model } = setup();
    const ctx = await quietLead(store);
    await store.createEscalation({
      leadId: ctx.lead.id, contractorId: TEST_CONTRACTOR_ID, conversationId: ctx.conversation.id,
      question: "when are you coming?",
    });

    const r = await runNudgeJob({ store, sms, email, model, now: NOW }, ctx.lead.id);
    expect(r).toBe("skipped");
    expect(sms.sent).toHaveLength(0); // the exact live bug: no estimate nudge while waiting on the human
  });

  it("stays SILENT when the agent decides no follow-up helps (no text, no mislabel)", async () => {
    const { store, sms, email, model } = setup("SILENT");
    const ctx = await quietLead(store);

    const r = await runNudgeJob({ store, sms, email, model, now: NOW }, ctx.lead.id);
    expect(r).toBe("skipped");
    expect(sms.sent).toHaveLength(0);
    const after = await store.getContextByLeadId(ctx.lead.id);
    expect(after?.lead.status).not.toBe("no_response"); // not mislabeled when we stayed silent
  });

  it("does NOT nudge a lead who already replied (last message is inbound)", async () => {
    const { store, sms, email, model } = setup();
    const ctx = await store.createLeadWithConversation({
      contractorId: TEST_CONTRACTOR_ID, contactName: "Levi", contactPhone: PHONE, source: "manual",
    });
    await store.appendMessage(ctx.conversation.id, { direction: "outbound", body: "What's the address?" });
    await store.appendMessage(ctx.conversation.id, { direction: "inbound", body: "100 Linden St" });

    expect(await runNudgeJob({ store, sms, email, model, now: NOW }, ctx.lead.id)).toBe("skipped");
    expect(sms.sent).toHaveLength(0);
  });

  it("does NOT nudge a booked lead", async () => {
    const { store, sms, email, model } = setup();
    const ctx = await store.createLeadWithConversation({
      contractorId: TEST_CONTRACTOR_ID, contactName: "Levi", contactPhone: PHONE, source: "manual",
    });
    await store.appendMessage(ctx.conversation.id, { direction: "outbound", body: "Booked!" });
    await store.updateLeadFields(ctx.lead.id, { status: "booked" });

    expect(await runNudgeJob({ store, sms, email, model, now: NOW }, ctx.lead.id)).toBe("skipped");
  });
});
