import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStore } from "./store/memoryStore.js";
import { handleInbound } from "./conversationService.js";
import { __resetContractorCommands } from "./contractorCommands.js";
import { testContractor, testRecipients, TEST_CONTRACTOR_ID } from "./seed.js";
import { CapturingSms, scriptedModel } from "./testkit.js";

const TO = testContractor.twilioNumber!; // the assistant number
const OWNER = "+18335559999"; // the contractor's recipient phone (from testRecipients)
const LEVI1 = "+15550001111";
const LEVI2 = "+15550002222";

function seed(): MemoryStore {
  const s = new MemoryStore();
  s.seedContractor(testContractor, testRecipients);
  return s;
}

describe("contractor commands — text a named lead", () => {
  beforeEach(() => __resetContractorCommands());

  it("disambiguates, then gates the send on an explicit yes", async () => {
    const store = seed();
    await store.createLeadWithConversation({ contractorId: TEST_CONTRACTOR_ID, contactName: "Levi Ramos", contactPhone: LEVI1, projectHint: "roof leak" });
    await store.createLeadWithConversation({ contractorId: TEST_CONTRACTOR_ID, contactName: "Levi Chen", contactPhone: LEVI2, projectHint: "gutters" });
    const sms = new CapturingSms();
    const model = scriptedModel([
      { text: JSON.stringify({ action: "contact_lead", leadName: "Levi", message: "we can start Monday" }) },
    ]);
    const deps = { store, model, sms };
    const send = (body: string) => handleInbound(deps, { toNumber: TO, fromNumber: OWNER, body });

    // 1) two Levis → asks which one; nothing goes to a lead
    await send("let Levi know we can start Monday");
    expect(sms.sent.at(-1)?.to).toBe(OWNER);
    expect(sms.sent.at(-1)?.body).toMatch(/which one/i);
    expect(sms.sent.some((m) => m.to === LEVI1 || m.to === LEVI2)).toBe(false);

    // 2) pick #1 → confirmation prompt; still nothing sent
    await send("1");
    expect(sms.sent.at(-1)?.body).toMatch(/send it\?/i);
    expect(sms.sent.some((m) => m.to === LEVI1 || m.to === LEVI2)).toBe(false);

    // 3) confirm → the message finally reaches Levi Ramos
    await send("yes");
    const toLead = sms.sent.find((m) => m.to === LEVI1);
    expect(toLead?.body).toContain("we can start Monday");
    expect(sms.sent.some((m) => m.to === LEVI2)).toBe(false); // never the wrong Levi
    expect(sms.sent.at(-1)?.body).toMatch(/sent to Levi/i);
  });

  it("sends nothing when the contractor says no", async () => {
    const store = seed();
    await store.createLeadWithConversation({ contractorId: TEST_CONTRACTOR_ID, contactName: "Dana Lee", contactPhone: "+15550003333", projectHint: "roof" });
    const sms = new CapturingSms();
    const model = scriptedModel([
      { text: JSON.stringify({ action: "contact_lead", leadName: "Dana", message: "call me back" }) },
    ]);
    const deps = { store, model, sms };
    const send = (body: string) => handleInbound(deps, { toNumber: TO, fromNumber: OWNER, body });

    await send("tell Dana to call me back"); // single match → straight to confirm
    expect(sms.sent.at(-1)?.body).toMatch(/send it\?/i);
    await send("no");
    expect(sms.sent.some((m) => m.to === "+15550003333")).toBe(false);
    expect(sms.sent.at(-1)?.body).toMatch(/won't send/i);
  });
});
