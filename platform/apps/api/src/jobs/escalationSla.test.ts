import { describe, it, expect } from "vitest";
import { MemoryStore } from "../store/memoryStore.js";
import { CapturingEmail, CapturingSms, scriptedModel } from "../testkit.js";
import { testOrganization, testRecipients, TEST_ORGANIZATION_ID } from "../seed.js";
import { runEscalationSlaJob } from "./escalationSla.js";

const NOW = new Date("2026-06-15T12:00:00Z"); // Monday noon UTC — inside the seed organization's 9-5 window
const CUSTOMER = "+19788105602";
const OWNER = testRecipients[0].phone!; // +18335559999

async function seedEscalation(store: MemoryStore) {
  const ctx = await store.createLeadWithConversation({
    organizationId: TEST_ORGANIZATION_ID, contactName: "Levi", contactPhone: CUSTOMER, source: "missed_call",
  });
  await store.appendMessage(ctx.conversation.id, { direction: "outbound", body: "Let me check with the team and get right back to you!" });
  const esc = await store.createEscalation({
    leadId: ctx.lead.id, organizationId: TEST_ORGANIZATION_ID, conversationId: ctx.conversation.id, question: "when are you coming?",
  });
  return { ctx, esc };
}

function makeDeps(store: MemoryStore, sms: CapturingSms, text: string) {
  return { store, sms, email: new CapturingEmail(), model: scriptedModel([{ text }]), now: NOW };
}

describe("runEscalationSlaJob", () => {
  it("stage 1 re-pings the owner AND sends a positive customer reassurance (business hours)", async () => {
    const store = new MemoryStore();
    store.seedOrganization(testOrganization, testRecipients);
    const sms = new CapturingSms();
    const { esc } = await seedEscalation(store);

    const r = await runEscalationSlaJob(makeDeps(store, sms, "Still on it, hang tight!"), esc.id, 1);
    expect(r).toBe("acted");
    expect(sms.sent.some((s) => s.to === OWNER && /still waiting/i.test(s.body))).toBe(true); // owner reminder
    expect(sms.sent.some((s) => s.to === CUSTOMER)).toBe(true); // positive customer reassurance
    expect((await store.getEscalation(esc.id))?.status).toBe("open"); // not expired at stage 1
  });

  it("stage 2 expires with an OWNER-ONLY alert — never messages the customer", async () => {
    const store = new MemoryStore();
    store.seedOrganization(testOrganization, testRecipients);
    const sms = new CapturingSms();
    const { esc } = await seedEscalation(store);

    const r = await runEscalationSlaJob(makeDeps(store, sms, "unused"), esc.id, 2);
    expect(r).toBe("acted");
    expect((await store.getEscalation(esc.id))?.status).toBe("expired");
    expect(sms.sent.some((s) => s.to === OWNER && /unanswered/i.test(s.body))).toBe(true);
    expect(sms.sent.some((s) => s.to === CUSTOMER)).toBe(false); // no "couldn't reach them" to the customer
  });

  it("does nothing once the escalation is resolved", async () => {
    const store = new MemoryStore();
    store.seedOrganization(testOrganization, testRecipients);
    const sms = new CapturingSms();
    const { esc } = await seedEscalation(store);
    await store.resolveEscalationIfOpen(esc.id, "we'll be there at 2");

    const r = await runEscalationSlaJob(makeDeps(store, sms, "unused"), esc.id, 1);
    expect(r).toBe("skipped");
    expect(sms.sent).toHaveLength(0);
  });
});
