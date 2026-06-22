import { describe, it, expect } from "vitest";
import { MemoryStore } from "./store/memoryStore.js";
import { createLeadAndGreet } from "./leadService.js";
import { handleInbound } from "./conversationService.js";
import { testContractor, testRecipients, TEST_CONTRACTOR_ID } from "./seed.js";
import { CapturingEmail, CapturingSms, ScriptedAi, ThrowingAi, sarah } from "./testkit.js";

const TO = testContractor.twilioNumber!; // contractor's dedicated number
const FROM = "+15555550123"; // the homeowner/lead
const OWNER_PHONE = "+18335559999";
const OWNER_EMAIL = "marcus@apexroofing.example";
const NOW = new Date("2026-06-15T08:00:00Z"); // Monday 08:00 UTC
const MON_9 = "2026-06-15T09:00:00.000Z";

function seed(): MemoryStore {
  const s = new MemoryStore();
  s.seedContractor(testContractor, testRecipients);
  return s;
}

describe("Sarah conversation engine (SCOPE §5, §7.5)", () => {
  it("end-to-end booking flow: lead → qualify → propose → confirm → appointment + booking_confirmed", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const email = new CapturingEmail();
    const ai = new ScriptedAi([
      sarah("Hi! Sarah here with Apex Roofing — thanks for reaching out! What's going on with your roof?"),
      sarah("Oh no, a leak — we can help! What's the ZIP code of the property?", { project_type: "roof repair" }, "qualify"),
      sarah("Great news, you're right in our service area! I can set up a free on-site estimate. Does Monday at 9:00 AM or 2:00 PM work?", { project_type: "roof repair", service_zip: "02459", is_decision_maker: "yes" }, "propose_slots"),
      sarah("Perfect! What's the full street address so our estimator knows where to go?", { project_type: "roof repair", service_zip: "02459", is_decision_maker: "yes", chosen_slot: MON_9 }),
      sarah("You're all set! Marcus will see you Monday at 9:00 AM. Thanks!", { project_type: "roof repair", service_zip: "02459", is_decision_maker: "yes", chosen_slot: MON_9, full_address: "42 Commonwealth Ave, Newton, MA 02458" }, "book"),
    ]);
    const deps = { store, ai, sms, email, now: () => NOW };

    const lead = await createLeadAndGreet(deps, {
      contractorId: TEST_CONTRACTOR_ID,
      contactName: "Jane Doe",
      contactPhone: FROM,
    });

    const send = (body: string) => handleInbound(deps, { toNumber: TO, fromNumber: FROM, body });

    expect((await send("Hi, I think my roof is leaking")).action).toBe("continue");
    expect((await send("My zip is 02459 and yes it's my house")).action).toBe("mark_qualified");
    expect((await send("Monday at 9 works great")).action).toBe("continue");
    expect((await send("42 Commonwealth Ave, Newton, MA 02458")).action).toBe("book");

    // appointment persisted at the chosen slot
    const appts = store.getAppointments();
    expect(appts).toHaveLength(1);
    expect(appts[0].slotIso).toBe(MON_9);

    // lead booked, conversation done, address captured
    const ctx = await store.getContextByLeadId(lead.leadId);
    expect(ctx?.lead.status).toBe("booked");
    expect(ctx?.lead.fullAddress).toBe("42 Commonwealth Ave, Newton, MA 02458");
    expect(ctx?.conversation.state).toBe("done");

    // owner notified for both qualified + booking, on both channels
    const ownerSms = sms.sent.filter((s) => s.to === OWNER_PHONE);
    expect(ownerSms.some((s) => s.body.includes("Qualified lead"))).toBe(true);
    expect(ownerSms.some((s) => s.body.includes("New booking"))).toBe(true);

    const ownerEmail = email.sent.filter((e) => e.to === OWNER_EMAIL);
    const booking = ownerEmail.find((e) => e.subject.startsWith("New booking"));
    expect(booking).toBeTruthy();
    expect(booking!.body).toContain("42 Commonwealth Ave");
    expect(booking!.body).toContain("Monday");
  });

  it("disqualifies an out-of-area lead and never books (CODE decides — §5.1)", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const email = new CapturingEmail();
    const ai = new ScriptedAi([
      sarah("Hi, Sarah with Apex Roofing! What do you need?"),
      sarah("Thanks! What's the ZIP of the property?", { project_type: "roof repair" }, "qualify"),
      sarah("Ah, we don't cover the Cape unfortunately — best of luck!", { project_type: "roof repair", service_zip: "02601", is_decision_maker: "yes" }, "disqualify"),
    ]);
    const deps = { store, ai, sms, email, now: () => NOW };
    const lead = await createLeadAndGreet(deps, { contractorId: TEST_CONTRACTOR_ID, contactName: "Sam", contactPhone: FROM });

    await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "roof repair please" });
    const r = await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "02601, and it's my place" });
    expect(r.action).toBe("disqualify");

    expect(store.getAppointments()).toHaveLength(0);
    const ctx = await store.getContextByLeadId(lead.leadId);
    expect(ctx?.lead.status).toBe("disqualified");
    // owner is NOT subscribed to disqualified_lead → no notification
    expect(sms.sent.filter((s) => s.to === OWNER_PHONE)).toHaveLength(0);
  });

  it("is idempotent — the same Twilio MessageSid yields exactly one reply (§7)", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const ai = new ScriptedAi([
      sarah("opening"),
      sarah("Got it — what's your ZIP?", { project_type: "roof repair" }, "qualify"),
    ]);
    const deps = { store, ai, sms, now: () => NOW };
    await createLeadAndGreet(deps, { contractorId: TEST_CONTRACTOR_ID, contactName: "Jane", contactPhone: FROM });
    const before = sms.sent.length;

    await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "leak", providerSid: "SM123" });
    const dup = await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "leak", providerSid: "SM123" });

    expect(dup.status).toBe("skipped");
    const replies = sms.sent.slice(before).filter((s) => s.to === FROM);
    expect(replies).toHaveLength(1);
  });

  it("never quotes pricing — the assembled prompt enforces the redirect and no booking results from a price question (§7.5)", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const ai = new ScriptedAi([
      sarah("opening"),
      sarah("Great question! Pricing really depends on an in-person look — and the on-site estimate is free. Want me to get you scheduled?", { project_type: "roof repair" }),
    ]);
    const deps = { store, ai, sms, now: () => NOW };
    await createLeadAndGreet(deps, { contractorId: TEST_CONTRACTOR_ID, contactName: "Jane", contactPhone: FROM });

    await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "how much does a new roof cost?" });

    expect(ai.lastSystemPrompt).toContain("NEVER quote");
    expect(store.getAppointments()).toHaveLength(0);
  });

  it("fails safe on AI error — no reply sent, no crash (§7)", async () => {
    const store = seed();
    const sms = new CapturingSms();
    await createLeadAndGreet(
      { store, ai: new ScriptedAi([sarah("opening")]), sms, now: () => NOW },
      { contractorId: TEST_CONTRACTOR_ID, contactName: "Jane", contactPhone: FROM },
    );
    const before = sms.sent.length;

    const res = await handleInbound(
      { store, ai: new ThrowingAi(), sms, now: () => NOW },
      { toNumber: TO, fromNumber: FROM, body: "hello" },
    );

    expect(res.status).toBe("error");
    expect(sms.sent.length).toBe(before); // nothing sent
  });

  it("cold inbound auto-starts a conversation when allowColdInbound is on", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const ai = new ScriptedAi([
      sarah("Hi! Sarah with Apex Roofing — happy to help. What's going on with your roof?"),
    ]);
    const r = await handleInbound(
      { store, ai, sms, now: () => NOW, allowColdInbound: true },
      { toNumber: TO, fromNumber: FROM, body: "hey, do y'all fix roof leaks?" },
    );
    expect(r.status).toBe("ok");
    expect(sms.sent.some((s) => s.to === FROM)).toBe(true);
  });

  it("cold inbound is ignored by default (lead-initiated product flow)", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const r = await handleInbound(
      { store, ai: new ScriptedAi([]), sms, now: () => NOW },
      { toNumber: TO, fromNumber: FROM, body: "hi" },
    );
    expect(r.status).toBe("skipped");
    expect(sms.sent).toHaveLength(0);
  });
});
