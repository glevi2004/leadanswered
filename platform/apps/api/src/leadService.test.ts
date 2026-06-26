import { describe, it, expect } from "vitest";
import { MemoryStore } from "./store/memoryStore.js";
import { createLeadAndGreet } from "./leadService.js";
import { testContractor, testRecipients, TEST_CONTRACTOR_ID } from "./seed.js";
import { CapturingSms, scriptedModel } from "./testkit.js";

function seed(): MemoryStore {
  const s = new MemoryStore();
  s.seedContractor(testContractor, testRecipients);
  return s;
}

describe("lead intake (POST /lead path, SCOPE §6)", () => {
  it("creates a lead + conversation and fires Sarah's opening SMS", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const model = scriptedModel([
      { text: "Hi! This is Sarah with Apex Roofing — thanks for reaching out! What's the property address?" },
    ]);

    const res = await createLeadAndGreet(
      { store, model, sms },
      { contractorId: TEST_CONTRACTOR_ID, contactName: "Jane Doe", contactPhone: "+15555550123", projectHint: "roof leak" },
    );

    expect(res.leadId).toBeTruthy();
    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0].to).toBe("+15555550123");
    expect(sms.sent[0].body).toContain("Sarah");

    const ctx = await store.getContextByLeadId(res.leadId);
    expect(ctx?.lead.status).toBe("contacted");
    expect(ctx?.conversation.state).toBe("qualifying");
    expect(ctx?.messages.filter((m) => m.direction === "outbound")).toHaveLength(1);
  });
});
