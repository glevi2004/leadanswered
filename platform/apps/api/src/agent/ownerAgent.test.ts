import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStore } from "../store/memoryStore.js";
import { handleInbound } from "../conversationService.js";
import { __resetOwnerAgent } from "./ownerAgent.js";
import { testOrganization, testRecipients, TEST_ORGANIZATION_ID } from "../seed.js";
import { CapturingSms, scriptedModel } from "../testkit.js";

const TO = testOrganization.twilioNumber!; // the assistant number
const OWNER = "+18335559999"; // the organization's recipient phone
const LEVI = "+15550001111";
const DANA = "+15550003333";
const CUSTOMER = "+15557778888";

function seed(): MemoryStore {
  const s = new MemoryStore();
  s.seedOrganization(testOrganization, testRecipients);
  return s;
}

describe("organization agent (Workflow 3) — the owner directs the assistant", () => {
  beforeEach(() => __resetOwnerAgent());

  it("hard gate: drafts + reads back, sends to the lead ONLY after the owner's yes", async () => {
    const store = seed();
    const ctx = await store.createLeadWithConversation({ organizationId: TEST_ORGANIZATION_ID, contactName: "Levi Ramos", contactPhone: LEVI, projectHint: "roof leak" });
    const sms = new CapturingSms();
    const model = scriptedModel([
      { tool: "find_leads", input: { name: "Levi" } },
      { tool: "prepare_message_to_lead", input: { leadId: ctx.lead.id, message: "we can start Monday" } },
      { text: 'Here\'s what I\'ll send Levi:\n\n"we can start Monday"\n\nSend it?' },
    ]);
    const deps = { store, model, sms };
    const send = (body: string) => handleInbound(deps, { toNumber: TO, fromNumber: OWNER, body });

    // fresh command → agent finds + STAGES the draft, reads it back; NOTHING reaches the lead yet
    await send("let Levi know we can start Monday");
    expect(sms.sent.at(-1)?.to).toBe(OWNER);
    expect(sms.sent.at(-1)?.body).toMatch(/send it\?/i);
    expect(sms.sent.some((m) => m.to === LEVI)).toBe(false); // HARD GATE

    // confirm → code sends the staged draft to the customer
    await send("yes");
    expect(sms.sent.some((m) => m.to === LEVI && /we can start monday/i.test(m.body))).toBe(true);
    expect(sms.sent.at(-1)?.body).toMatch(/sent to Levi/i);
  });

  it("sends nothing when the owner says no", async () => {
    const store = seed();
    const ctx = await store.createLeadWithConversation({ organizationId: TEST_ORGANIZATION_ID, contactName: "Dana Lee", contactPhone: DANA, projectHint: "roof" });
    const sms = new CapturingSms();
    const model = scriptedModel([
      { tool: "find_leads", input: { name: "Dana" } },
      { tool: "prepare_message_to_lead", input: { leadId: ctx.lead.id, message: "call me back" } },
      { text: 'I\'ll send Dana: "call me back". Send it?' },
    ]);
    const deps = { store, model, sms };
    const send = (body: string) => handleInbound(deps, { toNumber: TO, fromNumber: OWNER, body });

    await send("tell Dana to call me back");
    await send("no");
    expect(sms.sent.some((m) => m.to === DANA)).toBe(false);
    expect(sms.sent.at(-1)?.body).toMatch(/won't send/i);
  });

  it("escalation reply is relayed to the customer in Sarah's own words (not a rigid template)", async () => {
    const store = seed();
    const ctx = await store.createLeadWithConversation({ organizationId: TEST_ORGANIZATION_ID, contactName: "Chris", contactPhone: CUSTOMER, projectHint: "metal roof" });
    await store.createEscalation({ leadId: ctx.lead.id, organizationId: TEST_ORGANIZATION_ID, conversationId: ctx.conversation.id, question: "Do we install metal roofs?" });
    const sms = new CapturingSms();
    const model = scriptedModel([{ text: "Yes, we do metal roofs! Happy to get you on the schedule." }]);
    const deps = { store, model, sms };

    const r = await handleInbound(deps, { toNumber: TO, fromNumber: OWNER, body: "yep we install metal roofs" });
    expect(r.status).toBe("ok");
    const toCustomer = sms.sent.find((m) => m.to === CUSTOMER);
    expect(toCustomer?.body).toMatch(/metal roofs/i);
    expect(toCustomer?.body).not.toMatch(/quick update from/i); // agent-composed, not the old template
    expect(store.getEscalations().filter((e) => e.status === "open")).toHaveLength(0); // resolved
  });
});
